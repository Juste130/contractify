/**
 * EXEMPLE: Comment intégrer le financement on-demand dans vos actions blockchain
 * 
 * 🔴 IMPORTANT: Ce fichier est un EXEMPLE - pas du code à exécuter directement
 * Copiez les patterns dans vos vrais fichiers de routes/contrôleurs
 */

// ============ EXEMPLE 1: Montant Fixe (connu à l'avance) ============

const express = require('express');
const router = express.Router();
const { ensureFunded } = require('../middleware/fund-check');
const { authenticate } = require('../middleware/auth');

// Si vous savez qu'une signature coûte toujours ~0.05 MATIC:
router.post(
    '/contracts/sign', 
    authenticate, 
    ensureFunded('0.05'),  // ← Montant fixe en MATIC
    (req, res, next) => {
        // Votre contrôleur ici
    }
);

// Si une action coûte ~0.1 MATIC:
router.post(
    '/contracts/finalize', 
    authenticate, 
    ensureFunded('0.1'),
    (req, res, next) => {
        // Votre contrôleur ici
    }
);

// ============ EXEMPLE 2: Montant Dynamique (connu au runtime) ============

const fundOnDemandService = require('../services/fund-on-demand');
const walletService = require('../services/wallet');
const prisma = require('../models/prisma');
const { ethers } = require('ethers');

// Le contrôleur estime le coût et passe dans le body:
router.post('/tokens/transfer', authenticate, ensureFunded(), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { to, amount } = req.body;

        // Estimer le gas requis (exemple simple)
        const gasEstimate = ethers.parseEther('0.02');  // 0.02 MATIC pour transfer
        const totalNeeded = ethers.parseEther(amount).add(gasEstimate);

        // Assurer le financement pour ce montant spécifique
        await fundOnDemandService.ensureBalance(userId, totalNeeded);

        // Récupérer le wallet et signer
        const wallet = await prisma.userWallet.findUnique({ where: { userId } });
        const userWallet = new ethers.Wallet(
            walletService.decryptPrivateKey(wallet.encryptedPrivateKey, wallet.encryptionIv, wallet.encryptionAuthTag),
            new ethers.JsonRpcProvider(process.env.ALCHEMY_POLYGON_RPC_URL)
        );

        // Continuer avec la transaction...
        const tx = await userWallet.sendTransaction({
            to: to,
            value: ethers.parseEther(amount),
        });

        res.json({ message: 'Transfer successful', txHash: tx.hash });
    } catch (error) {
        next(error);
    }
});

// ============ EXEMPLE 3: Routes Complètes ============

// Signature contrat (coût fixe ~0.05 MATIC):
router.post(
    '/contracts/sign', 
    authenticate, 
    ensureFunded('0.05'),
    async (req, res, next) => { /* controller logic */ }
);

// Créer contrat (coût fixe ~0.1 MATIC):
router.post(
    '/contracts/create', 
    authenticate, 
    ensureFunded('0.1'),
    async (req, res, next) => { /* controller logic */ }
);

// Finaliser contrat (coût fixe ~0.08 MATIC):
router.post(
    '/contracts/finalize', 
    authenticate, 
    ensureFunded('0.08'),
    async (req, res, next) => { /* controller logic */ }
);

// Minter NFT (coût fixe ~0.15 MATIC):
router.post(
    '/nft/mint', 
    authenticate, 
    ensureFunded('0.15'),
    async (req, res, next) => { /* controller logic */ }
);

// Transfer token (montant dynamique):
router.post(
    '/tokens/transfer', 
    authenticate, 
    ensureFunded(),  // Pas de montant fixe
    async (req, res, next) => { /* Le contrôleur estime le montant */ }
);

// ============ EXEMPLE 4: Endpoint Financement Dynamique ============

/**
 * POST http://localhost:3001/api/fund/request
 * 
 * Body JSON:
 * {
 *   "requiredAmount": "0.05"
 * }
 * 
 * Réponse:
 * {
 *   "message": "Funding check completed",
 *   "address": "0x1234...",
 *   "amountRequested": "0.05",
 *   "wasFunded": true
 * }
 */

// ============ EXEMPLE 5: Vérifier les Coûts Réels ============

/**
 * Avant de mettre en production, estimez le gas réel:
 */

const { config } = require('../config');
const CONTRACT_MANAGER_ABI = [
    'function sign(uint256 contractId) external',
    'function create(string memory data) external returns (uint256)',
];

async function estimateGasCosts() {
    const provider = new ethers.JsonRpcProvider(config.polygonRpcUrl);
    const contract = new ethers.Contract(
        config.contractManagerAddress,
        CONTRACT_MANAGER_ABI,
        provider
    );

    // Estimer gas pour une signature:
    try {
        const gasEstimate = await contract.sign.estimateGas(1); // contractId = 1
        const gasPrice = await provider.getGasPrice();
        const totalCost = gasEstimate * gasPrice;
        console.log('Coût signature en wei:', totalCost.toString());
        console.log('Coût signature en MATIC:', ethers.formatEther(totalCost));
    } catch (e) {
        console.error('Erreur estimation signature:', e.message);
    }
}

// ============ EXEMPLE 6: Contrôleur Avec Funding Dynamique ============

const logger = require('../utils/logger');

/**
 * Exemple complet: Contrôleur pour signer un contrat
 * avec financement automatique
 */
const signContractController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { contractId } = req.body;

        // Estimer le coût de la signature
        const estimatedGas = ethers.parseEther('0.05');

        // Assurer le financement
        const fundResult = await fundOnDemandService.ensureBalance(userId, estimatedGas);
        logger.info(
            `Funding check for sign: ${fundResult.amountRequested} MATIC, ` +
            `${fundResult.wasFunded ? 'funded' : 'sufficient'}`
        );

        // Récupérer le wallet et déchiffrer la clé privée
        const wallet = await prisma.userWallet.findUnique({ where: { userId } });
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const privateKey = walletService.decryptPrivateKey(
            wallet.encryptedPrivateKey,
            wallet.encryptionIv,
            wallet.encryptionAuthTag
        );

        const provider = new ethers.JsonRpcProvider(config.polygonRpcUrl);
        const userWallet = new ethers.Wallet(privateKey, provider);

        // Signer le contrat
        const contractManager = new ethers.Contract(
            config.contractManagerAddress,
            CONTRACT_MANAGER_ABI,
            userWallet
        );
        const tx = await contractManager.sign(contractId);
        const receipt = await tx.wait();

        res.json({
            message: 'Contract signed successfully',
            txHash: receipt.hash,
            gasUsed: receipt.gasUsed.toString(),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signContractController,
    estimateGasCosts,
};
