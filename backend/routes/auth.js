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

// Anciennes routes /register, /login, /google (email+mot de passe et Google OAuth maison)
// retirées — Privy gère désormais entièrement l'authentification, la création de wallet
// et le financement MATIC. Seule /privy ci-dessous reste active.

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