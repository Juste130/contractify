const crypto = require('crypto');
const { ethers } = require('ethers');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');

class WalletService {
    constructor() {
        this.masterKey = config.masterEncryptionKey;
        this.provider = new ethers.JsonRpcProvider(config.polygonRpcUrl);
    }

    async createUserWallet(userId) {
        try {
            const wallet = ethers.Wallet.createRandom();
            const encryptedData = this.encryptPrivateKey(wallet.privateKey);

            await prisma.userWallet.create({
                data: {
                    userId,
                    publicAddress: wallet.address,
                    encryptedPrivateKey: encryptedData.ciphertext,
                    encryptionIv: encryptedData.iv,
                    encryptionAuthTag: encryptedData.authTag,
                    encryptionSalt: encryptedData.salt,
                    isAdminWallet: false,
                },
            });

            logger.info(`Wallet created for user ${userId}: ${wallet.address}`);

            if (config.funderPrivateKey) {
                await this.fundInitialGas(wallet.address);
            }

            return { address: wallet.address };
        } catch (error) {
            logger.error('Error creating wallet:', error);
            throw new Error('Failed to create wallet');
        }
    }

    async associateAdminWallet(userId, adminAddress) {
        try {
            await prisma.userWallet.create({
                data: {
                    userId,
                    publicAddress: adminAddress,
                    encryptedPrivateKey: null,
                    encryptionIv: null,
                    encryptionAuthTag: null,
                    isAdminWallet: true,
                },
            });

            logger.info(`Admin wallet associated for user ${userId}: ${adminAddress}`);
        } catch (error) {
            logger.error('Error associating admin wallet:', error);
            throw new Error('Failed to associate admin wallet');
        }
    }

    async getUserWallet(userId) {
        return await prisma.userWallet.findUnique({
            where: { userId },
        });
    }

    decryptPrivateKey(ciphertext, iv, authTag, salt) {
        try {
            // Use the per-wallet salt if provided, fall back to static 'salt' for legacy records
            const kdfSalt = salt || 'salt';
            const key = crypto.scryptSync(this.masterKey, kdfSalt, 32);
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));

            let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            logger.error('Error decrypting private key:', error);
            throw new Error('Failed to decrypt private key');
        }
    }

    encryptPrivateKey(privateKey) {
        const iv = crypto.randomBytes(16);
        const salt = crypto.randomBytes(16).toString('hex'); // Dynamic per-wallet salt
        const key = crypto.scryptSync(this.masterKey, salt, 32);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
            iv: iv.toString('hex'),
            ciphertext: encrypted,
            authTag: cipher.getAuthTag().toString('hex'),
            salt,
        };
    }

    async fundInitialGas(address) {
        if (!config.funderPrivateKey) {
            logger.warn('No funder private key configured, skipping initial gas funding');
            return;
        }

        try {
            const funderWallet = new ethers.Wallet(config.funderPrivateKey, this.provider);
            const amount = ethers.parseEther(config.initialGasAmount);

            const tx = await funderWallet.sendTransaction({
                to: address,
                value: amount,
            });

            await tx.wait();

            await prisma.userWallet.update({
                where: { publicAddress: address },
                data: { fundedAt: new Date() },
            });

            logger.info(`Funded wallet ${address} with ${config.initialGasAmount} MATIC`);
        } catch (error) {
            logger.error('Error funding wallet:', error);
        }
    }

    async getWalletBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            logger.error('Error getting wallet balance:', error);
            throw new Error('Failed to get wallet balance');
        }
    }
}

module.exports = new WalletService();
