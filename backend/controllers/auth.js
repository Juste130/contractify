const authService = require('../services/auth');
const walletService = require('../services/wallet');
const logger = require('../utils/logger').default;

/**
 * Helper to set auth cookies
 */
const setAuthCookies = (res, token, refreshToken) => {
    res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

/**
 * Register new user
 */
exports.register = async (req, res, next) => {
    try {
        const { email, password, isAdmin, adminWalletAddress } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await authService.default.register(
            email,
            password,
            isAdmin,
            adminWalletAddress
        );

        setAuthCookies(res, result.token, result.refreshToken);

        res.status(201).json({
            message: 'User registered successfully',
            user: result.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await authService.default.login(email, password);

        setAuthCookies(res, result.token, result.refreshToken);

        res.json({
            message: 'Login successful',
            user: result.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Google OAuth callback
 */
exports.googleAuth = async (req, res, next) => {
    try {
        const { googleId, email, profileData } = req.body;

        if (!googleId || !email) {
            return res.status(400).json({ error: 'Google ID and email are required' });
        }

        const result = await authService.default.googleAuth(googleId, email, profileData);

        setAuthCookies(res, result.token, result.refreshToken);

        res.json({
            message: 'Google authentication successful',
            user: result.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res, next) => {
    try {
        // Read refresh token from cookie instead of body
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token is required' });
        }

        const result = await authService.default.refreshAccessToken(refreshToken);

        // Set the new access token cookie
        res.cookie('accessToken', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000, // 1 hour
        });

        res.json({
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout
 */
exports.logout = async (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });
};

