const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

            const user = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!user) {
                throw new Error('User not found');
            }

            const token = this.generateToken(user.id, user.email, user.role);

            return { token };
        } catch (error) {
            logger.error('Error refreshing token:', error);
            throw new Error('Invalid refresh token');
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
