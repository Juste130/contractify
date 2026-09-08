const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/analytics/monthly
 * @desc    Real monthly trends (new users, contracts created/signed, logins) for the
 *          admin Analytics dashboard
 * @access  Private/Admin
 */
router.get('/monthly', authenticate, requireAdmin, analyticsController.getMonthlyStats);

module.exports = router;
