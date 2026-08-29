const rateLimit = require('express-rate-limit');
const { config } = require('../config');

// General rate limiter
const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// AI endpoints rate limiter (stricter)
const aiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.aiMaxRequests,
    message: 'Too many AI requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Wallet operations rate limiter (very strict)
const walletLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.walletMaxRequests,
    message: 'Too many wallet operations, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth endpoints rate limiter (strict — anti-bruteforce sur /api/auth/privy)
const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMaxRequests,
    message: 'Too many authentication requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Invitation rate limiter — the endpoint already throttles repeat invites to the SAME
// email (see inviteUser), but this caps how many DIFFERENT addresses one account can
// spam invitations to.
const inviteLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.inviteMaxRequests,
    message: 'Too many invitations sent, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    aiLimiter,
    walletLimiter,
    authLimiter,
    inviteLimiter,
};
