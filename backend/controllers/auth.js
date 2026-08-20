const authService = require('../services/auth');
const logger = require('../utils/logger');

/**
 * Helper to set auth cookies
 */
const setAuthCookies = (res, token, refreshToken) => {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProd, // secure in production
        sameSite: isProd ? 'none' : 'lax', // none+secure for cross-site in prod, lax in dev
        path: '/',
    };

    res.cookie('accessToken', token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

/**
 * Privy authentication
 * Le privyId ET l'email sont extraits de req.privyUser (vérifiés par le middleware
 * verifyPrivyToken via l'API Privy), jamais du body client — un email fourni par le
 * client ne doit pas être trusted pour l'identité (voir audit v4).
 */
exports.privyAuth = async (req, res, next) => {
    try {
        const { walletAddress, profileData, email: bodyEmail } = req.body;
        const privyId = req.privyUser?.userId;
        const email = req.privyUser?.verifiedEmail;

        if (!privyId) {
            return res.status(400).json({ error: 'Token Privy invalide' });
        }

        if (!email) {
            return res.status(400).json({ error: 'Email non vérifié par Privy' });
        }

        if (bodyEmail && bodyEmail.toLowerCase() !== email.toLowerCase()) {
            logger.warn('privyAuth: email du body différent de l\'email vérifié par Privy', {
                privyId,
                bodyEmail,
                verifiedEmail: email,
            });
        }

        const result = await authService.privyAuth(privyId, email, walletAddress, profileData);

        setAuthCookies(res, result.token, result.refreshToken);

        res.json({
            message: 'Privy authentication successful',
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

        const result = await authService.refreshAccessToken(refreshToken);

        // Set the new access token and rotated refresh token cookies
        setAuthCookies(res, result.token, result.refreshToken);

        res.json({ message: 'Token refreshed successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout
 */
exports.logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await authService.revokeRefreshToken(refreshToken);
        }
    } catch (err) {
        logger.error('Error revoking refresh token on logout', err);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });
};

