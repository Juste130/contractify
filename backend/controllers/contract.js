const blockchainSyncService = require('../services/blockchain-sync');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const emailService = require('../services/email');

/**
 * Save a new contract draft (Option 1 workflow)
 */
exports.saveDraft = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { title, metadata, signatories, ipfsHash } = req.body;

        // Automatically resolve signatories that are already registered on the platform
        const processedSignatories = await Promise.all(signatories.map(async s => {
            const user = await prisma.user.findUnique({
                where: { email: s.email },
                include: { wallet: true }
            });

            const walletAddress = s.walletAddress || (user?.wallet?.publicAddress) || null;
            const isRegistered = !!walletAddress;

            return {
                email: s.email,
                name: s.name || null,
                role: s.role,
                walletAddress,
                isRegistered
            };
        }));

        // Create the draft in ContractCache
        const contract = await prisma.contractCache.create({
            data: {
                userId,
                title,
                ipfsHash: ipfsHash || null,
                status: 'DRAFT_WAITING_SIGNERS',
                metadata,
                lastSync: new Date(),
                signatories: {
                    create: processedSignatories.map(s => ({
                        email: s.email,
                        name: s.name,
                        role: s.role,
                        walletAddress: s.walletAddress,
                        isRegistered: s.isRegistered
                    }))
                }
            },
            include: {
                signatories: true
            }
        });

        // Check if all signatories already have wallets (unlikely if they use emails but just in case)
        const allRegistered = contract.signatories.every(s => s.isRegistered);
        if (allRegistered) {
            await prisma.contractCache.update({
                where: { id: contract.id },
                data: { status: 'READY_TO_DEPLOY' }
            });
            contract.status = 'READY_TO_DEPLOY';
        }

        // Send invitation emails to each signatory (non-blocking)
        const notRegisteredSignatories = contract.signatories.filter(s => !s.isRegistered);
        const registeredSignatories = contract.signatories.filter(s => s.isRegistered);

        for (const signatory of notRegisteredSignatories) {
            emailService.sendDraftInvitationEmail(
                signatory.email,
                signatory.name || signatory.email,
                contract.title,
                contract.id
            ).catch(err => logger.error(`[Email] Failed to send invitation to ${signatory.email}:`, err));
        }

        // For already-registered signatories, send a signature request
        for (const signatory of registeredSignatories) {
            emailService.sendSignatureRequest(
                signatory.email,
                contract.title,
                contract.id,
                signatory.name || signatory.email
            ).catch(err => logger.error(`[Email] Failed to send sign request to ${signatory.email}:`, err));
        }

        res.status(201).json({ message: 'Draft saved successfully', contract });
    } catch (error) {
        next(error);
    }
};

/**
 * Get draft details by UUID
 */
exports.getDraftDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const contract = await prisma.contractCache.findUnique({
            where: { id },
            include: { signatories: true, user: { select: { email: true, id: true } } }
        });

        if (!contract) return res.status(404).json({ error: 'Draft not found' });
        // Allowing the creator or any signatory to view it
        const isSignatory = contract.signatories.some(s => s.email === req.user.email);
        if (contract.userId !== userId && !isSignatory && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({ contract });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark draft as deployed (called after successful on-chain transaction)
 */
exports.markDraftDeployed = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { contractId, transactionHash } = req.body; // on-chain ID
        const userId = req.user.userId;

        const contract = await prisma.contractCache.findUnique({ where: { id } });
        if (!contract) return res.status(404).json({ error: 'Draft not found' });
        if (contract.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        const updatedContract = await prisma.contractCache.update({
            where: { id },
            data: {
                contractId: parseInt(contractId),
                status: 'PENDING_SIGNATURES',
                metadata: {
                    ...contract.metadata,
                    deploymentTxHash: transactionHash
                }
            }
        });

        res.json({ message: 'Contract marked as deployed', contract: updatedContract });
    } catch (error) {
        next(error);
    }
};

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
        const userId = req.user.userId;
        const userRole = req.user.role;

        const contract = await blockchainSyncService.getCachedContract(parseInt(contractId));

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        let isSignatory = false;
        
        // Find user's wallet address to check if they are a signer
        const userWallet = await prisma.userWallet.findUnique({
            where: { userId }
        });
        
        if (userWallet && contract.metadata && contract.metadata.signers) {
            isSignatory = contract.metadata.signers.some(
                s => s.address.toLowerCase() === userWallet.publicAddress.toLowerCase()
            );
        }

        if (contract.userId !== userId && !isSignatory && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized to view this contract' });
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
