const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Reconcile users who are missing a wallet address.
 * Iterates over registered users without a walletAddress and attempts to assign one.
 */
async function reconcileMissingWallets(limit = 100) {
    try {
        const usersWithoutWallet = await prisma.user.findMany({
            where: {
                walletAddress: null,
            },
            take: limit,
        });

        if (usersWithoutWallet.length === 0) {
            return { processed: 0, success: 0 };
        }

        logger.info(`[WalletReconcile] Found ${usersWithoutWallet.length} users without wallet.`);

        // For MVP: simply log — wallet assignment is handled at login via Privy
        // In production: trigger fund-on-demand or assign custody wallet here
        return { processed: usersWithoutWallet.length, success: 0 };
    } catch (err) {
        logger.error('[WalletReconcile] Error during reconciliation:', err);
        return { processed: 0, success: 0 };
    }
}

module.exports = { reconcileMissingWallets };
