/**
 * 📊 GUIDE: Estimer les Coûts de Gas Polygon
 * 
 * Les coûts varient selon:
 * - Complexité de la fonction
 * - Prix actuel du gas
 * - Charge du réseau
 */

// ============ COÛTS TYPIQUES (Polygon Mumbai Testnet) ============

// Transactions simples:
// - Transfer token (ERC20): ~0.01 MATIC
// - Transfer MATIC: ~0.005 MATIC
// - Simple storage write: ~0.005 MATIC

// Contrats intermédiaires:
// - Signature de contrat: ~0.03-0.05 MATIC
// - Mint NFT simple: ~0.08-0.12 MATIC
// - Create contract: ~0.08-0.15 MATIC

// Contrats complexes:
// - Finalize (multi-signer): ~0.1-0.2 MATIC
// - Complex batch operations: ~0.15-0.3 MATIC

// ============ MÉTHODE 1: Via Ethers.js (Recommandée) ============

const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider(
    'https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'
);

const CONTRACT_MANAGER_ABI = [
    'function sign(uint256 contractId) public',
    'function create(string memory data) public returns (uint256)',
];

const contractManagerAddress = '0x03BbDa73E5792F1F22D380dF39b0Da9D954D386c';

async function estimateGasCosts() {
    const contract = new ethers.Contract(
        contractManagerAddress,
        CONTRACT_MANAGER_ABI,
        provider
    );

    // Estimer pour une signature
    try {
        const gasForSign = await contract.sign.estimateGas(1);
        const gasPrice = await provider.getGasPrice();
        const costWei = gasForSign * gasPrice;
        const costMatic = ethers.formatEther(costWei);
        console.log('Sign cost:', costMatic, 'MATIC');
    } catch (e) {
        console.log('Could not estimate sign:', e.message);
    }

    // Estimer pour créer un contrat
    try {
        const gasForCreate = await contract.create.estimateGas('test data');
        const gasPrice = await provider.getGasPrice();
        const costWei = gasForCreate * gasPrice;
        const costMatic = ethers.formatEther(costWei);
        console.log('Create cost:', costMatic, 'MATIC');
    } catch (e) {
        console.log('Could not estimate create:', e.message);
    }
}

estimateGasCosts().catch(console.error);

// ============ MÉTHODE 2: Via Polygon Scan (Manuel) ============

/**
 * 1. Aller sur https://mumbai.polygonscan.com
 * 2. Chercher une transaction récente de votre contrat
 * 3. Cliquer sur le hash de transaction
 * 4. Voir "Gas Used" et "Gas Price"
 * 5. Calculer: Gas Used × Gas Price = Total en Wei
 * 6. Diviser par 1e18 = Montant en MATIC
 * 
 * Exemple:
 * - Gas Used: 50,000
 * - Gas Price: 40 Gwei (= 40 * 1e9 wei)
 * - Total: 50,000 × 40 × 1e9 = 2 × 1e15 wei
 * - En MATIC: 2 × 1e15 / 1e18 = 0.002 MATIC
 */

// ============ COÛTS PAR FONCTION (Approximations) ============

const ESTIMATED_COSTS = {
    // Signatures et actions légères
    'contract.sign': '0.05',        // Signature d'un contrat
    'contract.acknowledge': '0.03', // Reconnaissance simples
    
    // Créations et modifications
    'contract.create': '0.1',       // Créer un contrat
    'contract.update': '0.08',      // Mettre à jour
    'contract.finalize': '0.15',    // Finaliser (complexe)
    
    // NFT et tokens
    'nft.mint': '0.12',             // Minter un NFT
    'token.transfer': '0.01',       // Transfer token
    'token.approve': '0.01',        // Approuver token
    
    // Batch operations
    'batch.sign': '0.2',            // Signer 2+ documents
    'batch.process': '0.3',         // Traiter plusieurs
};

// ============ CONVERTIR EN CODE ============

// Dans vos middlewares/contrôleurs:

// Signature simple:
router.post('/sign', authenticate, ensureFunded('0.05'), controller.sign);

// Créer contrat:
router.post('/create', authenticate, ensureFunded('0.1'), controller.create);

// Transfer dynamique:
router.post('/transfer', authenticate, ensureFunded(), (req, res, next) => {
    const { amount } = req.body;
    const transferCost = ethers.parseEther('0.01');
    const totalNeeded = ethers.parseEther(amount).add(transferCost);
    
    // Le middleware va utiliser ce montant
    ensureFunded(totalNeeded)(req, res, next);
});

// ============ SÉCURITÉ: AJOUTER UN BUFFER ============

/**
 * Toujours ajouter 10-20% de buffer pour:
 * - Variations de prix du gas
 * - Fluctuations du réseau
 * - Transactions failed/revert
 */

// Estimé: 0.05 MATIC
// Buffer +10%: 0.05 × 1.1 = 0.055 MATIC
// UTILISER DANS LE CODE: ensureFunded('0.055')

function addBuffer(estimatedMatic, percentBuffer = 10) {
    const multiplier = 1 + percentBuffer / 100;
    const withBuffer = (parseFloat(estimatedMatic) * multiplier).toFixed(4);
    return withBuffer;
}

console.log(addBuffer('0.05', 10));   // 0.0550
console.log(addBuffer('0.1', 15));    // 0.1150
console.log(addBuffer('0.15', 20));   // 0.1800

// ============ TESTING ============

/**
 * Pour vérifier vos estimations avant production:
 * 
 * 1. Déployer en staging
 * 2. Exécuter 10-20 transactions réelles
 * 3. Voir les coûts réels sur Polygon Scan
 * 4. Ajuster les montants dans ensureFunded()
 * 5. Vérifier les logs: "Gas Used" vs "Expected"
 * 6. Produit si ±5% de marge
 */

module.exports = { ESTIMATED_COSTS, addBuffer };
