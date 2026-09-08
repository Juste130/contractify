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

    // Fallback for third-party/uncaught exceptions (Prisma, ethers, raw thrown strings...) that
    // never go through AppError and so carry no real statusCode. Only runs when nothing already
    // set one above — guards against ever overwriting a genuine statusCode some future non-
    // AppError error type might carry, and this whole block is a best-effort heuristic, not
    // meant to run at all once every app-thrown error already extends AppError above.
    if (statusCode === 500 && !(err instanceof AppError) && err.message) {
        if (/\bnot found\b/i.test(err.message)) {
            statusCode = 404;
        } else if (/\binvalid\b/i.test(err.message) || /\balready exists\b/i.test(err.message)) {
            statusCode = 400;
        } else if (/\bunauthorized\b/i.test(err.message) || /\binvalid token\b/i.test(err.message)) {
            statusCode = 401;
        } else if (/\bforbidden\b/i.test(err.message) || /\bpermissions\b/i.test(err.message)) {
            statusCode = 403;
        }
    }

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { errorHandler };
