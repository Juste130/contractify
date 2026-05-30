const fundOnDemandService = require('../services/fund-on-demand');
const logger = require('../utils/logger');

/**
 * Middleware to ensure wallet has funding before blockchain action
 * 
 * Usage in routes:
 * 1. Simple: router.post('/sign', authenticate, ensureFunded('0.05'), controller.sign);
 * 2. Dynamic: router.post('/sign', authenticate, ensureFunded(), controller.sign);
 *    Then in controller: req.fundingResult = await ensureBalance(userId, amount)
 * 
 * @param {string} requiredAmount - Optional fixed amount in MATIC (e.g., "0.05")
 * @returns {Function} Express middleware
 */
const ensureFunded = (requiredAmount = null) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.userId;
            
            // Get required amount from parameter or from request body
            let amount = requiredAmount;
            if (!amount && req.body?.requiredAmount) {
                amount = req.body.requiredAmount;
            }
            if (!amount && req.query?.requiredAmount) {
                amount = req.query.requiredAmount;
            }

            if (!amount) {
                logger.warn(`No requiredAmount specified for user ${userId}, skipping funding check`);
                return next();
            }

            // Attempt to ensure user has sufficient balance
            const result = await fundOnDemandService.ensureBalance(userId, amount);

            // Store in request for logging/debugging purposes
            req.fundingResult = result;

            logger.info(`User ${userId} funding check: amount=${result.amountRequested} MATIC, ${result.wasFunded ? 'FUNDED' : 'SUFFICIENT_BALANCE'}`);

            next();
        } catch (error) {
            logger.error(`Funding check failed for user ${req.user.userId}:`, error);
            // Log error but don't block - let the action proceed and fail on chain if needed
            next();
        }
    };
};

module.exports = { ensureFunded };
