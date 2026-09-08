# Architecture des certificats NFT — pistes documentées

**Statut : Piste 1 (ERC-5192) implémentée et testée en code, déploiement volontairement reporté. Piste 2 reste non implémentée, reportée à une prochaine version.**

## Constat

Chaque contrat finalisé mint un NFT ERC-721 unique via `_mintContractNFT()` (`ContractManager.sol`), envoyé au créateur du contrat et rendu non-transférable par un `revert` dans `_beforeTokenTransfer` (`ContractNFT.sol`). Ce NFT sert de certificat de preuve : il porte le hash du document et un lien vers l'historique du contrat.

Comparé à ce que le grand public entend par « NFT » (un objet collectionnable, transférable, dont la valeur ou l'usage repose sur la rareté et l'échange), l'écart a été jugé volontaire et cohérent avec la fonction réelle de l'objet : **l'identité on-chain d'un contrat, pas un actif spéculatif.** Deux améliorations concrètes ont été identifiées pour renforcer cette identité plutôt que la rapprocher du modèle NFT grand public. Le premier point (vocabulaire) et la Piste 1 (ERC-5192) sont faits ; la Piste 2 reste documentée pour une prochaine version.

## Déjà fait : le vocabulaire

Commit `fix(ui): renomme "NFT" en "Certificat"...` — `NFTCard.tsx`, `NFTViewer.tsx`, `NFTGallery.tsx` n'affichent plus le terme « NFT » ni « Propriétaire », remplacés par « Certificat » et « Créateur du contrat ». C'est un correctif d'attente compréhensible, pas une refonte : à l'époque de ce commit, le mint restait au créateur uniquement et aucun signal ERC-5192 n'existait encore.

## Piste 1 : adopter ERC-5192 (Minimal Soulbound NFTs) — fait, déploiement en attente

Le contrat actuel bloque les transferts par un simple `revert`, sans exposer de signal standard permettant à un wallet ou un explorateur (MetaMask, OpenSea, Polygonscan) de savoir *à l'avance* que le token est verrouillé — ils le découvrent seulement en essayant un transfert, ce qui échoue silencieusement ou affiche une erreur générique.

[EIP-5192](https://eips.ethereum.org/EIPS/eip-5192) standardise exactement ce cas : une fonction `locked(uint256 tokenId) external view returns (bool)` et un événement `Locked(uint256 tokenId)` émis au mint. Les wallets et explorateurs qui le reconnaissent affichent alors clairement « non transférable » au lieu de laisser l'utilisateur le découvrir par l'échec.

**Fait :** `ContractNFT.sol` implémente désormais l'interface `IERC5192` (déclarée inline, même pattern que `IContractNFT` dans `ContractManager.sol`) : `locked(uint256)` retourne toujours `true` pour tout token existant, `Locked(tokenId)` est émis juste après le `_mint` dans `mintContractNFT()`, et `supportsInterface()` avertit désormais l'id `0xb45a3c0e` en plus d'ERC721/ERC165. Le `_beforeTokenTransfer` existant reste le seul mécanisme d'application réel — `locked()` n'est qu'un signal déclaratif standardisé. Quatre tests dédiés ajoutés dans `blockchain/test/ContractNFT.ts` ; suite complète (42/42) verte.

**Coût, non encore payé — déploiement volontairement reporté :** `contractNFT` est référencé dans `ContractManager` via une variable d'état fixée une seule fois au constructeur, sans setter — pointer `ContractManager` vers la nouvelle version de `ContractNFT` exige donc de redéployer **les deux contrats ensemble** (comme `deploy.ts` le fait), pas seulement `ContractNFT`. Ce redéploiement rendrait les contrats actuellement actifs sous les adresses en place aujourd'hui inaccessibles depuis l'app, exactement comme lors du redéploiement gas-optimization (voir `blockchain/GAS-OPTIMIZATION.md`). Décision explicite du porteur de projet : le code reste prêt, committé et testé, mais le déploiement se fera à sa demande plus tard plutôt que dans la foulée de l'implémentation.

## Piste 2 : minter un certificat à chaque signataire, pas seulement au créateur

Aujourd'hui, `_mintContractNFT()` mint un unique NFT envoyé à `contractData.creator`. Un signataire qui n'est pas le créateur n'a donc aucun certificat à lui — il doit consulter la page du contrat ou demander au créateur pour prouver sa participation. Architecture actuelle vérifiée : `contracts[contractId].nftTokenId` est un `uint256` **unique**, et les quatre sites qui désactivent une preuve (`_deactivateProof`, appelé depuis `terminateContract`, `openDispute`, `releaseEscrow`, `applyPenalty`) n'en désactivent donc qu'une seule — c'est un vrai changement de modèle de données, pas un ajout mineur.

**Ce que ça changerait concrètement, étape par étape :**
1. `ContractManager.sol` : remplacer `uint256 nftTokenId` par une structure portant plusieurs tokenId par contrat (tableau, ou mapping `contractId → (address signataire → tokenId)` — ce second choix est préférable, il permet une lecture directe "quel est MON certificat pour ce contrat" sans boucler côté client).
2. `_mintContractNFT()` boucle sur `_getAllParticipants(contractId)` au lieu de ne minter qu'à `contractData.creator`, et remplit ce mapping.
3. `_deactivateProof` (les 4 sites d'appel) doit désactiver **toutes** les preuves d'un contrat, pas une seule.
4. Nouvelle fonction de lecture, ex. `getMyNFTProof(contractId, address)`, en plus de (ou à la place de) `getNFTProof(contractId)` qui n'a plus de sens à retourner un seul résultat.
5. Backend (`blockchain-sync.js`) : `metadata.nftTokenId` (aujourd'hui un champ singulier dans le cache) devient une correspondance signataire → tokenId à synchroniser.
6. Frontend (`NFTCard.tsx`, `contract-details-page.tsx`, `NFTGallery.tsx`) : résoudre le tokenId à afficher selon l'utilisateur connecté, et lister dans "mes certificats" tous les contrats où l'utilisateur est signataire — pas seulement ceux qu'il a créés, comme c'est le cas aujourd'hui de fait (un seul NFT existant, toujours celui du créateur).

**Coût :** mint proportionnel au nombre de signataires (jusqu'à N mints au lieu d'1 par finalisation) — à chiffrer précisément à l'implémentation, avec le même souci d'optimisation que documenté dans `blockchain/GAS-OPTIMIZATION.md`. Exige un nouveau déploiement de `ContractManager.sol` (pas seulement `ContractNFT.sol`, puisque le mapping tokenId vit dans `ContractManager`).

**Compatibilité avec la Piste 1 :** les deux sont indépendantes et cumulables — chaque certificat additionnel serait lui aussi soulbound via `locked()`.

## Feuille de route recommandée

Recommandation (génie logiciel + produit) : **ne pas redéployer pour la seule Piste 1.** Un redéploiement rend tous les contrats actifs sous l'adresse actuelle inaccessibles depuis l'app (déjà payé une fois pour le passage gas-optimization du 7 septembre) — payer ce coût de rupture une deuxième fois pour un signal qu'aucun utilisateur n'exploite encore concrètement (personne n'inspecte aujourd'hui ces certificats depuis un wallet externe) n'a pas de retour proportionné à l'interruption causée.

À la place, **regrouper dans un seul redéploiement futur** tout ce qui attend déjà un nouveau déploiement des contrats :
1. **Piste 1 (ERC-5192)** — code prêt, testé, embarqué automatiquement dès que ce déploiement a lieu, sans travail supplémentaire.
2. **Piste 2 (mint multi-signataire)** — à implémenter d'ici là si la priorité produit le justifie (voir étapes ci-dessus).
3. **Les deux optimisations gaz déjà différées** dans `blockchain/GAS-OPTIMIZATION.md` : réordonnancement de `ContractData` (nécessite de mettre à jour `CONTRACT_MANAGER_ABI` codé à la main dans `blockchain-sync.js` en même temps) et la décision produit sur l'event `Notification` (aujourd'hui n'écouté par rien, backend ou frontend).

**Déclencheur recommandé** : pas de date fixe — attendre soit que la Piste 2 soit prête, soit qu'un autre besoin produit force de toute façon un redéploiement (comme ce fut le cas pour l'optimisation gaz). Regrouper plutôt que redéployer à chaque petite amélioration limite le nombre de fois où les contrats actifs deviennent inaccessibles.

**Ce qui peut avancer sans attendre le déploiement :** rien côté UI n'est réellement actionnable avant — `locked()` n'existe pas encore sur le contrat actuellement en place, donc un badge "Non transférable" dans `NFTCard.tsx` interrogerait une fonction absente. Ce travail frontend, bien que petit, doit lui aussi attendre le déploiement groupé ci-dessus plutôt que d'être fait en avance et laissé mort.

## Décision

- **Piste 1 (ERC-5192) : code fait et testé, déploiement reporté à la demande explicite du porteur de projet**, à inclure dans le prochain redéploiement groupé plutôt que déclenché seul.
- **Piste 2 : rien d'implémenté.** Étapes techniques détaillées ci-dessus, à faire avant ou pendant la préparation du prochain redéploiement groupé.
- Ce document sert de trace explicite et de feuille de route : le choix de ne pas encore redéployer, malgré un code ERC-5192 prêt, est **connu et choisi**, pas oublié — et la prochaine étape n'est pas "redéployer maintenant" mais "regrouper, puis redéployer une seule fois".

Origine du constat : critique NFT/certificat menée sous les trois casquettes (génie logiciel, juridique, UI/UX) à la demande du porteur de projet, qui a confirmé la lecture du NFT comme « l'identité d'un contrat qui trace son historique sur la blockchain » plutôt que comme un actif spéculatif classique.
