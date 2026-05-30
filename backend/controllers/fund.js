const fundOnDemandService = require('../services/fund-on-demand');
const logger = require('../utils/logger');

/**
 * Check wallet funding status
 */
exports.getFundingStatus = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const status = await fundOnDemandService.getFundingStatus(userId);

        res.json({
            message: 'Funding status retrieved',
            ...status,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Request funding (on-demand top-up)
 * @body {string} requiredAmount - Amount needed in MATIC (e.g., "0.05")
 */
exports.requestFunding = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { requiredAmount } = req.body;

        if (!requiredAmount) {
            return res.status(400).json({ error: 'requiredAmount is required' });
        }

        const result = await fundOnDemandService.ensureBalance(userId, requiredAmount);

        res.json({
            message: 'Funding check completed',
            ...result,
        });
    } catch (error) {
        next(error);
    }
};
