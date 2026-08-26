const { ethers } = require('ethers');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');
const { ContractStatus } = require('@prisma/client');
const notificationService = require('./notification');

const CONTRACT_MANAGER_ABI = [
    'function getUserContracts(address user) external view returns (uint256[])',
    'function getContractDetails(uint256 contractId) external view returns (tuple(uint256 id, address creator, uint40 createdAt, uint40 expiresAt, uint40 effectiveDate, uint8 status, bool allowTermination, bool allowDispute, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) terminationInfo, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) disputeInfo, uint88 escrowAmount, uint8 penaltyPercent, string sha256Hash, uint88 releasedAmount, uint256 nftTokenId, bool isEscrowDeposited, address escrowPayer) contractData, tuple(address signer, uint8 role, string customRole, bool hasSignedContract, uint40 signedAt)[] signers, bool allSigned, uint256 justificationCount, uint256 paymentCount)',
    'event ContractCreated(uint256 indexed contractId, address indexed creator, uint40 createdAt, address[] additionalSigners)',
    'event ContractFinalized(uint256 indexed contractId, uint256 nftTokenId, uint40 effectiveDate)',
    'event ContractStatusUpdated(uint256 indexed contractId, uint8 oldStatus, uint8 newStatus, string justification, address updatedBy)',
];

class BlockchainSyncService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.polygonRpcUrl);

        if (ethers.isAddress(config.contractManagerAddress)) {
            this.contractManager = new ethers.Contract(
                config.contractManagerAddress,
                CONTRACT_MANAGER_ABI,
                this.provider
            );
        } else {
            logger.warn(`Invalid Contract Manager Address: ${config.contractManagerAddress}. Blockchain sync disabled.`);
            this.contractManager = null;
        }
    }

    async syncUserContracts(userAddress, userId) {
        if (!this.contractManager) {
            logger.warn('Skipping user contract sync: No valid contract manager');
            return 0;
        }

        try {
            const contractIds = await this.contractManager.getUserContracts(userAddress);

            await Promise.all(
                contractIds.map((contractId) => this.syncContract(contractId.toString(), userId))
            );

            const syncedCount = contractIds.length;
            logger.info(`Synced ${syncedCount} contracts for user ${userAddress}`);

            return syncedCount;
        } catch (error) {
            logger.error('Error syncing user contracts:', error);
            // Don't throw to avoid blocking the main flow
            return 0;
        }
    }

    async syncContract(contractId, userId) {
        if (!this.contractManager) return;

        try {
            const details = await this.contractManager.getContractDetails(contractId);

            const contractData = details.contractData;
            const signers = details.signers;

            const status = this.mapContractStatus(contractData.status);

            // Lookup each signer's address in our database to resolve their name and email
            // (case-insensitive: on-chain addresses may be checksummed differently than stored)
            const enrichedSigners = await Promise.all(signers.map(async (s) => {
                const wallet = await prisma.userWallet.findFirst({
                    where: { publicAddress: { equals: s.signer, mode: 'insensitive' } },
                    include: { user: true }
                });

                return {
                    address: s.signer,
                    name: wallet?.user?.profileData?.name || wallet?.user?.email || null,
                    email: wallet?.user?.email || null,
                    role: Number(s.role),
                    customRole: s.customRole,
                    hasSigned: s.hasSignedContract,
                    signedAt: Number(s.signedAt),
                };
            }));

            // terminationInfo/disputeInfo were returned by getContractDetails all along but
            // never captured here — even though the app doesn't drive termination/dispute
            // exclusively through this sync path, a status change reaching Terminated (or
            // Disputed, if ever triggered by a direct chain interaction outside the app)
            // must still be explainable in the UI instead of showing a bare status badge.
            const terminationInfo = contractData.terminationInfo && Number(contractData.terminationInfo.reason) > 0
                ? {
                    reason: Number(contractData.terminationInfo.reason),
                    customReason: contractData.terminationInfo.customReason,
                    proofIpfsHash: contractData.terminationInfo.proofIpfsHash,
                    justification: contractData.terminationInfo.justification?.justification || null,
                    justifiedAt: Number(contractData.terminationInfo.justification?.timestamp || 0),
                    justifiedBy: contractData.terminationInfo.justification?.updatedBy || null,
                }
                : null;
            const disputeInfo = contractData.disputeInfo && Number(contractData.disputeInfo.reason) > 0
                ? {
                    reason: Number(contractData.disputeInfo.reason),
                    customReason: contractData.disputeInfo.customReason,
                    proofIpfsHash: contractData.disputeInfo.proofIpfsHash,
                    justification: contractData.disputeInfo.justification?.justification || null,
                    justifiedAt: Number(contractData.disputeInfo.justification?.timestamp || 0),
                    justifiedBy: contractData.disputeInfo.justification?.updatedBy || null,
                }
                : null;

            const metadata = {
                creator: contractData.creator,
                createdAt: Number(contractData.createdAt),
                expiresAt: Number(contractData.expiresAt),
                effectiveDate: Number(contractData.effectiveDate),
                allowTermination: contractData.allowTermination,
                allowDispute: contractData.allowDispute,
                terminationInfo,
                disputeInfo,
                escrowAmount: contractData.escrowAmount.toString(),
                penaltyPercent: Number(contractData.penaltyPercent),
                sha256Hash: contractData.sha256Hash,
                releasedAmount: contractData.releasedAmount.toString(),
                nftTokenId: contractData.nftTokenId.toString(),
                isEscrowDeposited: contractData.isEscrowDeposited,
                escrowPayer: contractData.escrowPayer,
                signers: enrichedSigners,
                allSigned: details.allSigned,
                justificationCount: Number(details.justificationCount),
                paymentCount: Number(details.paymentCount),
            };

            let finalUserId = userId;
            if (!finalUserId) {
                const creatorWallet = await prisma.userWallet.findFirst({
                    where: { publicAddress: { equals: contractData.creator, mode: 'insensitive' } }
                });
                finalUserId = creatorWallet?.userId || null;
            }

            if (!finalUserId) {
                logger.warn(`Could not resolve userId for creator: ${contractData.creator}. Skipping cache upsert.`);
                return;
            }

            // Merge onto whatever off-chain metadata already exists (content, parties,
            // country/city, escrow declaration, deploymentTxHash...) instead of replacing
            // it wholesale — a plain `metadata: metadata` update here would silently wipe
            // the draft's document content the moment this runs post-deployment, since this
            // upsert matches the same row by the contractId that markDraftDeployed just set.
            const existingRow = await prisma.contractCache.findUnique({
                where: { contractId: parseInt(contractId) },
                select: { metadata: true },
            });
            const mergedMetadata = { ...(existingRow?.metadata || {}), ...metadata };

            await prisma.contractCache.upsert({
                where: { contractId: parseInt(contractId) },
                update: {
                    status,
                    metadata: mergedMetadata,
                    lastSync: new Date(),
                },
                create: {
                    contractId: parseInt(contractId),
                    userId: finalUserId,
                    title: `Contract #${contractId}`,
                    ipfsHash: '',
                    status,
                    metadata,
                    lastSync: new Date(),
                },
            });

            logger.info(`Contract ${contractId} synced successfully`);
        } catch (error) {
            logger.error(`Error syncing contract ${contractId}:`, error);
            // Don't throw
        }
    }

    async startEventListener() {
        if (!this.contractManager) {
            logger.warn('Blockchain event listener skipped: No valid contract manager');
            return;
        }

        // Stop any existing polling before starting a new one
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }

        // Use polling via queryFilter instead of contract.on() which relies on
        // server-side eth_newFilter with a short TTL (~5min) causing "filter not found" errors.
        try {
            this._lastScannedBlock = await this.provider.getBlockNumber();
            logger.info(`Blockchain event listener started (polling from block ${this._lastScannedBlock})`);
        } catch (error) {
            logger.error('Could not get current block number, event listener disabled:', error);
            return;
        }

        // Free tier RPC plans (Alchemy, etc.) limit eth_getLogs to 10 blocks per request.
        // We use 9 as a safe ceiling to stay under that limit.
        const MAX_BLOCK_CHUNK = 9;

        const processChunk = async (fromBlock, toBlock) => {
            // ContractCreated
            const createdEvents = await this.contractManager.queryFilter(
                this.contractManager.filters.ContractCreated(),
                fromBlock, toBlock
            );
            for (const event of createdEvents) {
                const [contractId, creator] = event.args;
                logger.info(`New contract created: ${contractId} by ${creator}`);
                const wallet = await prisma.userWallet.findFirst({
                    where: { publicAddress: { equals: creator, mode: 'insensitive' } },
                });
                if (wallet) {
                    await this.syncContract(contractId.toString(), wallet.userId);
                }
            }

            // ContractFinalized
            const finalizedEvents = await this.contractManager.queryFilter(
                this.contractManager.filters.ContractFinalized(),
                fromBlock, toBlock
            );
            for (const event of finalizedEvents) {
                const [contractId, nftTokenId] = event.args;
                logger.info(`Contract finalized: ${contractId}, NFT: ${nftTokenId}`);
                
                // First sync contract details to keep cache accurate
                await this.syncContract(contractId.toString(), null);

                const contract = await prisma.contractCache.findUnique({
                    where: { contractId: Number(contractId) }
                });

                if (contract && contract.metadata && contract.metadata.signers) {
                    const emailService = require('./email');
                    for (const signer of contract.metadata.signers) {
                        if (signer.email) {
                            emailService.sendContractFinalizedNotification(
                                signer.email,
                                contract.title,
                                contractId.toString()
                            ).catch(err => logger.error(`[Email] Failed to send finalized notification to ${signer.email}:`, err));
                        }
                    }
                }
            }

            // ContractStatusUpdated
            const statusEvents = await this.contractManager.queryFilter(
                this.contractManager.filters.ContractStatusUpdated(),
                fromBlock, toBlock
            );
            for (const event of statusEvents) {
                const [contractId, , newStatus] = event.args;
                logger.info(`Contract ${contractId} status updated to: ${newStatus}`);
                
                // First sync contract details to keep cache accurate
                await this.syncContract(contractId.toString(), null);

                const contract = await prisma.contractCache.findUnique({
                    where: { contractId: Number(contractId) }
                });

                if (contract && contract.metadata && contract.metadata.signers) {
                    const statusString = contract.status;
                    const emailService = require('./email');
                    for (const signer of contract.metadata.signers) {
                        if (signer.email) {
                            emailService.sendContractStatusNotification(
                                signer.email,
                                contract.title,
                                contractId.toString(),
                                statusString
                            ).catch(err => logger.error(`[Email] Failed to send status notification to ${signer.email}:`, err));
                        }
                    }

                    // TERMINATED specifically also gets an in-app notification, not just a
                    // generic status email — a party affected by a termination could
                    // otherwise miss it entirely if they don't check their inbox.
                    if (statusString === 'TERMINATED') {
                        const reasonText = contract.metadata.terminationInfo?.customReason
                            || contract.metadata.terminationInfo?.justification
                            || null;
                        for (const signer of contract.metadata.signers) {
                            if (!signer.email) continue;
                            const notifyUser = await prisma.user.findUnique({ where: { email: signer.email } });
                            if (!notifyUser) continue;
                            await notificationService.create(notifyUser.id, {
                                type: 'CONTRACT_TERMINATED',
                                title: 'Contrat résilié',
                                message: reasonText
                                    ? `Le contrat "${contract.title}" a été résilié : ${reasonText}`
                                    : `Le contrat "${contract.title}" a été résilié.`,
                                contractCacheId: contract.id,
                            });
                        }
                    }
                }
            }
        };

        const withTimeout = (promise, ms, label) => {
            let timer;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
            });
            return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
        };

        const pollEvents = async () => {
            // Guard against overlapping runs: if the RPC provider is slow/unreachable
            // (flaky DNS, rate-limited free-tier plan, etc.), a single pollEvents() call
            // can take longer than the 15s interval. Without this guard, setInterval keeps
            // firing regardless and stacks up more and more concurrent RPC calls, which can
            // starve Node's libuv threadpool (used by DNS lookups and file I/O alike) and
            // make the whole server — including unrelated HTTP requests — appear to hang.
            if (this._pollingInFlight) return;
            this._pollingInFlight = true;

            try {
                const currentBlock = await withTimeout(this.provider.getBlockNumber(), 20_000, 'getBlockNumber');
                if (currentBlock <= this._lastScannedBlock) return;

                let from = this._lastScannedBlock + 1;
                const to = currentBlock;

                // Process in chunks of MAX_BLOCK_CHUNK to respect free tier block range limits
                while (from <= to) {
                    const chunkTo = Math.min(from + MAX_BLOCK_CHUNK - 1, to);
                    await withTimeout(processChunk(from, chunkTo), 20_000, 'processChunk');
                    // Advance cursor after each successful chunk so progress is never lost
                    this._lastScannedBlock = chunkTo;
                    from = chunkTo + 1;
                }
            } catch (error) {
                // Log but don't crash — next poll will retry from where we left off
                logger.error('Blockchain event polling error:', error);
            } finally {
                this._pollingInFlight = false;
            }
        };

        // Poll every 15 seconds — Polygon ~1 block/2s → ~7 blocks/poll, well within 9-block limit
        this._pollingInterval = setInterval(pollEvents, 15_000);
    }

    /**
     * Verifies that a transaction hash reported by the client actually corresponds to a
     * successful on-chain `createContract` call, before the backend trusts it enough to
     * flip a draft's status. Without this, a buggy or malicious client could report an
     * arbitrary contractId/txHash pair and create a phantom contract that never syncs.
     * Returns the verified contractId, as reported by the ContractCreated event itself,
     * not by the client. Does not sync the cache itself — see the note below.
     */
    async verifyDeploymentTx(transactionHash, expectedCreatorUserId) {
        if (!this.contractManager) {
            throw new Error('Blockchain sync unavailable: no valid contract manager configured');
        }
        if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
            throw new Error('Invalid transaction hash');
        }

        const receipt = await this.provider.getTransactionReceipt(transactionHash);
        if (!receipt) {
            throw new Error('Transaction not found or not yet mined');
        }
        if (receipt.status !== 1) {
            throw new Error('Transaction failed on-chain');
        }

        // Privy's native gas sponsorship routes this transaction through Privy's own
        // infrastructure rather than sending it directly to the Contract Manager, so
        // receipt.to is no longer a reliable signal (it used to be, back when the frontend
        // called a plain ethers signer.sendTransaction straight to that address). The
        // meaningful check is below instead: a genuine ContractCreated event actually
        // emitted BY the Contract Manager contract — verified via each log's own `address`,
        // not merely by successfully decoding it against the ABI (any contract could emit a
        // same-shaped log otherwise).
        const event = receipt.logs
            .filter((log) => log.address?.toLowerCase() === config.contractManagerAddress?.toLowerCase())
            .map((log) => {
                try { return this.contractManager.interface.parseLog(log); }
                catch { return null; }
            })
            .find((e) => e && e.name === 'ContractCreated');

        if (!event) {
            throw new Error('No ContractCreated event found in this transaction');
        }

        const contractId = event.args.contractId.toString();
        const creatorAddress = event.args.creator;

        if (expectedCreatorUserId) {
            const creatorWallet = await prisma.userWallet.findFirst({
                where: { publicAddress: { equals: creatorAddress, mode: 'insensitive' } },
            });
            if (!creatorWallet || creatorWallet.userId !== expectedCreatorUserId) {
                throw new Error('On-chain creator does not match the authenticated user');
            }
        }

        // Note: intentionally does NOT call syncContract() here. syncContract() upserts by
        // contractId, and at this point the draft row (found by its UUID, not by contractId)
        // still has contractId=null — an upsert here would create a *second*, duplicate cache
        // row instead of updating the draft, and the caller's subsequent update to the draft's
        // contractId would then collide with it (contractId is @unique). Callers must first
        // persist contractId onto the existing draft row, then call syncContract() themselves.

        return { contractId: parseInt(contractId, 10), creatorAddress };
    }

    mapContractStatus(blockchainStatus) {
        const statusMap = {
            0: ContractStatus.DRAFT,
            1: ContractStatus.PENDING_SIGNATURES,
            2: ContractStatus.ACTIVE,
            3: ContractStatus.COMPLETED,
            4: ContractStatus.CANCELLED,
            5: ContractStatus.DISPUTED,
            6: ContractStatus.TERMINATED,
            7: ContractStatus.RESIGNED,
        };

        return statusMap[blockchainStatus] || ContractStatus.DRAFT;
    }

    async getCachedContract(contractId) {
        return await prisma.contractCache.findUnique({
            where: { contractId },
            include: { signatories: true },
        });
    }

    async searchContracts(query, userId) {
        const where = {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { ipfsHash: { contains: query, mode: 'insensitive' } },
            ],
        };

        if (userId) {
            where.userId = userId;
        }

        return await prisma.contractCache.findMany({
            where,
            orderBy: { lastSync: 'desc' },
            take: 20,
        });
    }
}

module.exports = new BlockchainSyncService();
