# Audit complet Contractify — branche `justedev` (v4)

Angle : sécurité + qualité de code, de bout en bout (backend, smart contracts, frontend). Dernier commit audité : `56e5a3f` ("Correction du bug de login (CORS/Helmet) et de la securite des smart contracts (audit parties 1 et 2)").

Méthode : audit en lecture seule, aucune modification. Vérification réelle des correctifs annoncés par les commits `1bf0180` et `56e5a3f` (pas de confiance aveugle dans les messages de commit) — compilation, exécution des tests, `npm audit`, lecture du code source actuel.

---

## 🟢 Correctifs de l'audit v3 confirmés comme réellement en place

| Point (v3) | Statut |
|---|---|
| CORS/Helmet (bug de login) | ✅ `crossOriginResourcePolicy: cross-origin` + `allowedHeaders`/`methods` explicites dans `server.js` |
| `nonReentrant` sur depositEscrow/releaseEscrow/applyPenalty | ✅ présent, bien placé (état modifié avant le `.call`) |
| Modèle `escrowPayer` (seul le déposant libère/pénalise) | ✅ implémenté, non contournable (`msg.sender` authentifié) |
| Comptage réel des pausers (`_authorizedPauserCount`) | ✅ incrémenté/décrémenté correctement |
| Boucles non bornées (pause d'urgence) | ✅ supprimées |
| `optimizer.runs` 10 → 200 | ✅ confirmé dans `hardhat.config.cts` |
| Compilation + tests blockchain | ✅ `hardhat compile` OK, **28/28 tests passent** (exécuté réellement) |
| Sidebar mobile 0px (§3.1) | ✅ via `matchMedia`, fonctionnel |
| Doublon sidebar (§3.2) | ✅ `layout/sidebar.tsx` supprimé |
| `aria-label` boutons icônes (§3.3) | ✅ confirmé, recherche exhaustive faite |
| `templates-page.tsx` responsive (§3.4) | ✅ confirmé |
| `fileFilter` MIME upload IPFS (§4.1) | ✅ restreint à `application/pdf` |
| Next.js CVE-2025-66478 (§4.2) | ✅ mis à jour |
| `tls.rejectUnauthorized:false` retiré | ✅ absent de `email.js` |
| Token d'auth stocké en cookie httpOnly | ✅ pas de JWT en `localStorage` |
| Aucun secret committé (repo entier) | ✅ vérifié par grep ciblé |
| `providers.tsx` fallback sans Privy | ✅ arbre complet (Web3Provider/SidebarProvider/ProtectedRoute) présent |

C'est un vrai travail de correction, vérifié dans le code réel et pas seulement déclaré. La suite couvre ce qui reste — dont un point critique nouveau et sérieux côté backend.

---

## 🔴 Critique

### 1. Prise de contrôle de compte (y compris ADMIN) via l'email non vérifié du flux Privy
`backend/controllers/auth.js` + `backend/services/auth.js`

```js
const { email, walletAddress, profileData } = req.body;   // email vient du BODY client
const privyId = req.privyUser?.userId;                     // seul privyId est authentifié par le token
```

Le middleware `verifyPrivyToken` authentifie uniquement le `userId` Privy de l'appelant — il ne fournit **aucun email vérifié**. Le champ `email` reste entièrement contrôlé par le client dans `POST /api/auth/privy`, alors que la logique de `services/auth.js` retrouve un utilisateur existant **par cet email** quand `privyId` ne matche rien :

```js
const existingUser = await prisma.user.findUnique({ where: { email } }); // email attaquant
if (existingUser) {
    user = await prisma.user.update({ where: { id: existingUser.id }, data: updateData });
```

Le JWT applicatif renvoyé en fin de fonction est signé pour l'identité de `user` — c'est-à-dire potentiellement l'identité de la victime dont l'attaquant a simplement renseigné l'email.

**Scénarios d'impact concrets :**
- Tout signataire de contrat existe déjà en base (`ContractSignatory.email`) sans compte `User` lié. Un attaquant s'inscrit avec cet email pour "réclamer" l'identité avant la vraie personne (récupère ses brouillons de contrats en attente, lie son propre wallet).
- Si `ADMIN_EMAILS` whitelist un email connu (ex. `admin@contractify.io`), un attaquant s'authentifie avec son propre token Privy valide et `email: "admin@contractify.io"` dans le body → `isAdminEmail` retourne `true` → **un compte ADMIN est créé/promu pour l'attaquant**, avec son propre wallet lié dessus.

➡️ Récupérer l'email depuis Privy **côté serveur** (`client.getUser(userId)` ou équivalent), jamais depuis `req.body`. À défaut, vérifier explicitement qu'un compte trouvé par email n'est pas déjà lié à un `privyId` différent avant toute association.

### 2. `terminateContract` verrouille définitivement les fonds d'escrow
`blockchain/contracts/ContractManager.sol` (fonction `terminateContract`, vs `releaseEscrow` L597 et `applyPenalty` L618)

`terminateContract` ne vérifie jamais `isEscrowDeposited` avant de passer le statut à `Terminated`. Or `releaseEscrow` exige `status == Active` et `applyPenalty` exige `Active`/`Disputed` — aucun des deux n'accepte `Terminated`, et il n'existe **aucune fonction de secours** (pas de retrait owner/admin). N'importe quel participant (`onlyParticipant`, pas seulement le créateur) peut résilier un contrat actif avec escrow déposé et bloquer les fonds dans le contrat de façon permanente.

➡️ Interdire `terminateContract` tant que `isEscrowDeposited == true` (forcer un `releaseEscrow`/`applyPenalty` avant), ou ajouter un mécanisme de retrait de secours pour ce cas précis.

### 3. Couverture de test nulle sur les fonctions d'escrow, malgré le refactor de sécurité qui vient d'y être fait
`blockchain/test/ContractManager.ts` — `depositEscrow`/`releaseEscrow`/`applyPenalty` : **0 occurrence** dans les tests (vérifié par grep). Les "28/28 tests passent" ne couvrent donc pas du tout la zone où `nonReentrant` et le nouveau modèle `escrowPayer` viennent d'être introduits. La confiance donnée par le nombre de tests verts est trompeuse sur ce point précis.

➡️ Ajouter des tests dédiés : dépôt/libération/pénalité par le bon payeur, rejet si appelé par quelqu'un d'autre, tentative de réentrance simulée.

---

## 🟠 Important

### Backend
- **`backend/middleware/fund-check.js`** référence `require('../services/fund-on-demand')`, fichier inexistant. Mort et jamais monté sur une route actuellement (donc pas de crash), mais piège actif pour la prochaine utilisation. Le design est en plus dangereux tel quel : `amount` peut venir de `req.body`/`req.query` (contrôlé par le client) pour financer depuis un wallet financeur (`FUNDER_PRIVATE_KEY`), sans plafond serveur. ➡️ Supprimer ce middleware mort ou créer le service manquant avec un montant strictement plafonné côté serveur.
- **Pas de rate limiter dédié sur `POST /api/auth/privy`** — seulement le `generalLimiter` global (100 req/min). Compte tenu du point critique n°1, un rate limiting spécifique sur cet endpoint réduirait la surface d'attaque par essais successifs d'emails.
- **`npm audit` (backend)** : `tar` critique (connu, laissé de côté volontairement pour raison documentée — compatibilité `bcrypt`/`node-pre-gyp`, à surveiller) ; `ws` sévérité haute (memory disclosure + DoS) via `ethers`/`viem`, non mentionné dans l'audit précédent ; `qs`/`uuid` modérés via le SDK Privy — dépendances tierces, pas de correctif direct sans attendre une mise à jour amont.
- **Contrôle d'accès incohérent** entre `getDraftDetails` (créateur/signataire par email/admin) et `getContractDetails` post-déploiement (créateur/signataire par wallet/admin) — deux logiques différentes pour une même famille de ressource, risque d'oubli lors d'un futur changement.
- **`Document.uploadedBy` nullable** (`prisma/schema.prisma`) — si `null`, la comparaison de propriétaire échoue toujours (faux négatif) même pour le vrai propriétaire, sauf admin.

### Smart contracts
- **Trou de réentrance CEI dans `_finalizeContract`** : l'appel externe `contractNFT.mintContractNFT(...)` (via `ERC721._safeMint`, qui invoque `onERC721Received` si le destinataire est un contrat) a lieu **avant** `contractData.status = Active`. Ni `createContract` ni `signContract` n'ont `nonReentrant`. Pas de vol de fonds concret identifié (l'escrow exige `Active`, pas encore atteint à ce stade), mais c'est la classe de bug ("NFT reentrancy via safeMint hook") responsable de pertes réelles ailleurs, et ça contredit le soin apporté par ailleurs au pattern CEI sur l'escrow. ➡️ Basculer `status`/`nftTokenId`/`effectiveDate` avant l'appel externe, ou ajouter `nonReentrant` à `createContract`/`signContract`.
- **`applyPenalty` ne remet jamais `status` à jour** après distribution des fonds — un contrat `Disputed` reste `Disputed` indéfiniment (pas de perte de fonds, mais statut figé, redépôt d'escrow impossible ensuite).
- **Troncature silencieuse `uint88(payment.amount)`** (releaseEscrow/applyPenalty/updatePaymentStatus) — `addPayment` accepte un `uint256` sans borne haute ; le cast vers `uint88` tronque silencieusement (pas de revert) au-delà de `type(uint88).max`, corrompant `releasedAmount`. Impact limité (champ informatif à ce stade) mais à corriger par cohérence.

### Frontend
- **`npm audit --production`** : 30 vulnérabilités (6 high, 24 moderate), toutes transitives via `@privy-io/react-auth` → `wagmi`/`ws`/`x402`/`viem`. Le correctif (`@privy-io/react-auth@3.6.1`) est un bump semver-major non appliqué. Le plus sérieux : `ws` memory exhaustion DoS (CVSS 7.5).
- **`components/providers.tsx`** (distinct de `app/providers.tsx`) est un doublon totalement mort, jamais importé, sans `PrivyProvider` ni `AuthInitializer`. Même pattern que le doublon sidebar déjà nettoyé — s'il était un jour branché par erreur, l'auth casserait silencieusement.

---

## 🟡 Mineur

- **`backend/controllers/user.js`** — `updateUserRole` n'empêche ni l'auto-rétrogradation d'un admin, ni de passer le dernier compte ADMIN en USER (pas de garde-fou "au moins un admin restant"). Risque d'auto-lockout administratif.
- **`backend/middleware/error-handler.js`** — matching par sous-chaîne du message d'erreur (`includes('not found')`, `'Invalid'`, `'already exists'`) pour déterminer le status HTTP des erreurs non typées. Un message Prisma/tiers contenant accidentellement un de ces mots renverrait un code trompeur.
- **`blockchain`** — `renounceOwnership()` d'`Ownable` non surchargé : un appel accidentel/malveillant fige `owner()` à `address(0)`, rendant `setEmergencyAdmin`/`addAuthorizedPauser`/`revokePauser` définitivement inutilisables.
- **`blockchain`** — le check de propriété de `ContractNFT` dans le constructeur de `ContractManager` est trop permissif (`msg.sender == contractNFT.owner()` passe même sans transfert d'ownership réel), faux sentiment de sécurité au déploiement.
- **`frontend`** — `components/ui/sidebar.tsx` (21 Ko, primitive shadcn) totalement mort, zéro import dans `src/`. Dette résiduelle, pas un bug.
- **`frontend`** — léger FOUC possible sur mobile au hard-refresh : `isMobile` initialisé à `false` avant correction par `useEffect`, donc `var(--sidebar-width, 256px)` s'applique un instant avant la correction à `0px`.
- **`frontend`** — `chart.tsx` utilise `dangerouslySetInnerHTML` pour générer des variables CSS depuis une config interne (pas de contenu utilisateur actuellement) — à garder sous surveillance si la config venait un jour de l'API.
- **`backend`** — TODO non implémenté (`services/auth.js`) : email au créateur pour déployer un contrat prêt.

---

## 📋 Plan d'action priorisé

### Priorité 1 — Faille de contrôle d'accès (à traiter avant toute mise en production)
- [ ] Récupérer l'email depuis Privy côté serveur au lieu de `req.body.email` dans le flux `POST /api/auth/privy` (finding #1) — c'est le point le plus grave de cet audit, permet une prise de compte admin
- [ ] Ajouter un rate limiter dédié sur `/api/auth/privy`

### Priorité 2 — Fonds bloqués et couverture de test smart contracts (avant tout déploiement gérant de vrais fonds)
- [ ] Bloquer `terminateContract` si `isEscrowDeposited == true`, ou prévoir un retrait de secours (finding #2)
- [ ] Ajouter des tests sur `depositEscrow`/`releaseEscrow`/`applyPenalty` (finding #3)
- [ ] Traiter le trou de réentrance CEI dans `_finalizeContract` (mint NFT avant mise à jour du statut)
- [ ] Corriger `applyPenalty` pour mettre à jour `status` après distribution

### Priorité 3 — Durcissement backend
- [ ] Supprimer le middleware mort `fund-check.js` ou implémenter le service manquant avec plafond serveur
- [ ] Unifier la logique de contrôle d'accès entre `getDraftDetails` et `getContractDetails`
- [ ] Ajouter un garde-fou "au moins un admin restant" dans `updateUserRole`

### Priorité 4 — Dépendances
- [ ] Évaluer la mise à jour de la chaîne `@privy-io/react-auth`/`wagmi`/`viem` (frontend et backend) pour corriger `ws` (high)
- [ ] Continuer à surveiller `tar` (critique, bloqué par compat `bcrypt`)

### Priorité 5 — Nettoyage mineur
- [ ] Supprimer les deux fichiers frontend morts : `components/ui/sidebar.tsx`, `components/providers.tsx`
- [ ] Corriger la troncature silencieuse `uint88` par une vérification explicite dans `addPayment`
- [ ] Surcharger `renounceOwnership()` pour l'interdire ou la restreindre

---

## Verdict

Les corrections des audits précédents (v3, parties 1 à 5) sont réelles — vérifiées en lisant le code actuel et en exécutant compilation/tests, pas seulement sur la foi des messages de commit. Cette passe révèle cependant un **point critique nouveau et sérieux** : le flux d'authentification Privy fait confiance à un champ `email` non vérifié envoyé par le client, ce qui ouvre la voie à une prise de compte — y compris administrateur — sans avoir besoin d'exploiter quoi que ce soit côté blockchain. Côté smart contracts, le travail de sécurisation de l'escrow (réentrance, modèle de confiance) est solide sur le papier mais n'est couvert par aucun test, et un chemin de sortie (`terminateContract`) a été oublié et peut verrouiller des fonds de façon permanente. Le frontend, en comparaison, est propre : tous les correctifs UI/UX précédents sont réellement en place, rien de critique de neuf.
