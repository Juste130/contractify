# Audit complet Contractify — branche `justedev` (v3)

Angle : génie logiciel + UI/UX, de bout en bout (frontend, backend, smart contracts). Dernier commit audité : `9663166` ("Correction partielle du bug sur le login").

Méthode inchangée : lecture de tout le code + vérifications réelles (build, install, historique git) plutôt que suppositions.

---

## 🟢 Progrès depuis le dernier audit — à saluer

| Point | État |
|---|---|
| Build cassé (jspdf, Biconomy, date-fns) | ✅ Résolu, `npm install` et `npm run build` passent sans `--legacy-peer-deps` |
| Boucle infinie login ↔ dashboard | ✅ Résolu, les 3 correctifs sont en place et corrects |
| Fichiers vides / code mort | ✅ 11 des 15 fichiers vides remplis ou supprimés |
| Deux lockfiles (npm + bun) | ✅ Résolu pour `frontend` et `backend` (bun.lock supprimé) |
| Migrations Prisma non versionnées | ✅ Résolu, 3 migrations trackées dans git |
| Absence de CI | ✅ `.github/workflows/ci.yml` ajouté (build+lint sur push/PR) |

C'est un vrai nettoyage, pas cosmétique. La suite de ce rapport couvre ce qui reste, avec une vérification approfondie du bug de login que tu signales toujours.

---

## 🔴 Partie 1 — Le bug de login ("Network Error") — vérification réelle

Tu as raison, ce n'est pas encore réglé — mais **ce n'est plus la boucle infinie** (celle-là est bien corrigée). C'est un bug différent, plus simple à isoler : `Network Error` en axios signifie que le navigateur n'a reçu **aucune réponse HTTP**, ni succès ni erreur.

**Cause la plus probable, avec preuve dans le code** (`backend/server.js`) :
```js
app.use(helmet());          // ← appliqué AVANT cors()
app.use(cookieParser());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));                          // ← pas de allowedHeaders explicite
```
`POST /api/auth/privy` est le **seul** appel de toute l'app qui envoie un header `Authorization: Bearer <token>` personnalisé (`frontend/src/lib/api/auth.ts`, fonction `privyAuth`). Un header custom force le navigateur à faire une requête *preflight* `OPTIONS` avant d'envoyer la vraie requête. La politique `Cross-Origin-Resource-Policy: same-origin` que Helmet active par défaut, combinée à l'absence de `allowedHeaders` explicite dans la config CORS, est un cas connu de blocage silencieux de ce type de requête cross-origin (`localhost:3000` → `localhost:5000` = deux origines différentes). Toutes les autres routes (cookies simples, pas de header custom) ne déclenchent pas de preflight et passent — ce qui explique pourquoi **seul** `privyAuth` échoue, dans les deux flux (connexion manuelle et auto-sync), exactement comme dans tes deux stack traces.

**Correctif, dans `backend/server.js` :**
```js
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cookieParser());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));
```

**Pour confirmer avant de patcher** : DevTools → Network → reproduis l'erreur → clique sur la requête `privy` en échec. Si la Console affiche un message avec *"CORS policy"* ou *"Cross-Origin-Resource-Policy"*, c'est confirmé. Si la requête n'apparaît même pas dans Network, vérifie que le backend tournait bien à cet instant précis (`nodemon` en cours de redémarrage, par exemple).

---

## 🔴 Partie 2 — Sécurité des smart contracts (jamais audités jusqu'ici)

C'est la partie la plus critique du projet : ce code gère de vrais fonds (dépôt/libération d'escrow en cryptomonnaie). J'ai trouvé plusieurs problèmes réels dans `blockchain/contracts/ContractManager.sol`.

### 2.1 `ReentrancyGuard` importé et hérité, mais jamais utilisé
```solidity
contract ContractManager is Ownable, ReentrancyGuard {
```
Le contrat hérite de `ReentrancyGuard`, mais **`nonReentrant` n'apparaît nulle part dans tout le fichier** (vérifié par recherche exhaustive). Or `releaseEscrow()` et `applyPenalty()` (lignes 595 et 617) font des transferts de fonds via des appels bas niveau :
```solidity
(bool success, ) = payable(contractData.creator).call{value: amountToRelease}("");
```
C'est exactement le pattern qui rend un contrat vulnérable à la réentrance. Le code respecte heureusement l'ordre *checks-effects-interactions* pour la réentrance directe dans la même fonction (le flag `isEscrowDeposited` est mis à `false` avant l'appel externe), mais `applyPenalty()` fait **deux appels externes successifs** dans la même transaction, ce qui laisse une fenêtre pour de la réentrance croisée vers d'autres fonctions du contrat pendant l'exécution du premier `.call`.
➡️ Ajouter `nonReentrant` sur `releaseEscrow`, `applyPenalty`, et `depositEscrow` (bonne pratique standard dès qu'il y a `.call{value: ...}`, même si le risque direct est partiellement mitigé ici).

### 2.2 `addAuthorizedPauser` : la limite de sécurité "max 3 pausers" ne fait rien
```solidity
function addAuthorizedPauser(address pauser) external onlyOwner {
    ...
    uint8 currentPauserCount = 0;
    // ... comptage des pausers existants
    require(currentPauserCount < MAX_PAUSERS, "Maximum pausers reached");
    authorizedPausers[pauser] = true;
```
Le commentaire dit "comptage des pausers existants", mais **il n'y a aucun code de comptage** — `currentPauserCount` reste toujours à `0`, donc `require(0 < 3)` est toujours vrai. La limite de 3 pausers maximum, présentée comme une protection de sécurité (`MAX_PAUSERS`), **n'est pas appliquée du tout**. Un nombre illimité d'adresses peut être autorisé à mettre le système en pause.
➡️ Implémenter le vrai comptage (ex. maintenir un `pauserCount` en state, incrémenté/décrémenté dans `addAuthorizedPauser`/`revokePauser`) plutôt que de recalculer un total à chaque appel avec une variable qui ne bouge jamais.

### 2.3 Boucles non bornées sur `_contractIds` — risque de déni de service par limite de gas
```solidity
for (uint256 cid = 1; cid <= _contractIds; cid++) {
    if (contracts[cid].status == ContractStatus.Active) { ... }
}
```
Ce pattern apparaît dans `emergencyPause`, `resumeContract`, `forceResume`, `setEmergencyAdmin`, `revokePauser`. Ces fonctions itèrent sur **tous les contrats jamais créés**, sans limite. Sur une blockchain, chaque opération dans la boucle coûte du gas ; au-delà d'un certain nombre de contrats total dans le système, ces fonctions dépasseront la limite de gas d'un bloc et deviendront **définitivement impossibles à exécuter**. Le pire cas : si le système est mis en pause d'urgence (`emergencyPause`) après que ce seuil soit atteint, `resumeContract` (qui a la même boucle) pourrait devenir **impossible à appeler**, bloquant tout le système en pause pour toujours (seul `forceResume`, utilisable après 30 jours, resterait — mais lui aussi contient la même boucle non bornée pour les notifications).
➡️ Ne pas boucler sur l'intégralité de l'historique pour une action d'urgence. Soit retirer la notification best-effort de ces fonctions (le statut `paused` global suffit, il est lisible par tous sans boucle), soit passer par un système de pagination/batch pour les notifications.

### 2.4 Modèle de confiance faible sur `releaseEscrow`
```solidity
function releaseEscrow(uint256 contractId) external whenNotPaused ... onlyParticipant(contractId) {
    ...
    require(msg.sender != contractData.creator, "Creator cannot release to self");
    // Simple trust-based release: whoever calls this function authorizes the release to the creator
```
Le commentaire l'assume lui-même : **n'importe quel participant du contrat (pas forcément la contrepartie qui doit les fonds) peut, seul, libérer la totalité de l'escrow vers le créateur**, sans consentement mutuel ni vérification d'exécution des obligations. Si un contrat a plusieurs signataires avec des rôles différents (`Witness`, `LegalRepresentative`...), n'importe lequel d'entre eux peut déclencher le transfert de fonds — c'est un problème de logique métier autant que de sécurité pour un produit qui vend justement la fiabilité contractuelle.
➡️ À minima, restreindre à la contrepartie explicitement désignée (pas "n'importe quel participant"), ou introduire un mécanisme à seuil (ex. majorité des signataires) pour la libération de fonds.

### 2.5 `optimizer.runs: 10` dans `hardhat.config.cts`
```ts
optimizer: { enabled: true, runs: 10 }
```
Une valeur aussi basse optimise pour un coût de déploiement minimal, au prix d'un coût d'exécution (gas) plus élevé à **chaque appel** de fonction. Pour un contrat destiné à être appelé fréquemment (signatures, paiements, litiges) plutôt que déployé souvent, la valeur standard recommandée est `200`, voire plus haut (1000-10000) selon la fréquence d'usage réelle attendue.

---

## 🟠 Partie 3 — UI/UX (angle expert produit)

### 3.1 Bug mobile majeur : la marge du sidebar reste fixe même quand le sidebar est masqué
`components/layout/sidebar-width-handler.tsx` :
```tsx
useEffect(() => {
    document.documentElement.style.setProperty(
        '--sidebar-width',
        isCollapsed ? '80px' : '256px'
    );
}, [isCollapsed]);
```
Cette variable CSS ne connaît que deux états — "réduit" (80px) et "étendu" (256px) — **jamais "masqué sur mobile" (0px)**. Or 11 pages sur 15 (tout le dashboard, contrats, paramètres, admin...) utilisent cette variable directement en style inline :
```tsx
style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}
```
Sur un écran de téléphone (~375-414px de large), ça réserve en permanence 80 à 256px de marge gauche vide pour un sidebar qui, lui, se cache bien via un système de drawer séparé (`components/layout/sidebar.tsx`, classes `lg:hidden`). Concrètement : **jusqu'à 68% de la largeur de l'écran est perdue en marge vide sur mobile**, sur la quasi-totalité de l'application connectée. C'est le bug UI le plus impactant que j'ai trouvé dans ce projet.

➡️ Il existe déjà tout ce qu'il faut pour corriger ça : le hook `useIsMobile()` (`components/ui/use-mobile.tsx`) est déjà utilisé dans l'autre système de sidebar (`components/ui/sidebar.tsx`). Il suffit de l'utiliser dans `SidebarWidthHandler` :
```tsx
import { useIsMobile } from '@/components/ui/use-mobile';

export function SidebarWidthHandler({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();
    const isMobile = useIsMobile();

    useEffect(() => {
        document.documentElement.style.setProperty(
            '--sidebar-width',
            isMobile ? '0px' : (isCollapsed ? '80px' : '256px')
        );
    }, [isCollapsed, isMobile]);

    return <>{children}</>;
}
```

### 3.2 Deux systèmes de sidebar en parallèle
Le projet contient à la fois `components/ui/sidebar.tsx` (primitive shadcn complète, avec gestion mobile propre via `useIsMobile`, contexte dédié, drawer intégré) **et** `components/layout/sidebar.tsx` + `sidebar-context.tsx` + `sidebar-width-handler.tsx` (implémentation custom, qui est celle réellement utilisée par les pages). Le premier système semble être resté d'une itération précédente (probablement issu d'un template shadcn de départ) sans être retiré. Ça complique la maintenance — un nouveau dev pourrait légitimement modifier le mauvais des deux en pensant corriger le sidebar de l'app.
➡️ Retirer `components/ui/sidebar.tsx` s'il n'est effectivement plus utilisé (à vérifier avant suppression), ou migrer vers ce système-là qui gère déjà correctement le cas mobile, plutôt que de maintenir deux implémentations.

### 3.3 Boutons icône sans `aria-label`
Dans `components/ui/ai-input.tsx`, au moins deux boutons icon-only (annuler/undo, envoyer) n'ont ni `aria-label` ni `title` — invisibles pour un lecteur d'écran. Comparer avec `components/ui/sidebar.tsx` qui, lui, a bien `aria-label="Toggle Sidebar"` sur son trigger — l'app sait faire, ce n'est pas systématique.
➡️ Ajouter `aria-label` sur tout bouton dont le seul contenu visuel est une icône.

### 3.4 3 pages sans la moindre classe responsive
`login-page.tsx`, `signup-page.tsx` (probablement acceptable, ce sont des cartes centrées simples) et surtout `templates-page.tsx`, qui affiche une grille de templates sans aucun breakpoint `sm:`/`md:`/`lg:` — en plus d'hériter du bug de marge fixe du §3.1, la page n'a par ailleurs aucune adaptation de mise en page pour petit écran.

---

## 🟡 Partie 4 — Sécurité backend (nouveaux points)

### 4.1 Upload de fichiers IPFS sans validation de type MIME
`backend/routes/ipfs.js` limite la taille (`fileSize: 10MB`) mais ne définit **aucun `fileFilter`** — n'importe quel type de fichier peut être uploadé (exécutable, script, HTML...) et ressort ensuite via `ipfsService.getPublicUrl(cid)`. Risque modéré : si un fichier HTML malveillant uploadé est un jour ouvert directement depuis la passerelle IPFS (plutôt que téléchargé), ça peut permettre du XSS stocké côté gateway.
➡️ Ajouter un `fileFilter` restreignant aux types de documents attendus (PDF, DOCX, images) dans la config multer.

### 4.2 CVE connue sur Next.js 15.5.3
`npm install` remonte un avertissement de sécurité sur la version actuelle de Next.js (CVE-2025-66478). À corriger via `npm audit fix` ou une mise à jour ciblée, indépendamment du reste.

---

## ⚪ Partie 5 — Reste de la dette technique (mineure, non bloquante)

- 4 fichiers encore vides : `authGuard.tsx`, `userProfile.tsx`, `lib/types/nft.ts`, `shims/farcaster-mini-app-solana.js` (ce dernier reste nécessaire, ne pas le supprimer — c'est le stub qui empêche le build de recasser, cf. audit précédent).
- `blockchain/` a toujours ses deux lockfiles (npm + bun) — seul sous-projet où ce n'est pas encore réglé.
- La CI (`ci.yml`) ne configure aucune variable d'environnement pour le build frontend (`NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_API_URL`) — à vérifier que `next build` n'en a pas besoin pour réussir (probablement OK puisque ces valeurs ne sont utilisées qu'au runtime côté client, mais à confirmer sur le prochain run CI).
- Aucun test automatisé référencé pour le backend (`npm test --if-present` dans la CI, mais pas de script `test` dans `backend/package.json` à vérifier) ; côté `blockchain/`, en revanche, il existe de vrais tests (`test/ContractManager.ts`, `test/ContractNFT.ts`) — bonne pratique déjà en place là, à étendre au backend/frontend.

---

## 📋 Plan d'action priorisé

### Priorité 1 — Débloquer le login (aujourd'hui)
- [ ] Corriger l'ordre Helmet/CORS et ajouter `allowedHeaders` dans `server.js` (Partie 1)
- [ ] Vérifier en DevTools que l'erreur disparaît

### Priorité 2 — Sécurité smart contracts (avant tout déploiement en production avec de vrais fonds)
- [ ] Ajouter `nonReentrant` sur `releaseEscrow`, `applyPenalty`, `depositEscrow`
- [ ] Corriger le comptage réel dans `addAuthorizedPauser` (la limite de 3 ne fonctionne pas)
- [ ] Retirer ou plafonner les boucles non bornées sur `_contractIds` dans les fonctions de pause d'urgence
- [ ] Revoir le modèle de confiance de `releaseEscrow` (qui peut légitimement libérer les fonds)

### Priorité 3 — UI/UX mobile
- [ ] Corriger `SidebarWidthHandler` pour mettre `--sidebar-width: 0px` sur mobile (§3.1) — impact immédiat sur 11 pages
- [ ] Trancher entre les deux systèmes de sidebar et retirer celui qui n'est pas utilisé
- [ ] Ajouter les `aria-label` manquants sur les boutons icon-only

### Priorité 4 — Durcissement backend
- [ ] `fileFilter` MIME sur l'upload IPFS
- [ ] Mettre à jour Next.js pour corriger CVE-2025-66478

### Priorité 5 — Dette mineure restante
- [ ] Unifier le gestionnaire de paquets dans `blockchain/`
- [ ] Compléter les 4 derniers fichiers vides ou les supprimer s'ils ne servent plus
- [ ] Ajouter des tests backend/frontend (le sous-projet `blockchain/` montre déjà comment faire)

---

## Verdict

Le projet a fait un vrai bond en qualité depuis le premier audit — build stable, CI en place, boucle d'auth corrigée, dette de code mort largement nettoyée. Le login restant est un bug précis et bien identifié (CORS/Helmet), pas un problème d'architecture. Le point le plus sérieux de cette passe est côté smart contracts : plusieurs failles réelles (réentrance non protégée malgré l'import, limite de sécurité inopérante, boucles non bornées) qui n'avaient jamais été auditées jusqu'ici et qui méritent d'être traitées avant tout déploiement gérant de vrais fonds. Côté UI, le bug de marge mobile est le point à fort impact utilisateur le plus simple à corriger — un seul fichier, un seul hook déjà existant dans le code à réutiliser.
