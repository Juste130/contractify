const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { walletLimiter } = require('../middleware/rate-limit');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticate, userController.updateProfile);

/**
 * @route   GET /api/users/wallet
 * @desc    Get user wallet
 * @access  Private
 */
router.get('/wallet', authenticate, walletLimiter, userController.getWallet);

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, requireAdmin, userController.getAllUsers);

/**
 * @route   PUT /api/users/:userId/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
router.put('/:userId/role', authenticate, requireAdmin, userController.updateUserRole);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Deactivate user (admin only)
 * @access  Private/Admin
 */
router.delete('/:userId', authenticate, requireAdmin, userController.deactivateUser);

module.exports = router;
