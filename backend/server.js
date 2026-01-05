const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { config } = require('./config');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/error-handler');
const { generalLimiter } = require('./middleware/rate-limit');
const blockchainSyncService = require('./services/blockchain-sync');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const aiRoutes = require('./routes/ai');
const ipfsRoutes = require('./routes/ipfs');
const contractRoutes = require('./routes/contract');

const app = express();

// Middleware
app.use(helmet());
app.use(cookieParser());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim()),
    },
}));

// Rate limiting
app.use('/api/', generalLimiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/contracts', contractRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Frontend URL: ${config.frontendUrl}`);

    // Start blockchain event listener
    try {
        await blockchainSyncService.startEventListener();
        logger.info('Blockchain event listener started');
    } catch (error) {
        logger.error('Failed to start blockchain event listener:', error);
    }
});

module.exports = app;
