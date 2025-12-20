const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Default error
    let statusCode = 500;
    let message = 'Internal server error';

    // Custom error handling
    if (err.message.includes('not found')) {
        statusCode = 404;
        message = err.message;
    } else if (err.message.includes('Invalid') || err.message.includes('already exists')) {
        statusCode = 400;
        message = err.message;
    } else if (err.message.includes('Unauthorized') || err.message.includes('Invalid token')) {
        statusCode = 401;
        message = err.message;
    } else if (err.message.includes('Forbidden') || err.message.includes('permissions')) {
        statusCode = 403;
        message = err.message;
    }

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { errorHandler };
