const logger = require('../utils/logger');
const { config } = require('../config');
const escrowService = require('./escrow');

let interval = null;

/**
 * Periodically sends the T-72h/48h/24h reminders and releases escrows whose deadline has
 * arrived. Runs independently of whether a real payment provider is wired — it's pure
 * date/status logic.
 */
async function tick() {
    try {
        const reminders = await escrowService.sendDueReminders();
        const released = await escrowService.releaseDue();
        if (reminders || released) {
            logger.info(`[Escrow] ${reminders} reminder(s) sent, ${released} escrow(s) released`);
        }
    } catch (error) {
        logger.error('[Escrow] Scheduler tick failed:', error);
    }
}

function start() {
    if (interval) return;
    tick(); // catch up on anything due since the last run
    interval = setInterval(tick, config.escrowSchedulerIntervalMs);
    logger.info(`Escrow scheduler started (checking every ${config.escrowSchedulerIntervalMs}ms)`);
}

module.exports = { start };
