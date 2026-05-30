const express = require('express');
const router = express.Router();
const fundController = require('../controllers/fund');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/fund/status
 * @desc    Get wallet funding status
 * @access  Private
 */
router.get('/status', authenticate, fundController.getFundingStatus);

/**
 * @route   POST /api/fund/request
 * @desc    Request funding (on-demand top-up)
 * @access  Private
 */
router.post('/request', authenticate, fundController.requestFunding);

module.exports = router;
