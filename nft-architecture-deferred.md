# Architecture des certificats NFT — pistes documentées, non implémentées

**Statut : pistes identifiées et argumentées, aucune reportée à une prochaine version. Rien à faire dans l'immédiat au-delà du renommage déjà appliqué.**

## Constat

Chaque contrat finalisé mint un NFT ERC-721 unique via `_mintContractNFT()` (`ContractManager.sol`), envoyé au créateur du contrat et rendu non-transférable par un `revert` dans `_beforeTokenTransfer` (`ContractNFT.sol`). Ce NFT sert de certificat de preuve : il porte le hash du document et un lien vers l'historique du contrat.

Comparé à ce que le grand public entend par « NFT » (un objet collectionnable, transférable, dont la valeur ou l'usage repose sur la rareté et l'échange), l'écart a été jugé volontaire et cohérent avec la fonction réelle de l'objet : **l'identité on-chain d'un contrat, pas un actif spéculatif.** Deux améliorations concrètes ont été identifiées pour renforcer cette identité plutôt que la rapprocher du modèle NFT grand public. Le premier point — un problème de vocabulaire pur — a déjà été corrigé (voir plus bas). Les deux suivants touchent l'architecture on-chain et sont documentés ici pour une prochaine version.

## Déjà fait : le vocabulaire

Commit `fix(ui): renomme "NFT" en "Certificat"...` — `NFTCard.tsx`, `NFTViewer.tsx`, `NFTGallery.tsx` n'affichent plus le terme « NFT » ni « Propriétaire », remplacés par « Certificat » et « Créateur du contrat ». Aucune logique on-chain n'a changé : le mint reste au créateur uniquement, l'objet reste non-transférable, aucun signal ERC-5192 n'existe encore. C'est un correctif d'attente compréhensible, pas une refonte.

## Piste 1 : adopter ERC-5192 (Minimal Soulbound NFTs)

Le contrat actuel bloque les transferts par un simple `revert`, sans exposer de signal standard permettant à un wallet ou un explorateur (MetaMask, OpenSea, Polygonscan) de savoir *à l'avance* que le token est verrouillé — ils le découvrent seulement en essayant un transfert, ce qui échoue silencieusement ou affiche une erreur générique.

[EIP-5192](https://eips.ethereum.org/EIPS/eip-5192) standardise exactement ce cas : une fonction `locked(uint256 tokenId) external view returns (bool)` et un événement `Locked(uint256 tokenId)` émis au mint. Les wallets et explorateurs qui le reconnaissent affichent alors clairement « non transférable » au lieu de laisser l'utilisateur le découvrir par l'échec.

**Ce que ça change concrètement :** `ContractNFT.sol` implémenterait l'interface `IERC5192`, ajouterait `locked()` (retourne toujours `true` pour tout token minté par ce contrat) et émettrait `Locked(tokenId)` juste après le `_mint` existant dans `_mintContractNFT()`. Le `_beforeTokenTransfer` actuel resterait en place comme garde-fou réel — `locked()` est un signal déclaratif, pas un mécanisme d'application.

**Coût :** modification de contrat, donc un nouveau déploiement (le contrat est déjà passé par un redéploiement cette version, voir `blockchain/GAS-OPTIMIZATION.md`) — pas un simple paramètre.

## Piste 2 : minter un certificat à chaque signataire, pas seulement au créateur

Aujourd'hui, `_mintContractNFT()` mint un unique NFT envoyé à `contractData.creator`. Un signataire qui n'est pas le créateur n'a donc aucun certificat à lui — il doit consulter la page du contrat ou demander au créateur pour prouver sa participation.

Un contrat impliquant N parties pourrait légitimement minter N certificats identiques (même hash, même métadonnées de contrat), un par adresse signataire, dès la finalisation. Chaque signataire aurait alors la même preuve on-chain que le créateur, dans son propre wallet.

**Ce que ça changerait concrètement :** `_mintContractNFT()` bouclerait sur `_getAllParticipants(contractId)` au lieu de ne minter qu'à `contractData.creator` ; `getNFTProof`/`getContractProof` devraient alors gérer plusieurs `tokenId` par `contractId` au lieu d'un seul. Impact gas proportionnel au nombre de signataires (un mint par partie) — à chiffrer précisément au moment de l'implémentation, avec le même souci d'optimisation que documenté dans `blockchain/GAS-OPTIMIZATION.md`.

**Compatibilité avec la Piste 1 :** les deux sont indépendantes et cumulables — chaque certificat additionnel serait lui aussi soulbound via `locked()`.

## Décision

- **Ne rien implémenter maintenant.** Les deux pistes exigent un nouveau déploiement de `ContractNFT.sol` (et pour la Piste 2, de `ContractManager.sol`), et ne sont pas la priorité de cette version.
- **Reprendre ce sujet dans une prochaine version des smart contracts**, idéalement en même temps si un redéploiement est de toute façon nécessaire pour une autre raison (comme ce fut le cas cette version).
- Ce document sert de trace explicite : le choix de conserver le mint unique au créateur et l'absence de signal ERC-5192 aujourd'hui est **connu et choisi pour cette version**, pas oublié.

Origine du constat : critique NFT/certificat menée sous les trois casquettes (génie logiciel, juridique, UI/UX) à la demande du porteur de projet, qui a confirmé la lecture du NFT comme « l'identité d'un contrat qui trace son historique sur la blockchain » plutôt que comme un actif spéculatif classique.
