const { ethers } = require('ethers');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');
const { ContractStatus } = require('@prisma/client');

const CONTRACT_MANAGER_ABI = [
    'function getUserContracts(address user) external view returns (uint256[])',
    'function getContractDetails(uint256 contractId) external view returns (tuple(uint256 id, address creator, uint40 createdAt, uint40 expiresAt, uint40 effectiveDate, uint8 status, bool allowTermination, bool allowDispute, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) terminationInfo, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) disputeInfo, uint88 escrowAmount, uint8 penaltyPercent, string sha256Hash, uint88 releasedAmount, uint256 nftTokenId, bool isEscrowDeposited) contractData, tuple(address signer, uint8 role, string customRole, bool hasSignedContract, uint40 signedAt)[] signers, bool allSigned, uint256 justificationCount, uint256 paymentCount)',
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

            const metadata = {
                creator: contractData.creator,
                createdAt: Number(contractData.createdAt),
                expiresAt: Number(contractData.expiresAt),
                effectiveDate: Number(contractData.effectiveDate),
                allowTermination: contractData.allowTermination,
                allowDispute: contractData.allowDispute,
                escrowAmount: contractData.escrowAmount.toString(),
                penaltyPercent: Number(contractData.penaltyPercent),
                sha256Hash: contractData.sha256Hash,
                releasedAmount: contractData.releasedAmount.toString(),
                nftTokenId: contractData.nftTokenId.toString(),
                isEscrowDeposited: contractData.isEscrowDeposited,
                signers: signers.map((s) => ({
                    address: s.signer,
                    role: s.role,
                    customRole: s.customRole,
                    hasSigned: s.hasSignedContract,
                    signedAt: Number(s.signedAt),
                })),
                allSigned: details.allSigned,
                justificationCount: Number(details.justificationCount),
                paymentCount: Number(details.paymentCount),
            };

            await prisma.contractCache.upsert({
                where: { contractId: parseInt(contractId) },
                update: {
                    status,
                    metadata,
                    lastSync: new Date(),
                },
                create: {
                    contractId: parseInt(contractId),
                    userId,
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
                const wallet = await prisma.userWallet.findUnique({
                    where: { publicAddress: creator },
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
                await prisma.contractCache.updateMany({
                    where: { contractId: Number(contractId) },
                    data: { status: ContractStatus.ACTIVE, lastSync: new Date() },
                });
            }

            // ContractStatusUpdated
            const statusEvents = await this.contractManager.queryFilter(
                this.contractManager.filters.ContractStatusUpdated(),
                fromBlock, toBlock
            );
            for (const event of statusEvents) {
                const [contractId, , newStatus] = event.args;
                logger.info(`Contract ${contractId} status updated to: ${newStatus}`);
                const status = this.mapContractStatus(Number(newStatus));
                await prisma.contractCache.updateMany({
                    where: { contractId: Number(contractId) },
                    data: { status, lastSync: new Date() },
                });
            }
        };

        const pollEvents = async () => {
            try {
                const currentBlock = await this.provider.getBlockNumber();
                if (currentBlock <= this._lastScannedBlock) return;

                let from = this._lastScannedBlock + 1;
                const to = currentBlock;

                // Process in chunks of MAX_BLOCK_CHUNK to respect free tier block range limits
                while (from <= to) {
                    const chunkTo = Math.min(from + MAX_BLOCK_CHUNK - 1, to);
                    await processChunk(from, chunkTo);
                    // Advance cursor after each successful chunk so progress is never lost
                    this._lastScannedBlock = chunkTo;
                    from = chunkTo + 1;
                }
            } catch (error) {
                // Log but don't crash — next poll will retry from where we left off
                logger.error('Blockchain event polling error:', error);
            }
        };

        // Poll every 15 seconds — Polygon ~1 block/2s → ~7 blocks/poll, well within 9-block limit
        this._pollingInterval = setInterval(pollEvents, 15_000);
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
