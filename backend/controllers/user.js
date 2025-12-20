const prisma = require('../models/prisma').default;
const walletService = require('../services/wallet').default;
const logger = require('../utils/logger').default;

/**
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove sensitive data
        const { passwordHash, ...userProfile } = user;

        res.json({ user: userProfile });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { profileData } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profileData },
        });

        const { passwordHash, ...userProfile } = updatedUser;

        res.json({
            message: 'Profile updated successfully',
            user: userProfile,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user wallet
 */
exports.getWallet = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const wallet = await walletService.getUserWallet(userId);

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Get balance
        const balance = await walletService.getWalletBalance(wallet.publicAddress);

        res.json({
            wallet: {
                address: wallet.publicAddress,
                balance,
                isAdminWallet: wallet.isAdminWallet,
                createdAt: wallet.createdAt,
                fundedAt: wallet.fundedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all users (admin only)
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;

        const where = {};
        if (role) where.role = role;
        if (search) {
            where.email = { contains: search, mode: 'insensitive' };
        }

        const users = await prisma.user.findMany({
            where,
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                wallet: true,
                _count: {
                    select: { contracts: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const total = await prisma.user.count({ where });

        // Remove sensitive data
        const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);

        res.json({
            users: sanitizedUsers,
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
 * Update user role (admin only)
 */
exports.updateUserRole = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['ADMIN', 'USER', 'VIEWER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        const { passwordHash, ...userProfile } = updatedUser;

        res.json({
            message: 'User role updated successfully',
            user: userProfile,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deactivate user (admin only)
 */
exports.deactivateUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
        });

        res.json({
            message: 'User deactivated successfully',
            userId: updatedUser.id,
        });
    } catch (error) {
        next(error);
    }
};
