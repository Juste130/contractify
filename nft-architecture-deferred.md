# Architecture des certificats NFT — pistes documentées

**Statut : Piste 1 (ERC-5192) ET Piste 2 (mint multi-signataire) implémentées et testées en code. Déploiement volontairement reporté (redéploiement groupé, pas de date fixe).**

## Constat

Chaque contrat finalisé mint désormais un certificat par participant (voir Piste 2), rendu non-transférable par un `revert` dans `_beforeTokenTransfer` (`ContractNFT.sol`) et signalé comme tel via ERC-5192 (voir Piste 1). Chaque certificat porte le hash du document et un lien vers l'historique du contrat.

Comparé à ce que le grand public entend par « NFT » (un objet collectionnable, transférable, dont la valeur ou l'usage repose sur la rareté et l'échange), l'écart a été jugé volontaire et cohérent avec la fonction réelle de l'objet : **l'identité on-chain d'un contrat, pas un actif spéculatif.** Trois améliorations ont été identifiées pour renforcer cette identité plutôt que la rapprocher du modèle NFT grand public — toutes les trois sont désormais faites : le vocabulaire, la Piste 1, et la Piste 2.

## Déjà fait : le vocabulaire

Commit `fix(ui): renomme "NFT" en "Certificat"...` — `NFTCard.tsx`, `NFTViewer.tsx`, `NFTGallery.tsx` n'affichent plus le terme « NFT ». Le label "Propriétaire" est devenu "Créateur du contrat" à l'époque de ce commit (mint au seul créateur), puis "Titulaire du certificat" une fois la Piste 2 faite (voir plus bas) — chaque signataire a désormais son propre certificat, donc son propre titulaire.

## Piste 1 : ERC-5192 (Minimal Soulbound NFTs) — fait, déploiement en attente

Le contrat bloquait déjà les transferts par un simple `revert`, sans exposer de signal standard permettant à un wallet ou un explorateur (MetaMask, OpenSea, Polygonscan) de savoir *à l'avance* que le token est verrouillé.

[EIP-5192](https://eips.ethereum.org/EIPS/eip-5192) standardise ce signal : `locked(uint256 tokenId) external view returns (bool)` + événement `Locked(uint256 tokenId)` au mint. `ContractNFT.sol` implémente désormais l'interface `IERC5192` (déclarée inline, même pattern que `IContractNFT` dans `ContractManager.sol`) : `locked()` retourne toujours `true`, `Locked(tokenId)` est émis à chaque mint, `supportsInterface()` avertit l'id `0xb45a3c0e`. Le `_beforeTokenTransfer` existant reste le seul mécanisme d'application réel — `locked()` n'est qu'un signal déclaratif standardisé.

## Piste 2 : un certificat par signataire — fait, déploiement en attente

Auparavant, `_mintContractNFT()` mintait un unique NFT envoyé à `contractData.creator`. Un signataire qui n'était pas le créateur n'avait donc aucun certificat à lui.

**Fait :**
- `ContractManager.sol` : nouveau mapping `contractSignerNftTokenId[contractId][signerAddress] → tokenId`, en plus de `ContractData.nftTokenId` qui reste (inchangé dans sa position/type — aucune rupture d'ABI) le tokenId du créateur, pour compatibilité avec tout code déjà écrit contre ce champ.
- `_mintContractNFT()` boucle désormais sur tous les participants et mint un certificat par adresse, tous portant le même hash IPFS et la même liste de signataires en métadonnées.
- `_deactivateAllProofs(contractId)` (remplace l'ancien `_deactivateProof(tokenId)`) désactive le certificat de **chaque** signataire à la résiliation/au litige/à la clôture d'escrow, pas seulement celui du créateur.
- Deux nouvelles fonctions de lecture : `getNFTProofForSigner(contractId, signer)` (le certificat d'une adresse donnée) et `getContractNFTTokenIds(contractId)` (tous les tokenId d'un coup, pour une synchronisation backend en un seul appel plutôt qu'un par signataire).
- `ContractNFT.sol` : l'ancienne contrainte d'unicité par `ipfsHash` (`ipfsHashExists`) a été retirée — elle empêchait structurellement de minter plusieurs certificats pour le même document. La déduplication réelle (un même document ne peut pas devenir deux contrats différents) reste assurée en amont par `ContractManager.ipfsHashUsed`, elle n'a jamais dépendu de ce second verrou redondant.
- Backend (`blockchain-sync.js`) : `syncContract` appelle désormais `getContractNFTTokenIds` et peuple `metadata.signerNftTokenIds` (adresse en minuscule → tokenId), en plus de `metadata.nftTokenId` (créateur, conservé).
- Frontend (`contract-details-page.tsx`) : résout désormais le tokenId du **titulaire connecté** (`signerNftTokenIds[account]`) plutôt que toujours celui du créateur, avec repli sur le tokenId du créateur si l'utilisateur courant n'a pas d'entrée (cache pré-Piste-2, ou visiteur non-signataire). `NFTCard.tsx` : le label "Créateur du contrat" est devenu "Titulaire du certificat", puisque le NFT affiché n'est plus systématiquement celui du créateur.

**Tests** : 2 tests dédiés ajoutés dans `blockchain/test/ContractManager.ts` (mint distinct par signataire + désactivation groupée à la résiliation) ; suite complète toujours verte après ajout.

**Coût gaz** : mint proportionnel au nombre de signataires (un mint par participant au lieu d'un seul) — attendu et documenté, pas mesuré précisément pour l'instant faute de déploiement réel.

## Feuille de route

Les deux pistes sont maintenant du code prêt et testé, dans le même état d'attente : **aucun redéploiement déclenché**, en attente d'un déploiement groupé plutôt que redéployer à chaque amélioration (coût de rupture — tous les contrats actifs sous l'adresse actuelle deviennent inaccessibles depuis l'app, déjà payé une fois lors du redéploiement gas-optimization du 7 septembre).

À regrouper dans ce futur déploiement :
1. **Piste 1 (ERC-5192)** — prêt.
2. **Piste 2 (mint multi-signataire)** — prêt.
3. **Les deux optimisations gaz déjà différées** dans `blockchain/GAS-OPTIMIZATION.md` : réordonnancement de `ContractData` (nécessite de mettre à jour `CONTRACT_MANAGER_ABI` codé à la main dans `blockchain-sync.js` en même temps) et la décision produit sur l'event `Notification` (aujourd'hui n'écouté par rien, backend ou frontend).

**Déclencheur recommandé** : pas de date fixe — un autre besoin produit qui force de toute façon un redéploiement (comme ce fut le cas pour l'optimisation gaz), ou une décision délibérée du porteur de projet.

**Ce qui reste optionnel, indépendant du déploiement** : `NFTGallery.tsx` existe mais n'est câblé sur aucune page ("mes certificats" listant tous les contrats où l'utilisateur est signataire, pas seulement créateur) — un ajout de page possible une fois le déploiement fait, pas un prérequis.

## Décision

- **Piste 1 et Piste 2 : code fait et testé, déploiement groupé reporté à la demande explicite du porteur de projet.**
- Ce document sert de trace explicite : rien n'est oublié, le déploiement est une décision délibérément mise en attente, pas un point mort.

Origine du constat : critique NFT/certificat menée sous les trois casquettes (génie logiciel, juridique, UI/UX) à la demande du porteur de projet, qui a confirmé la lecture du NFT comme « l'identité d'un contrat qui trace son historique sur la blockchain » plutôt que comme un actif spéculatif classique.
