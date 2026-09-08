const logger = require('../utils/logger');
const prisma = require('../models/prisma');
const blockchainSyncService = require('./blockchain-sync');
const { acquireLock, releaseLock } = require('../utils/scheduler-lock');

let interval = null;

const LOCK_NAME = 'sync-health-scheduler';
const LOCK_TTL_MS = 2 * 60 * 1000;
// Independent of the 15s event-listener poll in blockchain-sync.js — this is a much coarser
// sanity check (a total count, not per-event catch-up), so it doesn't need to run nearly as
// often. 15 minutes is frequent enough to surface a stuck listener the same day it happens,
// without hammering the RPC endpoint for a number that essentially never changes tick-to-tick.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Compares the chain's own contract count (source of truth) against how many deployed
 * contracts ContractCache thinks exist. A mismatch means the background event listener missed
 * at least one ContractCreated — the cheapest, earliest signal that the cache has drifted from
 * the chain, well before it shows up as a user staring at a contract that "doesn't exist" or a
 * verification page unable to resolve one that does.
 */
async function tick() {
    if (!blockchainSyncService.contractManager) {
        return;
    }
    if (!(await acquireLock(LOCK_NAME, LOCK_TTL_MS))) {
        logger.info('[SyncHealth] Check skipped: another instance holds the lock');
        return;
    }
    try {
        const onChainTotal = Number(await blockchainSyncService.contractManager.getTotalContracts());
        const cachedTotal = await prisma.contractCache.count({ where: { contractId: { not: null } } });
        const drifted = onChainTotal !== cachedTotal;

        await prisma.syncHealthCheck.create({
            data: { onChainTotal, cachedTotal, drifted },
        });

        if (drifted) {
            logger.warn(`[SyncHealth] Drift detected: on-chain=${onChainTotal} cached=${cachedTotal}`);
        }
    } catch (error) {
        logger.error('[SyncHealth] Check failed:', error);
    } finally {
        await releaseLock(LOCK_NAME);
    }
}

function start() {
    if (interval) return;
    tick();
    interval = setInterval(tick, CHECK_INTERVAL_MS);
    logger.info(`Sync health scheduler started (checking every ${CHECK_INTERVAL_MS}ms)`);
}

module.exports = { start };
