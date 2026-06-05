const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../models/prisma');
const walletService = require('./wallet');
const emailService = require('./email');
const logger = require('../utils/logger');
const { config } = require('../config');
const { UserRole } = require('@prisma/client');

/**
 * Vérifie si un email fait partie de la whitelist des administrateurs.
 * La liste est définie dans la variable d'env ADMIN_EMAILS (séparées par des virgules).
 * Exemple : ADMIN_EMAILS=admin@contractify.io,cto@contractify.io
 * @param {string} email
 * @returns {boolean}
 */
function isAdminEmail(email) {
    const adminEmails = process.env.ADMIN_EMAILS || '';
    if (!adminEmails.trim()) return false;
    const list = adminEmails.split(',').map((e) => e.trim().toLowerCase());
    return list.includes(email.toLowerCase());
}

class AuthService {
    async register(email, password, isAdmin = false, adminWalletAddress) {
        try {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                throw new Error('User already exists');
            }

            const passwordHash = await bcrypt.hash(password, 12);

            let user;

            if (isAdmin && adminWalletAddress) {
                // Admin: create user then associate their external wallet (no atomicity required)
                user = await prisma.user.create({
                    data: { email, passwordHash, role: UserRole.ADMIN },
                });
                await walletService.associateAdminWallet(user.id, adminWalletAddress);
            } else {
                // Regular user: create user + wallet atomically
                const wallet = require('ethers').Wallet.createRandom();
                const encryptedData = walletService.encryptPrivateKey(wallet.privateKey);

                user = await prisma.$transaction(async (tx) => {
                    const createdUser = await tx.user.create({
                        data: { email, passwordHash, role: UserRole.USER },
                    });

                    await tx.userWallet.create({
                        data: {
                            userId: createdUser.id,
                            publicAddress: wallet.address,
                            encryptedPrivateKey: encryptedData.ciphertext,
                            encryptionIv: encryptedData.iv,
                            encryptionAuthTag: encryptedData.authTag,
                            encryptionSalt: encryptedData.salt,
                            isAdminWallet: false,
                        },
                    });

                    return createdUser;
                });

                // Fund gas on demand when needed (non-critical, outside transaction)
                if (require('../config').config.funderPrivateKey) {
                    walletService.fundInitialGas(wallet.address).catch((err) =>
                        logger.error(`Non-critical: could not pre-fund wallet ${wallet.address}:`, err)
                    );
                }
            }

            // Send welcome email (non-critical, outside transaction)
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
                // Funding will be requested on-demand when user performs blockchain actions
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

    async privyAuth(privyId, email, walletAddress, profileData) {
        try {
            // Déterminer si cet email est dans la whitelist admin (variable serveur uniquement)
            const shouldBeAdmin = isAdminEmail(email);

            let user = await prisma.user.findUnique({ where: { privyId } });

            if (!user) {
                // Check if user exists by email
                const existingUser = await prisma.user.findUnique({ where: { email } });
                
                if (existingUser) {
                    // Link Privy to existing user and promote to ADMIN if applicable
                    const updateData = { privyId, profileData };
                    if (shouldBeAdmin && existingUser.role !== UserRole.ADMIN) {
                        updateData.role = UserRole.ADMIN;
                        logger.info(`[Auth] Auto-promotion ADMIN pour email whitelist: ${email}`);
                    }

                    user = await prisma.user.update({
                        where: { id: existingUser.id },
                        data: updateData,
                    });

                    // Si l'utilisateur existant n'a pas de wallet et que Privy en fournit un, l'associer
                    if (walletAddress) {
                        const existingWallet = await prisma.userWallet.findUnique({ where: { userId: user.id } });
                        if (!existingWallet) {
                            await prisma.userWallet.create({
                                data: {
                                    userId: user.id,
                                    publicAddress: walletAddress,
                                    encryptedPrivateKey: null,
                                    encryptionIv: null,
                                    encryptionAuthTag: null,
                                    encryptionSalt: null,
                                    isAdminWallet: shouldBeAdmin,
                                },
                            });
                        }
                    }
                } else {
                    // Créer un nouvel utilisateur avec Privy
                    const assignedRole = shouldBeAdmin ? UserRole.ADMIN : UserRole.USER;

                    const created = await prisma.$transaction(async (tx) => {
                        const u = await tx.user.create({
                            data: {
                                email,
                                privyId,
                                role: assignedRole,
                                profileData,
                            },
                        });

                        if (walletAddress) {
                            await tx.userWallet.create({
                                data: {
                                    userId: u.id,
                                    publicAddress: walletAddress,
                                    encryptedPrivateKey: null,
                                    encryptionIv: null,
                                    encryptionAuthTag: null,
                                    encryptionSalt: null,
                                    isAdminWallet: shouldBeAdmin,
                                },
                            });
                        }

                        return u;
                    });

                    user = created;

                    if (shouldBeAdmin) {
                        logger.info(`[Auth] Nouveau compte ADMIN créé via Privy: ${email}`);
                    } else {
                        await emailService.sendWelcomeEmail(email, profileData?.name || email.split('@')[0]);
                    }
                }
            } else {
                // Utilisateur existant — resync wallet + promotion admin si nécessaire
                const updateData = {};

                if (shouldBeAdmin && user.role !== UserRole.ADMIN) {
                    updateData.role = UserRole.ADMIN;
                    logger.info(`[Auth] Re-promotion ADMIN (connexion Privy) pour: ${email}`);
                }

                if (walletAddress) {
                    const existingWallet = await prisma.userWallet.findUnique({ where: { userId: user.id } });
                    
                    if (!existingWallet) {
                        // Créer le wallet pour un utilisateur existant qui n'en avait pas
                        await prisma.userWallet.create({
                            data: {
                                userId: user.id,
                                publicAddress: walletAddress,
                                encryptedPrivateKey: null,
                                encryptionIv: null,
                                encryptionAuthTag: null,
                                encryptionSalt: null,
                                isAdminWallet: shouldBeAdmin,
                            },
                        });
                        logger.info(`[Auth] Nouveau wallet Privy assigné à l'utilisateur existant: ${email}`);
                    } else if (existingWallet.publicAddress !== walletAddress && !existingWallet.encryptedPrivateKey) {
                        // Mettre à jour l'adresse si elle a changé et que ce n'est pas un wallet auto-géré avec clé privée
                        await prisma.userWallet.update({
                            where: { userId: user.id },
                            data: { publicAddress: walletAddress },
                        });
                        logger.info(`[Auth] Adresse wallet mise à jour pour: ${email}`);
                    }
                }

                if (Object.keys(updateData).length > 0) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: updateData,
                    });
                }
            }

            const token = this.generateToken(user.id, user.email, user.role);
            const refreshToken = this.generateRefreshToken(user.id);

            await this.saveRefreshToken(user.id, refreshToken);

            logger.info(`User authenticated via Privy: ${email} [role=${user.role}]`);

            return {
                user: this.sanitizeUser(user),
                token,
                refreshToken,
            };
        } catch (error) {
            logger.error('Error with Privy auth:', error);
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
