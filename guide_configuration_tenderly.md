# Guide de Configuration et Déploiement Tenderly

Ce document résume les actions effectuées pour intégrer le Virtual Testnet de Tenderly et explique la procédure pour les futurs déploiements.

## 1. Résumé des Actions Effectuées

Nous avons configuré votre projet pour qu'il puisse interagir avec votre blockchain privée virtuelle sur Tenderly.

### A. Configuration de Hardhat (`blockchain/`)
Le fichier `hardhat.config.cts` a été modifié pour :
1.  **Charger les variables d'environnement** depuis le dossier backend (`../backend/.env`) afin de ne pas dupliquer les secrets.
2.  **Ajouter le réseau "tenderly"** avec :
    *   Votre RPC URL (sécurisé via `.env`).
    *   Votre compte administrateur approvisionné (Private Key).
    *   Le Chain ID spécifique à votre Virtual Testnet (`7353137`).
3.  **Gérer le format des clés privées** : Ajout automatique du préfixe `0x` si manquant.

### B. Déploiement des Contrats
Nous avons exécuté le script de déploiement en ciblant ce nouveau réseau.
**Commande utilisée** :
```bash
npx hardhat run scripts/deploy.ts --network tenderly
```

### C. Configuration des Applications
Une fois les contrats déployés, nous avons mis à jour les fichiers de configuration avec les nouvelles adresses :
*   **Backend** (`backend/.env`) : Mise à jour de `CONTRACT_MANAGER_ADDRESS` et `CONTRACT_NFT_ADDRESS`.
*   **Frontend** (`frontend/.env`) : Mise à jour de `NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS` et `NEXT_PUBLIC_CONTRACT_NFT_ADDRESS`.

---

## 2. Quand Redéployer ?

Vous devez redéployer vos contrats (étape 3 ci-dessous) **UNIQUEMENT** dans les cas suivants :

1.  **Modification du Code Solidity** : Si vous modifiez un fichier `.sol` (logique du contrat), vous devez re-compiler et re-déployer pour que les changements prennent effet.
2.  **Changement de Réseau** : Si vous passez du Virtual Testnet à un vrai Testnet (ex: Amoy) ou au Mainnet (Polygon).
3.  **Reset de la Donnée** : Si vous voulez effacer toutes les données de la blockchain et repartir de zéro (tous les contrats précédents seront "perdus" pour l'application).

> [!NOTE]
> Les modifications du code Backend ou Frontend (JS/TS/React) ne nécessitent **PAS** de redéploiement de la blockchain.

---

## 3. Comment Redéployer (Procédure)

Si vous devez redéployer, suivez ces étapes précises :

### Étape 1 : Déployer
Ouvrez un terminal dans le dossier `blockchain` et lancez :

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network tenderly
```

*Note : Si vous changez de réseau, remplacez `tenderly` par le nom du nouveau réseau configuré dans hardhat.config.*

### Étape 2 : Récupérer les Adresses
Le terminal affichera quelque chose comme :
```text
ContractNFT déployé à: 0x123...
ContractManager déployé à: 0x456...
```
Copiez ces deux adresses.

### Étape 3 : Mettre à jour les Environnements

**Dans `backend/.env` :**
Modifiez les lignes suivantes avec les nouvelles valeurs :
```env
CONTRACT_MANAGER_ADDRESS=0x456... (Nouvelle adresse Manager)
CONTRACT_NFT_ADDRESS=0x123... (Nouvelle adresse NFT)
```

**Dans `frontend/.env` :**
Faites de même :
```env
NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS=0x456...
NEXT_PUBLIC_CONTRACT_NFT_ADDRESS=0x123...
```

### Étape 4 : Redémarrer
Pour que les changements soient pris en compte :
1.  Stoppez les serveurs Backend et Frontend (Ctrl+C).
2.  Redémarrez-les (`npm run dev` ou `npm start`).

---

## 4. Financement Automatique (Rappel)

Le financement automatique des nouveaux utilisateurs est géré par le Backend.
*   Il utilise la clé privée définie dans `FUNDER_PRIVATE_KEY` (`backend/.env`).
*   Il se connecte via `POLYGON_RPC_URL` (`backend/.env`).

Tant que votre compte administrateur (celui lié à la clé privée) a des fonds sur Tenderly, les nouveaux inscrits recevront automatiquement des MATIC/ETH de test pour payer leurs frais de gaz.
