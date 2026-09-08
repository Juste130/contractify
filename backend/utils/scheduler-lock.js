const prisma = require('../models/prisma');

/**
 * A setInterval scheduler is per-process — with more than one instance running (scaling
 * horizontally), each would fire its own tick concurrently and duplicate whatever the tick
 * does (double-send reminders, double-run a reconciliation...). This is a simple
 * Postgres-backed advisory lock (no Redis needed): claim by inserting the lock row, or by
 * stealing it if the previous holder's lock expired. Shared by every scheduler in this
 * codebase (escrow reminders/release, blockchain sync health check...) — extracted here once
 * a second scheduler needed the exact same handful of lines `escrow-scheduler.js` already had.
 */
async function acquireLock(name, ttlMs) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + ttlMs);
    try {
        await prisma.schedulerLock.create({ data: { name, lockedAt: now, lockedUntil } });
        return true;
    } catch {
        const result = await prisma.schedulerLock.updateMany({
            where: { name, lockedUntil: { lt: now } },
            data: { lockedAt: now, lockedUntil },
        });
        return result.count > 0;
    }
}

async function releaseLock(name) {
    try {
        await prisma.schedulerLock.delete({ where: { name } });
    } catch {
        // Already released or reclaimed after expiry — fine either way.
    }
}

module.exports = { acquireLock, releaseLock };
