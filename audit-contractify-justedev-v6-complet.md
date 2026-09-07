# Audit complet — branche `justedev` (v6), par module

Angle : génie logiciel + juridique + UI/UX, module par module. Dernier commit audité : `8037e8d` ("feat(signature): bloque la signature si le contrat exige une identité vérifiée").

Méthode : lecture du code réel, aucune modification. Les audits `v3`/`v4`/`v5` restent la référence pour le détail déjà couvert (wizard de création, signature, IPFS, nomenclature) — ce document se concentre sur les modules **jamais encore audités** (séquestre, litiges, paiements, administration, KYC) et vérifie par régression que les points critiques des audits précédents tiennent toujours.

---

## 🟢 Régressions vérifiées — les points critiques précédents tiennent

| Point (audit d'origine) | Statut vérifié maintenant |
|---|---|
| **Prise de contrôle de compte via l'email non vérifié** (v4, critique #1) | ✅ Corrigé — `backend/controllers/auth.js` : l'email vient de `req.privyUser?.verifiedEmail` (vérifié serveur par Privy), plus jamais de `req.body`. Un email de body différent est journalisé comme anomalie, pas utilisé. |
| **`terminateContract` verrouille l'escrow définitivement** (v4, critique #2) | ✅ Corrigé — `require(!contractData.isEscrowDeposited, ...)` bloque la résiliation tant que l'escrow n'est pas libéré/pénalisé. |
| **`updateUserRole` sans garde-fou "dernier admin"** (v4, mineur) | ✅ Corrigé — `assertNotLastActiveAdmin()` + interdiction de modifier son propre rôle, partagée entre changement de rôle et suspension. |
| **Réentrance CEI dans `_finalizeContract`** (v4, important) | ✅ Corrigé — statut mis à `Active` avant le mint du NFT. |

Ces correctifs ne datent pas de cette conversation — l'entretien du projet s'est visiblement poursuivi entre les audits. Bon signe : les points les plus graves ne sont pas restés en l'état.

---

## Module : Séquestre (escrow fiat)

**Génie logiciel** — Conception saine : rappels J-72h/48h/24h idempotents (un champ `*SentAt` par fenêtre), libération automatique à l'échéance bloquée par tout litige/pause actif (`hasOpenIncident`), libération anticipée par le créateur soumise à la même règle. Le detail que la libération soit bloquée par un litige même sans rapport direct avec l'argent (ex. litige de propriété intellectuelle) est un choix explicite et documenté, défendable.

**⚠️ Trouvé — la clause de pénalité n'a aucune implémentation.** Le texte de contrat généré (`buildEscrowClause`, create-contract-page.tsx) promet explicitement : *« En cas de retard... une pénalité de X% sera appliquée sur le montant séquestré. »* Or `EscrowService._release()` libère **toujours le montant intégral**, quel que soit `penaltyPercent` ou le contexte (litige résolu en faveur du bénéficiaire, retard constaté...). Aucune méthode ne calcule ou n'applique de retenue. Le jour où les paiements réels sont branchés, cette clause contractuelle sera fausse dans les faits — un signataire pourrait s'en prévaloir devant un tribunal en disant que la plateforme n'a jamais appliqué ce que le contrat qu'elle a fait signer promettait.
➡️ **Plan d'action** : soit implémenter un calcul de pénalité dans `_release`/`resolve` (paiement partagé créateur/bénéficiaire selon `penaltyPercent`) avant d'activer les paiements réels, soit retirer la clause de pénalité du texte généré tant que ce n'est pas construit — ne jamais laisser les deux diverger.

**Juridique** — Le séquestre étant fiat et hors-chaîne (choix déjà documenté et sensé : la cible n'est pas censée gérer un wallet crypto), la preuve de dépôt/libération repose entièrement sur la base de données de l'app, pas sur une preuve blockchain. Cohérent avec le reste du produit tant que ce n'est pas présenté comme "aussi fiable qu'on-chain" — vérifié que ce n'est pas le cas dans l'UI actuelle.

---

## Module : Litiges & pauses (incidents)

**Génie logiciel** — Très bien construit. Point notable et bien documenté dans le code lui-même : le flux on-chain de litige (`applyPenalty`/dispute Solidity) n'a plus aucune issue possible depuis le passage au séquestre fiat — ce service (`incident.js`) le remplace entièrement côté hors-chaîne, tout en gardant un ancrage on-chain optionnel (`onchainTxHash`, via `addJustification`) pour l'horodatage infalsifiable. Garde-fous solides : un seul incident actif à la fois par contrat (anti-spam de blocage), on ne peut pas répondre à sa propre proposition de pause, retrait réservé au déclarant.

**Mineur** — `resolve()` est réservé au rôle ADMIN au sens large (pas de notion de médiateur désigné par contrat) — cohérent avec la taille actuelle de l'équipe, mais à revoir si le volume de litiges grandit (un même pool d'admins voit tous les litiges de tous les contrats, y compris des différends commerciaux privés entre deux tiers).

---

## Module : Paiements (fondation)

**Génie logiciel** — Modèle propre : une interface `PaymentProvider` abstraite, un seul `DisabledPaymentProvider` branché aujourd'hui qui rejette explicitement (`PaymentsUnavailableError`) plutôt que d'échouer silencieusement. Brancher un vrai prestataire (Fedapay, CinetPay...) plus tard ne touchera que `services/payments/index.js`. Rien à redire — c'est le bon squelette pour ce stade.

---

## Module : Administration (utilisateurs, contrats, système)

**UI/UX** — Bonnes pratiques déjà en place : confirmation explicite avant promotion Admin (case à cocher dédiée, pas juste un select + clic), auto-suspension/auto-changement de rôle bloqués dans l'UI *et* le backend (défense en profondeur), page "Pause d'urgence" qui exige de taper "CONFIRMER" avant d'activer le bouton — cohérent avec l'impact réel de l'action (bloque toute la plateforme). Les bascules "Fonctionnalités"/"Mode maintenance" non câblées sont honnêtement marquées "Bientôt disponible" plutôt que simulées comme fonctionnelles — évite exactement le piège que les pages `/legal/*` évitent déjà ailleurs.

**⚠️ Trouvé — aucune visibilité KYC dans le panneau admin.** La fonctionnalité de vérification d'identité vient d'être construite mais la liste `/admin/users` n'affiche ni colonne ni filtre sur `kycStatus` — un admin ne peut pas voir en un coup d'œil qui est vérifié, ni retrouver un utilisateur par ce critère pour du support (ex. "pourquoi mon compte est resté PENDING 3 jours ?").
➡️ **Plan d'action** : ajouter une colonne/badge statut KYC dans le tableau, et un filtre à côté du filtre de rôle déjà présent.

---

## Module : KYC (nouveau — auto-critique)

Construit cette session ; relu avec la même rigueur que le reste plutôt que présumé correct.

**⚠️ Trouvé — le mode simulation peut rester actif en production par accident.** `config.kyc.mockMode` vaut `true` **par défaut dès que `KYC_MOCK_MODE` n'est pas défini** — un oubli de variable d'environnement en production (pas un cas exotique) laisserait `verifyCallbackSignature()` retourner `true` sans jamais vérifier de signature, et surtout laisserait `submitVerification()` **approuver automatiquement n'importe qui après 5 secondes**, sans jamais contacter Smile ID. C'est le genre de défaut-ouvert qu'un audit doit signaler même sur du code qu'on vient d'écrire soi-même.
➡️ **Plan d'action** : au démarrage du serveur, journaliser un avertissement explicite (voire refuser de démarrer) si `config.nodeEnv === 'production'` et `config.kyc.mockMode === true`.

**Mineur** — `verifyCallbackSignature` suppose que le webhook Smile ID envoie `timestamp`/`signature` à la racine du corps JSON ; je n'ai pas pu confirmer la forme exacte du payload webhook réel (documentation bloquée à la lecture automatisée), seulement l'API de la classe `Signature` elle-même (confirmée en lisant le SDK installé). À vérifier avec un vrai callback sandbox avant mise en production.

**Mineur** — Le `setTimeout` de `_submitMock` ne survit pas à un redémarrage du process (nodemon en dev) — une vérification simulée en cours au moment d'un redémarrage reste bloquée en `PENDING` indéfiniment. Sans conséquence en production (le mode simulation n'est pas censé y tourner — voir le point ci-dessus), gênant seulement en développement local.

**Positif** — Minimisation des données par construction (aucune colonne pour stocker la pièce/le selfie, seulement la référence du prestataire), échec fermé sur un code de résultat non reconnu (`FAILED`, jamais `VERIFIED` par défaut), verrou anti-spam webhook par vérification de signature plutôt qu'une simple clé partagée dans l'URL.

---

## Module : Smart contracts — dérive entre le code et le produit réel

**Trouvé — `depositEscrow`/`releaseEscrow`/`applyPenalty` restent pleinement actifs on-chain alors que le produit ne les appelle plus jamais** (le séquestre est passé en fiat hors-chaîne, confirmé par le commentaire de `incident.js` lui-même). N'importe quel participant d'un contrat actif peut toujours appeler `depositEscrow` directement (Polygonscan, script...) et envoyer de vrais MATIC dans un chemin que ni l'app ni le support ne surveillent ou ne savent traiter. Le risque réel est faible (il faut le vouloir, ou suivre un ancien tutoriel obsolète) mais réel : des fonds pourraient se retrouver bloqués dans un flux que l'équipe a mentalement abandonné.
➡️ **Plan d'action** : documenter clairement (README technique, commentaire NatSpec) que ces fonctions sont un chemin legacy non utilisé par le produit ; envisager de les désactiver (`whenNotPaused` ne suffit pas, il faudrait un flag dédié) dans une future version du contrat.

Le point v4 "couverture de test nulle sur les fonctions d'escrow" est donc devenu **sans objet pour l'usage réel** (ces fonctions ne sont plus dans le chemin critique du produit) — mais la dérive elle-même est le vrai problème à traiter, pas le manque de tests sur du code qui ne devrait plus être atteignable.

---

## Modules déjà couverts en détail (v3/v4/v5) — pas de nouvelle régression trouvée

Wizard de création, import PDF, signature KYC-modal, aperçu/proxy IPFS, nomenclature des contrats (titre/référence/fichiers) : relus en diagonale pour régression, rien de nouveau à signaler au-delà de ce que les audits précédents et les correctifs de cette conversation couvrent déjà.

---

## 📋 Plan d'action priorisé

### Priorité 1
- [ ] Refuser de démarrer (ou avertir bruyamment) si `KYC_MOCK_MODE` est actif alors que `NODE_ENV=production`
- [ ] Trancher la clause de pénalité de séquestre : l'implémenter avant d'activer les paiements réels, ou la retirer du texte généré en attendant

### Priorité 2
- [ ] Documenter/désactiver le chemin escrow on-chain legacy (`depositEscrow`/`releaseEscrow`/`applyPenalty`) devenu hors du produit réel
- [ ] Confirmer la forme exacte du payload webhook Smile ID avec un vrai callback sandbox

### Priorité 3
- [ ] Ajouter statut/filtre KYC dans `/admin/users`

---

## Verdict

Les points les plus graves des audits précédents sont réellement corrigés, vérifié dans le code actuel — pas seulement déclaré. Les modules jamais encore audités (séquestre, litiges, paiements, administration) sont globalement solides, avec une seule vraie divergence de fond : une clause contractuelle de pénalité que le code ne sait pas appliquer. Le point le plus sérieux de cette passe concerne mon propre travail de cette session — le mode simulation KYC qui peut rester actif par défaut en production — précisément le genre d'angle mort qu'une relecture indépendante doit attraper avant qu'un tiers ne le fasse à ma place.
