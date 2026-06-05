const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { body, validationResult } = require('express-validator');
const { verifyPrivyToken } = require('../middleware/privy-auth');

// Validation result middleware
const validateRequest = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
	'/register',
	[
		body('email').isEmail().normalizeEmail(),
		body('password').isLength({ min: 8 }),
	],
	validateRequest,
	authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
	'/login',
	[
		body('email').isEmail().normalizeEmail(),
		body('password').exists(),
	],
	validateRequest,
	authController.login
);

/**
 * @route   POST /api/auth/google
 * @desc    Google OAuth authentication
 * @access  Public
 */
router.post(
	'/google',
	[
		body('googleId').notEmpty(),
		body('email').isEmail().normalizeEmail(),
	],
	validateRequest,
	authController.googleAuth
);

/**
 * @route   POST /api/auth/privy
 * @desc    Privy authentication (vérifié côté serveur via SDK Privy)
 * @access  Public — nécessite un token Privy valide dans Authorization header
 */
router.post(
	'/privy',
	verifyPrivyToken,
	[
		body('email').isEmail().normalizeEmail(),
	],
	validateRequest,
	authController.privyAuth
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', authController.logout);

module.exports = router;
