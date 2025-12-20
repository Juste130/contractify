const { ethers } = require('ethers');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');
const { ContractStatus } = require('@prisma/client');

const CONTRACT_MANAGER_ABI = [
    'function getUserContracts(address user) external view returns (uint256[])',
    'function getContractDetails(uint256 contractId) external view returns (tuple(uint256 id, address creator, uint40 createdAt, uint40 expiresAt, uint40 effectiveDate, uint8 status, bool allowTermination, bool allowDispute, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) terminationInfo, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) disputeInfo, uint88 totalAmount, uint88 releasedAmount, uint256 nftTokenId) contractData, tuple(address signer, uint8 role, string customRole, bool hasSignedContract, uint40 signedAt)[] signers, bool allSigned, uint256 justificationCount, uint256 paymentCount)',
    'event ContractCreated(uint256 indexed contractId, address indexed creator, uint40 createdAt, address[] additionalSigners)',
    'event ContractFinalized(uint256 indexed contractId, uint256 nftTokenId, uint40 effectiveDate)',
    'event ContractStatusUpdated(uint256 indexed contractId, uint8 oldStatus, uint8 newStatus, string justification, address updatedBy)',
];

class BlockchainSyncService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.polygonRpcUrl);
        this.contractManager = new ethers.Contract(
            config.contractManagerAddress,
            CONTRACT_MANAGER_ABI,
            this.provider
        );
    }

    async syncUserContracts(userAddress, userId) {
        try {
            const contractIds = await this.contractManager.getUserContracts(userAddress);

            let syncedCount = 0;

            for (const contractId of contractIds) {
                await this.syncContract(contractId.toString(), userId);
                syncedCount++;
            }

            logger.info(`Synced ${syncedCount} contracts for user ${userAddress}`);

            return syncedCount;
        } catch (error) {
            logger.error('Error syncing user contracts:', error);
            throw new Error('Failed to sync user contracts');
        }
    }

    async syncContract(contractId, userId) {
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
                totalAmount: contractData.totalAmount.toString(),
                releasedAmount: contractData.releasedAmount.toString(),
                nftTokenId: contractData.nftTokenId.toString(),
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
            throw new Error(`Failed to sync contract ${contractId}`);
        }
    }

    async startEventListener() {
        try {
            this.contractManager.on('ContractCreated', async (contractId, creator, createdAt, additionalSigners) => {
                logger.info(`New contract created: ${contractId} by ${creator}`);

                const wallet = await prisma.userWallet.findUnique({
                    where: { publicAddress: creator },
                });

                if (wallet) {
                    await this.syncContract(contractId.toString(), wallet.userId);
                }
            });

            this.contractManager.on('ContractFinalized', async (contractId, nftTokenId, effectiveDate) => {
                logger.info(`Contract finalized: ${contractId}, NFT: ${nftTokenId}`);

                await prisma.contractCache.updateMany({
                    where: { contractId: Number(contractId) },
                    data: {
                        status: ContractStatus.ACTIVE,
                        lastSync: new Date(),
                    },
                });
            });

            this.contractManager.on('ContractStatusUpdated', async (contractId, oldStatus, newStatus, justification, updatedBy) => {
                logger.info(`Contract ${contractId} status updated: ${oldStatus} -> ${newStatus}`);

                const status = this.mapContractStatus(newStatus);

                await prisma.contractCache.updateMany({
                    where: { contractId: Number(contractId) },
                    data: {
                        status,
                        lastSync: new Date(),
                    },
                });
            });

            logger.info('Blockchain event listener started');
        } catch (error) {
            logger.error('Error starting event listener:', error);
            throw new Error('Failed to start event listener');
        }
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
