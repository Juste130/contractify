const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/notifications
 * @desc    List the current user's notifications
 * @access  Private
 */
router.get('/', authenticate, notificationsController.list);

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark one notification as read
 * @access  Private
 */
router.post('/:id/read', authenticate, notificationsController.markRead);

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all of the current user's notifications as read
 * @access  Private
 */
router.post('/read-all', authenticate, notificationsController.markAllRead);

module.exports = router;
