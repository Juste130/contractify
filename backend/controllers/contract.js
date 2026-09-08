const blockchainSyncService = require('../services/blockchain-sync');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const emailService = require('../services/email');
const escrowService = require('../services/escrow');
const notificationService = require('../services/notification');

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
        const creatorEmail = req.user.email;
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

            // Role 0 (Créateur) reflects a fact — this signatory is the account that submitted
            // the draft — not a form slot the client can claim. Derived here from the
            // authenticated session, overriding whatever role the client sent for this entry.
            const isDraftCreator = creatorEmail && s.email.toLowerCase() === creatorEmail.toLowerCase();
            const role = isDraftCreator ? 0 : s.role;

            return {
                email: s.email,
                name: s.name || null,
                role,
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

        // Declare escrow terms if the creator asked for one. This only records intent —
        // no money moves until a payment provider is wired (see services/escrow.js).
        if (metadata?.escrow?.amount) {
            try {
                await escrowService.declareTerms(contract.id, metadata.escrow);
            } catch (err) {
                logger.error(`Failed to declare escrow terms for contract ${contract.id}:`, err);
            }
        }

        // Invite not-yet-registered signatories to create an account now — they need lead
        // time, since deployment can't happen until every signatory has a wallet. Signatories
        // who are already registered are deliberately NOT emailed "please sign" here: nobody
        // can actually sign until the contract is deployed on-chain (status PENDING_SIGNATURES),
        // which only happens later when the creator deploys. That "please sign" email is sent
        // from markDraftDeployed instead, once signing is genuinely possible.
        const notRegisteredSignatories = contract.signatories.filter(s => !s.isRegistered);

        for (const signatory of notRegisteredSignatories) {
            emailService.sendDraftInvitationEmail(
                signatory.email,
                signatory.name || signatory.email,
                contract.title,
                contract.id
            ).catch(err => logger.error(`[Email] Failed to send invitation to ${signatory.email}:`, err));
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

        const contract = await prisma.contractCache.findUnique({ where: { id }, include: { signatories: true } });
        if (!contract) return res.status(404).json({ error: 'Draft not found' });
        if (contract.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        let verified;
        try {
            verified = await blockchainSyncService.verifyDeploymentTx(transactionHash, userId);
        } catch (verifyError) {
            logger.error(`Deployment verification failed for draft ${id}:`, verifyError);
            return res.status(400).json({ error: `Could not verify on-chain deployment: ${verifyError.message}` });
        }

        // The background event listener (blockchain-sync.js startEventListener) polls the
        // chain independently every ~15s and, on catching this same ContractCreated event
        // before this request finishes, may have already upserted a placeholder ContractCache
        // row for this contractId — with no IPFS hash and no signatories, since it only knows
        // what's on-chain. contractId is unique, so whichever write loses this race must
        // reconcile with whatever already claimed it, instead of throwing and leaving two rows
        // (this real draft with the content, and an empty phantom with the contractId) for the
        // same on-chain contract.
        const dropStalePlaceholder = () => prisma.contractCache.deleteMany({
            where: { contractId: verified.contractId, id: { not: id } }
        });
        const claimContractId = () => prisma.contractCache.update({
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

        await dropStalePlaceholder();
        let updatedContract;
        try {
            updatedContract = await claimContractId();
        } catch (err) {
            if (err.code !== 'P2002') throw err;
            // Lost a tighter race: the placeholder was (re-)created between the delete above
            // and this update. One more attempt is enough — the event listener only fires once
            // per event, not in a tight loop against us.
            await dropStalePlaceholder();
            updatedContract = await claimContractId();
        }

        // Now that the draft row owns this contractId, pull the authoritative on-chain
        // details (signers, escrow, dates...) into it.
        await blockchainSyncService.syncContract(verified.contractId.toString(), userId);

        // Signing only becomes possible now (status PENDING_SIGNATURES) — this is the right
        // moment to tell every OTHER signatory that it's their turn to sign. The creator
        // (role 0) is excluded: createContract() auto-signs them on-chain as part of
        // deployment itself (see ContractManager.sol createContract — the creator is added
        // as the first signer with hasSignedContract already true), so a "please sign"
        // email to the very person who just deployed and already signed is just confusing.
        const signatoriesToNotify = contract.signatories.filter((s) => s.role !== 0);
        for (const signatory of signatoriesToNotify) {
            emailService.sendSignatureRequest(
                signatory.email,
                contract.title,
                contract.id,
                signatory.name || signatory.email
            ).catch(err => logger.error(`[Email] Failed to send sign request to ${signatory.email}:`, err));

            // In-app notification alongside the email, for anyone with a platform account —
            // without this, the only channel these events ever reached was the inbox.
            prisma.user.findUnique({ where: { email: signatory.email } })
                .then((notifyUser) => {
                    if (!notifyUser) return;
                    return notificationService.create(notifyUser.id, {
                        type: 'GENERIC',
                        title: 'Signature requise',
                        message: `Le contrat "${contract.title}" est prêt : c'est à vous de le signer.`,
                        contractCacheId: contract.id,
                    });
                })
                .catch((err) => logger.error(`[Notification] Failed to notify ${signatory.email}:`, err));
        }

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
        } else if (contract.contractId) {
            // A registered signatory can only actually sign once the contract is deployed —
            // before that, there is nothing to remind them of (they aren't the blocker).
            await emailService.sendSignatureRequest(
                signatory.email,
                contract.title,
                contract.contractId,
                signatory.name || signatory.email
            );
        } else {
            return res.status(400).json({ error: "Ce contrat n'est pas encore déployé — il n'y a rien à relancer pour ce signataire pour le moment." });
        }

        logger.info(`[Email] Signature reminder resent to ${signatory.email} for contract ${contract.id}`);
        res.json({ message: 'Email de relance envoyé avec succès' });
    } catch (error) {
        next(error);
    }
};

/**
 * A signatory (added by the creator at draft time, matched by email — the same match
 * hasContractAccess() uses to grant them view access to a single contract) had that access
 * but no way to actually discover the contract's existence: the dashboard and "Mes contrats"
 * list both filtered strictly on `userId` (the creator), so a signatory who wasn't the
 * creator never saw it here at all — only via a direct link, e.g. from a notification email.
 */
function visibleToUserWhere(user) {
    return {
        OR: [
            { userId: user.userId },
            ...(user.email ? [{ signatories: { some: { email: user.email } } }] : []),
        ],
    };
}

/**
 * Get accurate contract counts for the current user, grouped by status,
 * plus how many have an IPFS document attached. Unlike /cached, this is
 * never limited to a single page, so dashboard stats reflect the true totals.
 */
exports.getContractsSummary = async (req, res, next) => {
    try {
        const visibleWhere = visibleToUserWhere(req.user);

        const [statusGroups, total, withIpfs] = await Promise.all([
            prisma.contractCache.groupBy({
                by: ['status'],
                where: visibleWhere,
                _count: { _all: true },
            }),
            prisma.contractCache.count({ where: visibleWhere }),
            prisma.contractCache.count({
                where: { ...visibleWhere, AND: [{ ipfsHash: { not: null } }, { ipfsHash: { not: '' } }] },
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
        const { page = 1, limit = 20, status } = req.query;

        const where = { ...visibleToUserWhere(req.user), ...(status ? { status } : {}) };

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

exports.hasContractAccess = hasContractAccess;

/**
 * Public, unauthenticated verification lookup — this is what the QR code printed on every
 * downloaded certificate points to. A third party (a bank, a court, a business partner)
 * scanning it has no ContracTify account, so this deliberately returns only what's needed
 * to verify authenticity: title, status, integrity hash/CID, blockchain anchor, and
 * signatories reduced to name + signed status — never the contract's actual content, a
 * signatory's email, or anything else that would leak private information to anyone who
 * merely has the link.
 */
exports.getPublicVerification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const numericId = Number(id);

        const contract = Number.isInteger(numericId) && String(numericId) === id
            ? await prisma.contractCache.findUnique({ where: { contractId: numericId }, include: { signatories: true } })
            : await prisma.contractCache.findUnique({ where: { id }, include: { signatories: true } });

        if (!contract) return res.status(404).json({ error: 'Contract not found' });

        // This is the one read path in the whole app that deliberately bypasses the cache:
        // everywhere else, ContractCache is the correct source (fast, cheap, and it carries
        // hybrid off-chain data — escrow, KYC, incidents — that never existed on-chain to begin
        // with). But the entire point of a *public* verification page is to let a stranger with
        // no ContracTify account confirm a claim independently of ContracTify's own database —
        // trusting the cache here would defeat that. So when this contract is deployed
        // (contractId set), re-derive status/hash/signatures from the chain itself and let that
        // override the cache; if the RPC call fails for any reason, fall back to the cache
        // rather than break the page, but say so via verifiedOnChain: false so the UI can be
        // honest about which source answered.
        let status = contract.status;
        let sha256Hash = contract.metadata?.sha256Hash || null;
        let signedAddresses = new Set(
            (contract.metadata?.signers || [])
                .filter((s) => s.hasSigned)
                .map((s) => s.address?.toLowerCase())
                .filter(Boolean)
        );
        let verifiedOnChain = false;

        if (contract.contractId != null && blockchainSyncService.contractManager) {
            try {
                const details = await blockchainSyncService.contractManager.getContractDetails(contract.contractId);
                const contractData = details.contractData;
                status = blockchainSyncService.mapContractStatus(contractData.status);
                sha256Hash = contractData.sha256Hash || sha256Hash;
                signedAddresses = new Set(
                    details.signers
                        .filter((s) => s.hasSignedContract)
                        .map((s) => s.signer?.toLowerCase())
                        .filter(Boolean)
                );
                verifiedOnChain = true;
            } catch (error) {
                logger.warn(`Public verification: on-chain read failed for contract ${contract.contractId}, falling back to cache:`, error.message);
            }
        }

        // Deliberately NOT ipfsHash: a CID isn't an opaque identifier, it's the actual
        // retrieval key for the full document on any public IPFS gateway
        // (gateway.pinata.cloud/ipfs/{cid}) — for an import, the entire original PDF; for
        // an AI-generated contract, its full rendered text. Including it here would let
        // anyone who merely has the verification link (no account, no access check)
        // reconstruct direct access to the private contract in one step, defeating the
        // "never leak the contract's actual content" guarantee this endpoint promises.
        // sha256Hash is a real digest either way (post-fix, even for an import — see
        // computeFileSHA256 in create-contract-page.tsx) — sufficient to prove integrity
        // without being a retrieval mechanism itself.
        res.json({
            title: contract.title,
            reference: contract.reference,
            status,
            createdAt: contract.createdAt,
            contractId: contract.contractId,
            sha256Hash,
            isExternalPdf: !!contract.metadata?.isExternalPdf,
            verifiedOnChain,
            signatories: contract.signatories.map((s) => ({
                name: s.name || null,
                hasSigned: s.walletAddress ? signedAddresses.has(s.walletAddress.toLowerCase()) : false,
            })),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all contracts (admin only)
 */
exports.getAllContracts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, email, search } = req.query;

        const where = {};
        if (status) where.status = status;
        if (email) where.user = { email: { equals: email, mode: 'insensitive' } };
        if (search) where.title = { contains: search, mode: 'insensitive' };

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

/**
 * Platform-wide contract counts for the admin dashboard, grouped by status, plus how many
 * were created this calendar month. Unlike the paginated /admin/all list, these are exact
 * totals — never truncated by a page size — so the admin "Tous les contrats" stat cards
 * stay correct regardless of how many contracts exist.
 */
exports.getAdminContractsSummary = async (req, res, next) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [statusGroups, total, thisMonth] = await Promise.all([
            prisma.contractCache.groupBy({ by: ['status'], _count: { _all: true } }),
            prisma.contractCache.count(),
            prisma.contractCache.count({ where: { createdAt: { gte: startOfMonth } } }),
        ]);

        const byStatus = statusGroups.reduce((acc, row) => {
            acc[row.status] = row._count._all;
            return acc;
        }, {});

        res.json({ total, byStatus, thisMonth });
    } catch (error) {
        next(error);
    }
};

// Surfaces the last sync-health check (see services/sync-health.js) on /admin/system —
// the admin's earliest signal that the background event listener missed a ContractCreated
// and the cache has silently drifted from the chain, well before it would otherwise show up
// as a user-facing "contract not found".
exports.getSyncHealth = async (req, res, next) => {
    try {
        const latest = await prisma.syncHealthCheck.findFirst({ orderBy: { checkedAt: 'desc' } });
        res.json({ latest });
    } catch (error) {
        next(error);
    }
};
