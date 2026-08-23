const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrow');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/contracts/:id/escrow
 * @desc    Get escrow status for a contract (draft UUID)
 * @access  Private
 */
router.get('/:id/escrow', authenticate, escrowController.getEscrow);

/**
 * @route   POST /api/contracts/:id/escrow/deposit
 * @desc    Creator starts a deposit — returns 503 while no payment provider is wired
 * @access  Private
 */
router.post('/:id/escrow/deposit', authenticate, escrowController.requestDeposit);

/**
 * @route   POST /api/contracts/:id/escrow/release
 * @desc    Creator explicitly releases the escrow (early, or during the validation window)
 * @access  Private
 */
router.post('/:id/escrow/release', authenticate, escrowController.releaseNow);

/**
 * @route   POST /api/contracts/:id/escrow/block
 * @desc    Creator blocks the automatic release during the validation window
 * @access  Private
 */
router.post('/:id/escrow/block', authenticate, escrowController.blockRelease);

module.exports = router;
