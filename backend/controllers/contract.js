const blockchainSyncService = require('../services/blockchain-sync');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const emailService = require('../services/email');

const MAX_SIGNATORIES = 20;

/**
 * A user can access a contract (draft or deployed) if they created it, if they are one of
 * its signatories (matched by email, since a draft signatory may not have a wallet yet — or
 * by wallet address, since that's what a deployed contract's on-chain signer list uses), or
 * if they are an admin. Centralized here so drafts and deployed contracts apply the exact
 * same rule instead of two independently-drifting checks.
 */
async function hasContractAccess(contract, user, signatories) {
    if (contract.userId === user.userId || user.role === 'ADMIN') return true;

    const sigs = signatories || contract.signatories || [];
    if (sigs.some(s => s.email && s.email === user.email)) return true;

    const wallet = await prisma.userWallet.findUnique({ where: { userId: user.userId } });
    if (wallet) {
        const addr = wallet.publicAddress.toLowerCase();
        if (sigs.some(s => s.walletAddress && s.walletAddress.toLowerCase() === addr)) return true;
        if (contract.metadata?.signers?.some(s => s.address?.toLowerCase() === addr)) return true;
    }

    return false;
}

/**
 * Save a new contract draft (Option 1 workflow)
 */
exports.saveDraft = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { title, metadata, signatories, ipfsHash } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (!Array.isArray(signatories) || signatories.length === 0) {
            return res.status(400).json({ error: 'At least one signatory is required' });
        }
        if (signatories.length > MAX_SIGNATORIES) {
            return res.status(400).json({ error: `Too many signatories (max ${MAX_SIGNATORIES})` });
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const seenEmails = new Set();
        for (const s of signatories) {
            if (!s.email || !emailPattern.test(s.email)) {
                return res.status(400).json({ error: `Invalid signatory email: ${s.email || '(empty)'}` });
            }
            const normalized = s.email.toLowerCase();
            if (seenEmails.has(normalized)) {
                return res.status(400).json({ error: `Duplicate signatory email: ${s.email}` });
            }
            seenEmails.add(normalized);
            if (!Number.isInteger(s.role) || s.role < 0 || s.role > 3) {
                return res.status(400).json({ error: `Invalid signatory role for ${s.email}` });
            }
        }

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

        // Create the draft and, if every signatory is already registered, flip it straight to
        // READY_TO_DEPLOY in the same transaction — avoids a window where a crash between the
        // two calls would leave the draft stuck in DRAFT_WAITING_SIGNERS despite being ready.
        const allRegistered = processedSignatories.every(s => s.isRegistered);
        const contract = await prisma.$transaction(async (tx) => {
            const created = await tx.contractCache.create({
                data: {
                    userId,
                    title,
                    ipfsHash: ipfsHash || null,
                    status: allRegistered ? 'READY_TO_DEPLOY' : 'DRAFT_WAITING_SIGNERS',
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
            return created;
        });

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

        const contract = await prisma.contractCache.findUnique({
            where: { id },
            include: { signatories: true, user: { select: { email: true, id: true } } }
        });

        if (!contract) return res.status(404).json({ error: 'Draft not found' });
        if (!(await hasContractAccess(contract, req.user))) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({ contract });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark draft as deployed (called after a client-reported on-chain transaction). The
 * contractId/transactionHash are only a claim from the client at this point — they are
 * verified on-chain (tx succeeded, sent to our Contract Manager, ContractCreated event
 * present, creator resolves to this user) before we trust them, otherwise a buggy or
 * malicious client could flip a draft to PENDING_SIGNATURES for a contract that was
 * never actually created.
 */
exports.markDraftDeployed = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { transactionHash } = req.body;
        const userId = req.user.userId;

        if (!transactionHash) {
            return res.status(400).json({ error: 'transactionHash is required' });
        }

        const contract = await prisma.contractCache.findUnique({ where: { id } });
        if (!contract) return res.status(404).json({ error: 'Draft not found' });
        if (contract.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        let verified;
        try {
            verified = await blockchainSyncService.verifyDeploymentTx(transactionHash, userId);
        } catch (verifyError) {
            logger.error(`Deployment verification failed for draft ${id}:`, verifyError);
            return res.status(400).json({ error: `Could not verify on-chain deployment: ${verifyError.message}` });
        }

        const updatedContract = await prisma.contractCache.update({
            where: { id },
            data: {
                contractId: verified.contractId,
                status: 'PENDING_SIGNATURES',
                metadata: {
                    ...contract.metadata,
                    deploymentTxHash: transactionHash
                }
            }
        });

        // Now that the draft row owns this contractId, pull the authoritative on-chain
        // details (signers, escrow, dates...) into it.
        await blockchainSyncService.syncContract(verified.contractId.toString(), userId);

        res.json({ message: 'Contract marked as deployed', contract: updatedContract });
    } catch (error) {
        next(error);
    }
};

/**
 * Resend an invitation/signature request email to a signatory who has not signed yet
 */
exports.resendSignatureRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { signatoryId } = req.body;
        const userId = req.user.userId;

        if (!signatoryId) {
            return res.status(400).json({ error: 'signatoryId requis' });
        }

        const contract = isNaN(Number(id))
            ? await prisma.contractCache.findUnique({ where: { id }, include: { signatories: true } })
            : await prisma.contractCache.findUnique({ where: { contractId: parseInt(id) }, include: { signatories: true } });

        if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
        if (contract.userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        const signatory = contract.signatories.find(s => s.id === signatoryId);
        if (!signatory) return res.status(404).json({ error: 'Signataire introuvable' });

        let hasSigned = false;
        if (contract.contractId && contract.metadata?.signers && signatory.walletAddress) {
            const onChainSigner = contract.metadata.signers.find(
                s => s.address?.toLowerCase() === signatory.walletAddress.toLowerCase()
            );
            hasSigned = !!onChainSigner?.hasSigned;
        }

        if (hasSigned) {
            return res.status(400).json({ error: 'Ce signataire a déjà signé le contrat' });
        }

        if (!signatory.isRegistered) {
            await emailService.sendDraftInvitationEmail(
                signatory.email,
                signatory.name || signatory.email,
                contract.title,
                contract.id
            );
        } else {
            await emailService.sendSignatureRequest(
                signatory.email,
                contract.title,
                contract.contractId || contract.id,
                signatory.name || signatory.email
            );
        }

        logger.info(`[Email] Signature reminder resent to ${signatory.email} for contract ${contract.id}`);
        res.json({ message: 'Email de relance envoyé avec succès' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get accurate contract counts for the current user, grouped by status,
 * plus how many have an IPFS document attached. Unlike /cached, this is
 * never limited to a single page, so dashboard stats reflect the true totals.
 */
exports.getContractsSummary = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const [statusGroups, total, withIpfs] = await Promise.all([
            prisma.contractCache.groupBy({
                by: ['status'],
                where: { userId },
                _count: { _all: true },
            }),
            prisma.contractCache.count({ where: { userId } }),
            prisma.contractCache.count({
                where: { userId, AND: [{ ipfsHash: { not: null } }, { ipfsHash: { not: '' } }] },
            }),
        ]);

        const byStatus = statusGroups.reduce((acc, row) => {
            acc[row.status] = row._count._all;
            return acc;
        }, {});

        res.json({ total, byStatus, withIpfs });
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

        const contract = await blockchainSyncService.getCachedContract(parseInt(contractId));

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (!(await hasContractAccess(contract, req.user))) {
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
