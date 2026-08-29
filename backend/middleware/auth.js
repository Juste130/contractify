const authService = require('../services/auth');
const logger = require('../utils/logger');
const prisma = require('../models/prisma');
const { UserRole } = require('@prisma/client');

// Async and DB-backed on purpose: an access token's signature being valid only proves it
// was ISSUED while the account was in good standing — it says nothing about whether an
// admin suspended that account a minute later. Without this lookup, `isActive: false`
// (the "Suspendre" action in the admin panel) had zero effect: the holder of an
// already-issued token kept full access until it happened to expire naturally.
const authenticate = async (req, res, next) => {
    try {
        // Look for token in cookies first, then Authorization header
        let token = req.cookies.accessToken;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const payload = authService.verifyToken(token);

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { isActive: true, role: true },
        });

        if (!user || !user.isActive) {
            return res.status(403).json({ error: 'Ce compte a été suspendu' });
        }

        // Same reasoning as isActive above, for role: the JWT's `role` claim is frozen at
        // the moment it was issued. Without overwriting it here, an admin demoted via
        // updateUserRole keeps requireAdmin access on every already-issued token until it
        // expires — the demotion has no immediate effect, exactly the gap already closed
        // for suspension. req.user.role is set from the DB read just above, never trusted
        // from the token itself.
        req.user = { ...payload, role: user.role };
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = {
    authenticate,
    requireAdmin,
    requireRole,
};
