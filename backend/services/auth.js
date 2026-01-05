const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../models/prisma');
const walletService = require('./wallet');
const emailService = require('./email');
const logger = require('../utils/logger');
const { config } = require('../config');
const { UserRole } = require('@prisma/client');

class AuthService {
    async register(email, password, isAdmin = false, adminWalletAddress) {
        try {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                throw new Error('User already exists');
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    role: isAdmin ? UserRole.ADMIN : UserRole.USER,
                },
            });

            if (isAdmin && adminWalletAddress) {
                await walletService.associateAdminWallet(user.id, adminWalletAddress);
            } else {
                await walletService.createUserWallet(user.id);
            }

            await emailService.sendWelcomeEmail(email, email.split('@')[0]);

            const token = this.generateToken(user.id, user.email, user.role);
            const refreshToken = this.generateRefreshToken(user.id);

            // Persist refresh token
            await this.saveRefreshToken(user.id, refreshToken);

            logger.info(`User registered: ${email}`);

            return {
                user: this.sanitizeUser(user),
                token,
                refreshToken,
            };
        } catch (error) {
            logger.error('Error registering user:', error);
            throw error;
        }
    }

    async login(email, password) {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !user.passwordHash) {
                throw new Error('Invalid credentials');
            }

            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                throw new Error('Invalid credentials');
            }

            if (!user.isActive) {
                throw new Error('User account is disabled');
            }

            const token = this.generateToken(user.id, user.email, user.role);
            const refreshToken = this.generateRefreshToken(user.id);

            // Persist refresh token
            await this.saveRefreshToken(user.id, refreshToken);

            logger.info(`User logged in: ${email}`);

            return {
                user: this.sanitizeUser(user),
                token,
                refreshToken,
            };
        } catch (error) {
            logger.error('Error logging in:', error);
            throw error;
        }
    }

    async googleAuth(googleId, email, profileData) {
        try {
            let user = await prisma.user.findUnique({ where: { googleId } });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email,
                        googleId,
                        role: UserRole.USER,
                        profileData,
                    },
                });

                await walletService.createUserWallet(user.id);
                await emailService.sendWelcomeEmail(email, profileData.name || email.split('@')[0]);
            }

            const token = this.generateToken(user.id, user.email, user.role);
            const refreshToken = this.generateRefreshToken(user.id);

            // Persist refresh token
            await this.saveRefreshToken(user.id, refreshToken);

            logger.info(`User authenticated via Google: ${email}`);

            return {
                user: this.sanitizeUser(user),
                token,
                refreshToken,
            };
        } catch (error) {
            logger.error('Error with Google auth:', error);
            throw error;
        }
    }

    async refreshAccessToken(refreshToken) {
        try {
            const payload = jwt.verify(refreshToken, config.jwt.refreshSecret);

            const tokenHash = this.hashToken(refreshToken);
            const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

            if (!stored || stored.revoked) {
                throw new Error('Refresh token revoked or not found');
            }

            if (new Date(stored.expiresAt) <= new Date()) {
                throw new Error('Refresh token expired');
            }

            const user = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!user) {
                throw new Error('User not found');
            }

            // Rotation: create new refresh token, persist it, revoke old one
            const newRefreshToken = this.generateRefreshToken(user.id);
            const saved = await this.saveRefreshToken(user.id, newRefreshToken);

            await prisma.refreshToken.update({
                where: { tokenHash },
                data: { revoked: true, replacedBy: saved.id },
            });

            const token = this.generateToken(user.id, user.email, user.role);

            return { token, refreshToken: newRefreshToken };
        } catch (error) {
            logger.error('Error refreshing token:', error);
            throw new Error('Invalid refresh token');
        }
    }

    // Hash the refresh token for storage (one-way)
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // Persist a refresh token in DB (stores hash and expiry)
    async saveRefreshToken(userId, refreshToken, meta = {}) {
        try {
            const decoded = jwt.decode(refreshToken);
            const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const tokenHash = this.hashToken(refreshToken);

            const created = await prisma.refreshToken.create({
                data: {
                    tokenHash,
                    userId,
                    expiresAt,
                    ipAddress: meta.ip,
                    userAgent: meta.ua,
                },
            });

            return created;
        } catch (error) {
            logger.error('Error saving refresh token:', error);
            // Do not prevent login if token persisting fails, but log
            return null;
        }
    }

    // Revoke a refresh token (used on logout)
    async revokeRefreshToken(refreshToken) {
        try {
            const tokenHash = this.hashToken(refreshToken);
            await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
        } catch (error) {
            logger.error('Error revoking refresh token:', error);
        }
    }

    generateToken(userId, email, role) {
        return jwt.sign({ userId, email, role }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });
    }

    generateRefreshToken(userId) {
        return jwt.sign({ userId }, config.jwt.refreshSecret, {
            expiresIn: config.jwt.refreshExpiresIn,
        });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }
}

module.exports = new AuthService();
