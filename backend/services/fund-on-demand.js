const { ethers } = require('ethers');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');

class FundOnDemandService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.polygonRpcUrl);
        this.funderWallet = config.funderPrivateKey
            ? new ethers.Wallet(config.funderPrivateKey, this.provider)
            : null;
        this.minBuffer = ethers.parseEther('0.001'); // 0.001 MATIC buffer for edge cases
    }

    /**
     * Check wallet balance
     */
    async getWalletBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return balance;
        } catch (error) {
            logger.error(`Error getting balance for ${address}:`, error);
            throw new Error('Failed to get wallet balance');
        }
    }

    /**
     * Fund wallet with exact amount needed for transaction
     * @param {string} address - Wallet address to fund
     * @param {string|BigNumberish} requiredAmount - Amount needed in wei or as string
     * @returns {boolean} true if funded, false if already has sufficient balance
     */
    async fundIfNeeded(address, requiredAmount) {
        if (!this.funderWallet) {
            logger.warn('Funder wallet not configured, skipping funding');
            return false;
        }

        try {
            // Convert requiredAmount to BigNumber if string
            const required = typeof requiredAmount === 'string' 
                ? ethers.parseEther(requiredAmount) 
                : requiredAmount;

            const balance = await this.getWalletBalance(address);

            // If balance already covers the required amount + buffer, no need to fund
            if (balance >= required) {
                logger.info(`Wallet ${address} has sufficient balance: ${ethers.formatEther(balance)} MATIC >= ${ethers.formatEther(required)} MATIC required`);
                return false;
            }

            // Calculate exact amount to send (required + buffer)
            const amountToSend = required - balance + this.minBuffer;

            logger.info(`Wallet ${address} insufficient balance (${ethers.formatEther(balance)} MATIC), funding with ${ethers.formatEther(amountToSend)} MATIC...`);

            // Send transaction with exact amount needed
            const tx = await this.funderWallet.sendTransaction({
                to: address,
                value: amountToSend,
            });

            const receipt = await tx.wait();

            // Update funding timestamp in DB
            await prisma.userWallet.update({
                where: { publicAddress: address },
                data: {
                    fundedAt: new Date(),
                },
            }).catch((err) => {
                logger.error(`Could not update fundedAt for ${address}:`, err);
            });

            logger.info(`Wallet ${address} funded with ${ethers.formatEther(amountToSend)} MATIC. Tx: ${receipt.hash}`);
            return true;
        } catch (error) {
            logger.error(`Error funding wallet ${address}:`, error);
            return false;
        }
    }

    /**
     * Ensure wallet has minimum balance before action
     * @param {string} userId - User ID
     * @param {string|BigNumberish} requiredAmount - Amount needed in wei or as string (e.g., "0.05" for 0.05 MATIC)
     */
    async ensureBalance(userId, requiredAmount) {
        try {
            const wallet = await prisma.userWallet.findUnique({
                where: { userId },
            });

            if (!wallet) {
                throw new Error('User wallet not found');
            }

            const wasFunded = await this.fundIfNeeded(wallet.publicAddress, requiredAmount);
            return {
                address: wallet.publicAddress,
                wasFunded,
                amountRequested: ethers.formatEther(
                    typeof requiredAmount === 'string' ? ethers.parseEther(requiredAmount) : requiredAmount
                ),
            };
        } catch (error) {
            logger.error(`Error ensuring balance for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get funding status for dashboard
     */
    async getFundingStatus(userId) {
        try {
            const wallet = await prisma.userWallet.findUnique({
                where: { userId },
            });

            if (!wallet) {
                return { error: 'Wallet not found' };
            }

            const balance = await this.getWalletBalance(wallet.publicAddress);
            const needsFunding = balance < this.minGasThreshold;

            return {
                address: wallet.publicAddress,
                balance: ethers.formatEther(balance),
                needsFunding,
                fundedAt: wallet.fundedAt,
            };
        } catch (error) {
            logger.error(`Error getting funding status for user ${userId}:`, error);
            throw error;
        }
    }
}

module.exports = new FundOnDemandService();
