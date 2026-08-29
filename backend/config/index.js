const dotenv = require('dotenv');

dotenv.config();

const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    // Express's `trust proxy` setting — without it, behind any reverse proxy (Render,
    // Heroku, nginx, an ALB...) express-rate-limit reads the wrong IP for every request:
    // either every user gets counted as the same single IP (the proxy's), or v7 outright
    // rejects requests carrying X-Forwarded-For. `1` (trust exactly one hop) is the
    // standard safe default for a single reverse proxy in front of this app; set
    // TRUST_PROXY=0 locally/direct, or a higher hop count for a multi-proxy topology.
    // Accepts a number ("1", "2"...), a boolean ("true"/"false"), or an Express-recognized
    // string value (e.g. "loopback") passed through as-is.
    trustProxy: (() => {
        const raw = process.env.TRUST_PROXY;
        if (raw === undefined) return 1;
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        return /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
    })(),

    // Database
    databaseUrl: process.env.DATABASE_URL,


    // Encryption
    masterEncryptionKey: process.env.MASTER_ENCRYPTION_KEY,

    // Blockchain
    polygonRpcUrl: process.env.ALCHEMY_POLYGON_TESTNET_RPC_URL || process.env.POLYGON_RPC_URL,
    polygonTestnetRpcUrl: process.env.ALCHEMY_POLYGON_TESTNET_RPC_URL || process.env.POLYGON_TESTNET_RPC_URL,
    contractManagerAddress: process.env.CONTRACT_MANAGER_ADDRESS,
    contractNftAddress: process.env.CONTRACT_NFT_ADDRESS,
    adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS,
    funderPrivateKey: process.env.FUNDER_PRIVATE_KEY,
    // Note: INITIAL_GAS_AMOUNT no longer used - amounts are now dynamic per action

    // Groq
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',

    // Payments (escrow) — no real payment aggregator wired yet. Deposit/payout stay
    // disabled until this is turned on and a real PaymentProvider is plugged in. The
    // scheduler checks for due reminders (T-72h/48h/24h) and due releases at this interval.
    paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
    escrowSchedulerIntervalMs: parseInt(process.env.ESCROW_SCHEDULER_INTERVAL_MS || String(15 * 60 * 1000), 10),

    // Pinata (IPFS)
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud',


    // Email
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    emailFrom: process.env.EMAIL_FROM || 'noreply@contractify.com',

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },


    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        aiMaxRequests: parseInt(process.env.RATE_LIMIT_AI_MAX_REQUESTS || '10', 10),
        walletMaxRequests: parseInt(process.env.RATE_LIMIT_WALLET_MAX_REQUESTS || '5', 10),
        authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '20', 10),
        inviteMaxRequests: parseInt(process.env.RATE_LIMIT_INVITE_MAX_REQUESTS || '10', 10),
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    logFilePath: process.env.LOG_FILE_PATH || './logs',
};

// Validate critical environment variables
const requiredEnvVars = [
    'DATABASE_URL',
    'MASTER_ENCRYPTION_KEY',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'GROQ_API_KEY',
    'PINATA_JWT',
    'POLYGON_RPC_URL',
    'CONTRACT_MANAGER_ADDRESS',
    'ADMIN_WALLET_ADDRESS',
];

const missing = requiredEnvVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
    const msg = `Missing environment variables: ${missing.join(', ')}`;
    if (config.nodeEnv === 'production') {
        // Fail fast in production to avoid running with insecure defaults
        throw new Error(msg);
    } else {
        console.warn(`Warning: ${msg}`);
    }
}

// Validate Pinata JWT format early to provide clearer errors for malformed tokens
if (config.pinataJwt) {
    const parts = config.pinataJwt.split('.');
    if (parts.length !== 3) {
        const msg = 'PINATA_JWT appears malformed: expected a JWT with three dot-separated segments';
        if (config.nodeEnv === 'production') {
            throw new Error(msg);
        } else {
            console.warn(`Warning: ${msg}`);
        }
    }
}

module.exports = { config };
