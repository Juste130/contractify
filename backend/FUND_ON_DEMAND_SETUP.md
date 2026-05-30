# 🚀 Système de Financement On-Demand (Top-Up Automatique)

## Configuration Rapide

### Étape 1: Ajouter votre clé privée testnet

**Fichier:** `backend/.env`

```env
# Remplacez ceci:
FUNDER_PRIVATE_KEY=0x6884c96b323cffb4bfd2792053b1a2855b4b7b06ddf6f3503ee9b88ea4f25b02
INITIAL_GAS_AMOUNT=0.01

# Par ceci (votre config):
FUNDER_PRIVATE_KEY=0xvotre_clé_privée_testnet
```

⚠️ **Note:** `INITIAL_GAS_AMOUNT` n'est plus utilisé (montants dynamiques maintenant)

**Où trouver votre clé privée:**
1. Ouvrez MetaMask
2. Menu → Compte → Exporter la clé privée
3. Copiez et collez dans `.env`

⚠️ **SÉCURITÉ:**
- Ne commiter JAMAIS votre `.env` sur Git
- En production, utiliser AWS Secrets Manager ou HashiCorp Vault
- Utiliser un wallet de service dédié (pas votre wallet personnel)

---

## Architecture du Système

```
Utilisateur crée un compte
         ↓
   ✅ Wallet généré
   ⏭️ PAS de financement immédiat
         ↓
Utilisateur signe un contrat (coût: 0.05 MATIC)
         ↓
    Endpoint appelée
         ↓
  middleware ensureFunded('0.05')
         ↓
  Vérifier solde du wallet
         ↓
  Si solde < 0.05 MATIC:
    └─→ Funder envoie EXACTEMENT (0.05 - solde + buffer)
  Sinon:
    └─→ Continue directement
         ↓
   ✅ Action blockchain effectuée
```

**Exemple:**
- Wallet a 0.01 MATIC
- Action requiert 0.05 MATIC
- Funder envoie: 0.05 - 0.01 + 0.001 (buffer) = **0.041 MATIC** (pas 10 MATIC!)

---

## Endpoints Disponibles

### 1. Vérifier l'état du financement
```bash
GET /api/fund/status

# Réponse:
{
  "address": "0x1234abcd...",
  "balance": "10.5",           # Solde actuel en MATIC
  "needsFunding": false,       # Besoin financement?
  "fundedAt": "2026-05-30T10:00:00Z"
}
```

### 2. Déclencher financement avec montant spécifique
```bash
POST /api/fund/request
Content-Type: application/json

{
  "requiredAmount": "0.05"  # Montant exactement requis en MATIC
}

# Réponse:
{
  "message": "Funding check completed",
  "address": "0x1234abcd...",
  "amountRequested": "0.05",   # Montant demandé
  "wasFunded": true            # true=topup fait, false=solde suffisant
}
```

---

## Intégration dans vos Routes

### Montant Fixe (connu à l'avance)

Si vous savez qu'une action coûte toujours ~0.05 MATIC:

**Avant (sans financement):**
```javascript
router.post('/contracts/sign', authenticate, contractController.signContract);
```

**Après (avec financement auto):**
```javascript
const { ensureFunded } = require('../middleware/fund-check');

router.post(
    '/contracts/sign', 
    authenticate, 
    ensureFunded('0.05'),  // ← Exactement 0.05 MATIC si besoin
    contractController.signContract
);
```

### Montant Dynamique (estimé au runtime)

Si le coût varie selon les paramètres:

```javascript
const { ensureFunded } = require('../middleware/fund-check');

// Pas de montant fixe - sera estimé dans le contrôleur
router.post(
    '/tokens/transfer', 
    authenticate, 
    ensureFunded(),  // ← Pas de paramètre
    tokenController.transfer
);

// Dans votre contrôleur:
exports.transfer = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { to, amount } = req.body;

        // Estimer le gas
        const gasEstimate = ethers.parseEther('0.02');
        const totalNeeded = ethers.parseEther(amount).add(gasEstimate);

        // Assurer financement pour ce montant
        const fundResult = await fundOnDemandService.ensureBalance(userId, totalNeeded);
        logger.info(`Funding: ${fundResult.amountRequested} MATIC, ${fundResult.wasFunded ? 'funded' : 'ok'}`);

        // Continuer avec la transaction...
    } catch (error) {
        next(error);
    }
};
```

---

## Routes à Protéger

| Route | Montant | Type |
|-------|---------|------|
| `POST /contracts/sign` | 0.05 | Fixe |
| `POST /contracts/create` | 0.1 | Fixe |
| `POST /contracts/finalize` | 0.08 | Fixe |
| `POST /nft/mint` | 0.15 | Fixe |
| `POST /tokens/transfer` | Dynamique | Variable selon montant |
| `POST /payments/process` | Dynamique | Variable selon montant |

---

## Estimer les Coûts Réels

### Via Ethers.js:
```javascript
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY');
const contract = new ethers.Contract(addressOfContractManager, ABI, provider);

// Estimer gas pour signer un contrat:
const gasEstimate = await contract.sign.estimateGas(contractId);
const gasPrice = await provider.getGasPrice();
const totalCostWei = gasEstimate * gasPrice;
const totalCostMatic = ethers.formatEther(totalCostWei);

console.log('Coût en MATIC:', totalCostMatic);  // Utiliser ce montant
```

### Via Polygon Scan:
1. Allez sur [mumbai.polygonscan.com](https://mumbai.polygonscan.com)
2. Trouvez une transaction similaire
3. Vérifiez "Gas Used" × "Gas Price"
4. Convertir en MATIC

---

## Monitoring & Debugging

### Voir les logs de financement:
```bash
# Terminal 1: Démarrer le serveur
npm run dev

# Terminal 2: Voir les logs en temps réel
tail -f logs/app.log | grep -i "fund"
```

### Exemples de logs:
```
Wallet 0x1234... has sufficient balance: 0.5 MATIC >= 0.05 MATIC required
Wallet 0x5678... insufficient balance (0.01 MATIC), funding with 0.041 MATIC...
Wallet 0x5678... funded with 0.041 MATIC. Tx: 0xabcd...
User abc123 funding check: amount=0.05 MATIC, FUNDED
```

### Vérifier solde en ligne de commande:
```bash
node -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY');
provider.getBalance('0x1234...').then(b => console.log(ethers.formatEther(b)));
"
```

---

## Troubleshooting

| Problème | Cause | Solution |
|----------|-------|----------|
| "Funder wallet not configured" | `FUNDER_PRIVATE_KEY` manquant | Ajouter dans `.env` |
| Funding échoue | Funder wallet vide | Envoyer du testnet MATIC au funder |
| "Failed to get wallet balance" | RPC invalide ou réseau down | Vérifier `ALCHEMY_POLYGON_TESTNET_RPC_URL` |
| Montant insuffisant | Estimation trop basse | Augmenter le montant passé à `ensureFunded()` |
| Transaction fails avec "insufficient gas" | Montant estimé trop bas | Augmenter de 10-20% la valeur estimée |

---

## Coûts

**Gratuit** ✅
- Pas de service externe
- Pas de Paymaster
- Pas d'API coûteuse
- Juste votre MATIC testnet
- Montants optimisés = moins de MATIC gaspillé

**À payer:**
- MATIC testnet (fonctionne avec le testnet gratuit de Polygon)
- RPC Alchemy (gratuit tier: ~100k appels/jour)

---

## Prochaines Étapes

1. ✅ Ajouter votre `FUNDER_PRIVATE_KEY` dans `.env`
2. ✅ Estimer les coûts réels des actions blockchain (voir "Estimer les Coûts Réels")
3. ✅ Intégrer `ensureFunded(amount)` dans vos routes blockchain
4. ✅ Tester avec un utilisateur en staging
5. ✅ Monitorer les logs de financement
6. ✅ Mettre en production

Voir `backend/FUND_INTEGRATION_EXAMPLE.js` pour exemples complets.
