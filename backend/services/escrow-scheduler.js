const logger = require('../utils/logger');
const { config } = require('../config');
const escrowService = require('./escrow');
const prisma = require('../models/prisma');

let interval = null;

const LOCK_NAME = 'escrow-scheduler';
// Comfortably longer than a tick should ever take — if a process dies mid-tick, another
// instance can reclaim the lock once it expires instead of waiting forever.
const LOCK_TTL_MS = 2 * 60 * 1000;

/**
 * A setInterval scheduler is per-process — with more than one instance running (scaling
 * horizontally), each would fire its own tick concurrently and double-send reminders or
 * double-release escrows. This is a simple Postgres-backed advisory lock (no Redis needed):
 * claim by inserting the lock row, or by stealing it if the previous holder's lock expired.
 */
async function acquireLock() {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + LOCK_TTL_MS);
    try {
        await prisma.schedulerLock.create({ data: { name: LOCK_NAME, lockedAt: now, lockedUntil } });
        return true;
    } catch {
        const result = await prisma.schedulerLock.updateMany({
            where: { name: LOCK_NAME, lockedUntil: { lt: now } },
            data: { lockedAt: now, lockedUntil },
        });
        return result.count > 0;
    }
}

async function releaseLock() {
    try {
        await prisma.schedulerLock.delete({ where: { name: LOCK_NAME } });
    } catch {
        // Already released or reclaimed after expiry — fine either way.
    }
}

/**
 * Periodically sends the T-72h/48h/24h reminders and releases escrows whose deadline has
 * arrived. Runs independently of whether a real payment provider is wired — it's pure
 * date/status logic.
 */
async function tick() {
    if (!(await acquireLock())) {
        logger.info('[Escrow] Scheduler tick skipped: another instance holds the lock');
        return;
    }
    try {
        const reminders = await escrowService.sendDueReminders();
        const released = await escrowService.releaseDue();
        if (reminders || released) {
            logger.info(`[Escrow] ${reminders} reminder(s) sent, ${released} escrow(s) released`);
        }
    } catch (error) {
        logger.error('[Escrow] Scheduler tick failed:', error);
    } finally {
        await releaseLock();
    }
}

function start() {
    if (interval) return;
    tick(); // catch up on anything due since the last run
    interval = setInterval(tick, config.escrowSchedulerIntervalMs);
    logger.info(`Escrow scheduler started (checking every ${config.escrowSchedulerIntervalMs}ms)`);
}

module.exports = { start };
