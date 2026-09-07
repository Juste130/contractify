const logger = require('../utils/logger');
const { config } = require('../config');
const escrowService = require('./escrow');
const { acquireLock, releaseLock } = require('../utils/scheduler-lock');

let interval = null;

const LOCK_NAME = 'escrow-scheduler';
// Comfortably longer than a tick should ever take — if a process dies mid-tick, another
// instance can reclaim the lock once it expires instead of waiting forever.
const LOCK_TTL_MS = 2 * 60 * 1000;

/**
 * Periodically sends the T-72h/48h/24h reminders and releases escrows whose deadline has
 * arrived. Runs independently of whether a real payment provider is wired — it's pure
 * date/status logic.
 */
async function tick() {
    if (!(await acquireLock(LOCK_NAME, LOCK_TTL_MS))) {
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
        await releaseLock(LOCK_NAME);
    }
}

function start() {
    if (interval) return;
    tick(); // catch up on anything due since the last run
    interval = setInterval(tick, config.escrowSchedulerIntervalMs);
    logger.info(`Escrow scheduler started (checking every ${config.escrowSchedulerIntervalMs}ms)`);
}

module.exports = { start };
