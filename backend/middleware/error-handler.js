const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // Fallback for non-AppError exceptions using legacy string matching
    if (!(err instanceof AppError) && err.message) {
        if (err.message.includes('not found')) {
            statusCode = 404;
        } else if (err.message.includes('Invalid') || err.message.includes('already exists')) {
            statusCode = 400;
        } else if (err.message.includes('Unauthorized') || err.message.includes('Invalid token')) {
            statusCode = 401;
        } else if (err.message.includes('Forbidden') || err.message.includes('permissions')) {
            statusCode = 403;
        }
    }

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { errorHandler };
