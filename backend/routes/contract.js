const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/contracts/draft
 * @desc    Save a new contract draft and wait for signers
 * @access  Private
 */
router.post('/draft', authenticate, contractController.saveDraft);

/**
 * @route   GET /api/contracts/draft/:id
 * @desc    Get details of a draft contract
 * @access  Private
 */
router.get('/draft/:id', authenticate, contractController.getDraftDetails);

/**
 * @route   POST /api/contracts/draft/:id/deploy
 * @desc    Mark draft as deployed with on-chain ID
 * @access  Private
 */
router.post('/draft/:id/deploy', authenticate, contractController.markDraftDeployed);

/**
 * @route   GET /api/contracts/cached
 * @desc    Get cached contracts for current user
 * @access  Private
 */
router.get('/cached', authenticate, contractController.getCachedContracts);

/**
 * @route   POST /api/contracts/sync/:contractId
 * @desc    Sync specific contract
 * @access  Private
 */
router.post('/sync/:contractId', authenticate, contractController.syncContract);

/**
 * @route   POST /api/contracts/sync-all
 * @desc    Sync all user contracts
 * @access  Private
 */
router.post('/sync-all', authenticate, contractController.syncAllContracts);

/**
 * @route   GET /api/contracts/search
 * @desc    Search contracts
 * @access  Private
 */
router.get('/search', authenticate, contractController.searchContracts);

/**
 * @route   GET /api/contracts/:contractId
 * @desc    Get contract details
 * @access  Private
 */
router.get('/:contractId', authenticate, contractController.getContractDetails);

/**
 * @route   GET /api/contracts/admin/all
 * @desc    Get all contracts (admin only)
 * @access  Private/Admin
 */
router.get('/admin/all', authenticate, requireAdmin, contractController.getAllContracts);

module.exports = router;
