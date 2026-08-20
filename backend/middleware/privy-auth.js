const { PrivyClient } = require('@privy-io/server-auth');
const logger = require('../utils/logger');

/**
 * Initialise le client Privy une seule fois (singleton)
 * Le client vérifie les tokens JWT signés par Privy côté serveur.
 */
let privyClient = null;

const getPrivyClient = () => {
    if (!privyClient) {
        const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID;
        const appSecret = process.env.PRIVY_APP_SECRET;

        if (!appId || !appSecret) {
            logger.warn('PRIVY_APP_ID ou PRIVY_APP_SECRET manquant — middleware Privy désactivé');
            return null;
        }

        privyClient = new PrivyClient(appId, appSecret);
    }
    return privyClient;
};

/**
 * Middleware : vérifie le token Privy envoyé dans le header Authorization.
 * Format attendu : "Authorization: Bearer <privy-id-token>"
 *
 * Si valide, ajoute req.privyUser = { userId, verifiedEmail, ... } puis appelle next().
 * Si invalide ou absent, retourne 401.
 *
 * IMPORTANT : verifiedEmail est récupéré depuis l'API Privy (client.getUserById), jamais
 * depuis req.body — un email fourni par le client n'est pas fiable pour l'identité
 * (voir audit v4, faille de prise de contrôle de compte).
 */
const verifyPrivyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token Privy manquant' });
    }

    const token = authHeader.substring(7);
    const client = getPrivyClient();

    if (!client) {
        // En mode dégradé (pas de clés configurées), on laisse passer en dev seulement.
        // Dans ce mode, aucun appel réseau à Privy n'est possible : on retombe sur
        // req.body.email à titre dev-only, non sécurisé (jamais en production).
        if (process.env.NODE_ENV !== 'production') {
            logger.warn('verifyPrivyToken: Privy client non configuré, mode dégradé (dev uniquement, email non vérifié)');
            req.privyUser = { userId: 'dev-user', address: null, verifiedEmail: req.body?.email || null };
            return next();
        }
        return res.status(503).json({ error: 'Service d\'authentification non disponible' });
    }

    try {
        const verifiedClaims = await client.verifyAuthToken(token);
        // verifiedClaims contient : userId (DID Privy), expiration, etc.

        // Récupère l'utilisateur complet côté serveur pour obtenir un email vérifié par Privy,
        // jamais fourni par le client.
        let verifiedEmail = null;
        try {
            const privyUserRecord = await client.getUserById(verifiedClaims.userId);
            verifiedEmail = privyUserRecord?.email?.address || null;
        } catch (fetchError) {
            logger.warn('verifyPrivyToken: échec de récupération de l\'utilisateur Privy', { error: fetchError.message });
        }

        req.privyUser = { ...verifiedClaims, verifiedEmail };
        next();
    } catch (error) {
        logger.warn('verifyPrivyToken: Token invalide ou expiré', { error: error.message });
        return res.status(401).json({ error: 'Token Privy invalide ou expiré' });
    }
};

module.exports = { verifyPrivyToken, getPrivyClient };
