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

module.exports = {
    generalLimiter,
    aiLimiter,
    walletLimiter,
};
