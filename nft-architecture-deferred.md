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

Aujourd'hui, `_mintContractNFT()` mint un unique NFT envoyé à `contractData.creator`. Un signataire qui n'est pas le créateur n'a donc aucun certificat à lui — il doit consulter la page du contrat ou demander au créateur pour prouver sa participation.

Un contrat impliquant N parties pourrait légitimement minter N certificats identiques (même hash, même métadonnées de contrat), un par adresse signataire, dès la finalisation. Chaque signataire aurait alors la même preuve on-chain que le créateur, dans son propre wallet.

**Ce que ça changerait concrètement :** `_mintContractNFT()` bouclerait sur `_getAllParticipants(contractId)` au lieu de ne minter qu'à `contractData.creator` ; `getNFTProof`/`getContractProof` devraient alors gérer plusieurs `tokenId` par `contractId` au lieu d'un seul. Impact gas proportionnel au nombre de signataires (un mint par partie) — à chiffrer précisément au moment de l'implémentation, avec le même souci d'optimisation que documenté dans `blockchain/GAS-OPTIMIZATION.md`.

**Compatibilité avec la Piste 1 :** les deux sont indépendantes et cumulables — chaque certificat additionnel serait lui aussi soulbound via `locked()`.

## Décision

- **Piste 1 (ERC-5192) : code fait et testé, déploiement reporté à la demande explicite du porteur de projet.** Le prochain redéploiement des contrats (pour cette raison ou une autre) l'embarque automatiquement, sans travail supplémentaire.
- **Piste 2 : rien d'implémenté.** Exige un nouveau déploiement de `ContractManager.sol` en plus de `ContractNFT.sol`, et n'est pas la priorité de cette version.
- **Reprendre la Piste 2 dans une prochaine version des smart contracts**, idéalement au même moment où le déploiement de la Piste 1 sera déclenché.
- Ce document sert de trace explicite : le choix de ne pas encore redéployer, malgré un code ERC-5192 prêt, est **connu et choisi**, pas oublié.

Origine du constat : critique NFT/certificat menée sous les trois casquettes (génie logiciel, juridique, UI/UX) à la demande du porteur de projet, qui a confirmé la lecture du NFT comme « l'identité d'un contrat qui trace son historique sur la blockchain » plutôt que comme un actif spéculatif classique.
