const authService = require('../services/auth');
const logger = require('../utils/logger');
const { UserRole } = require('@prisma/client');

const authenticate = (req, res, next) => {
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

        req.user = payload;
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
