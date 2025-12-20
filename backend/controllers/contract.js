const blockchainSyncService = require('../services/blockchain-sync').default;
const prisma = require('../models/prisma').default;
const logger = require('../utils/logger').default;

/**
 * Get cached contracts
 */
exports.getCachedContracts = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 20, status } = req.query;

        const where = { userId };
        if (status) where.status = status;

        const contracts = await prisma.contractCache.findMany({
            where,
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            orderBy: { lastSync: 'desc' },
        });

        const total = await prisma.contractCache.count({ where });

        res.json({
            contracts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Sync specific contract
 */
exports.syncContract = async (req, res, next) => {
    try {
        const { contractId } = req.params;
        const userId = req.user.userId;

        await blockchainSyncService.syncContract(contractId, userId);

        const contract = await blockchainSyncService.getCachedContract(parseInt(contractId));

        res.json({
            message: 'Contract synced successfully',
            contract,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Sync all user contracts
 */
exports.syncAllContracts = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        // Get user wallet
        const wallet = await prisma.userWallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const syncedCount = await blockchainSyncService.syncUserContracts(
            wallet.publicAddress,
            userId
        );

        res.json({
            message: 'Contracts synced successfully',
            syncedCount,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Search contracts
 */
exports.searchContracts = async (req, res, next) => {
    try {
        const { query } = req.query;
        const userId = req.user.userId;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const contracts = await blockchainSyncService.searchContracts(query, userId);

        res.json({
            contracts,
            count: contracts.length,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get contract details
 */
exports.getContractDetails = async (req, res, next) => {
    try {
        const { contractId } = req.params;

        const contract = await blockchainSyncService.getCachedContract(parseInt(contractId));

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        res.json({ contract });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all contracts (admin only)
 */
exports.getAllContracts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const where = {};
        if (status) where.status = status;

        const contracts = await prisma.contractCache.findMany({
            where,
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { lastSync: 'desc' },
        });

        const total = await prisma.contractCache.count({ where });

        res.json({
            contracts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};
