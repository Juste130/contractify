# Suivi des audits — points ouverts et reportés

Ce document remplace les quatre audits historiques `audit-contractify-justedev-v3.md`, `v4.md`, `v5-import-signature.md` et `v6-complet.md` (supprimés — contenu intégral toujours consultable dans l'historique git). Ces audits couvraient plusieurs dizaines de points ; la grande majorité a été vérifiée comme **réellement corrigée dans le code actuel** (pas seulement déclarée corrigée) lors du nettoyage de ce document. Ce fichier ne garde que ce qui reste réellement à faire ou volontairement en attente, pour éviter que quatre documents largement obsolètes noient les vrais points ouverts.

Dernière vérification : lecture directe du code (grep + lecture de fichiers), pas une supposition — chaque ligne ci-dessous a été confirmée absente/présente dans le code au moment de la rédaction.

---

## 🔴 Bloquant avant mise en production réelle — nécessite un tiers externe

- **CGU / Politique de confidentialité / Mentions légales non validées par un juriste.** `legal-page.tsx` affiche déjà un bandeau honnête ("en cours de rédaction, non formellement validé"). Une plateforme qui fait signer des contrats à valeur légale et collecte des données personnelles sans ce cadre n'a aucune limitation de responsabilité ni base légale RGPD/loi locale documentée. **Ne peut pas être fait par une IA** — nécessite un juriste inscrit dans une des juridictions ciblées (Bénin en priorité).
- **Niveau d'identification des signataires vs équivalence "signature manuscrite" revendiquée.** Le texte de consentement affirme une équivalence légale ferme alors qu'un wallet Privy ne demande qu'un email (pas de pièce d'identité par défaut). *Partiellement mitigé depuis* : la fonctionnalité KYC (Smile ID) permet désormais à un créateur d'exiger des signataires vérifiés — mais reste désactivée par défaut, donc le cas par défaut (email + wallet seul) est toujours celui que le juriste doit confronter aux textes cités (Bénin/Togo/Côte d'Ivoire/Sénégal).

## 🟠 Techniques — non résolus

- **Contrôle MIME à l'upload PDF repose uniquement sur le `Content-Type` déclaré par le client** (`backend/routes/ipfs.js`, `backend/routes/ai.js` filtrent sur `file.mimetype`, trivialement falsifiable), pas sur la signature binaire réelle (`%PDF-`). Un fichier renommé avec un `Content-Type` forgé passerait le filtre.
- **Forme exacte du payload webhook Smile ID non confirmée** — l'implémentation actuelle (`Signature.confirm_signature`) est fidèle au SDK installé, mais n'a jamais été testée contre un vrai callback. Nécessite de vraies credentials sandbox Smile ID pour être vérifié.
- **Chaîne de dépendances `@privy-io/react-auth`** — passée de `^3.6.1` (cible non appliquée notée en v4) à `^3.18.0` depuis, mais un `npm audit` n'a pas été rejoué pour confirmer que les vulnérabilités `ws`/`wagmi`/`viem` alors citées (haute sévérité) sont bien résolues par cette mise à jour.
- **`tar` critique côté backend** — laissé de côté volontairement pour compatibilité `bcrypt`/`node-pre-gyp`, toujours vrai aujourd'hui, à surveiller.
- **Portée réelle de la preuve `signContract()` non documentée pour l'utilisateur** — le smart contract prouve "qui a transigé quand", pas une signature cryptographique du contenu du document (le lien passe par le hash déclaré par le créateur, jamais recontrôlé on-chain). Pas de correction de code nécessaire, juste un ajout de texte explicatif dans le certificat PDF (`pdfGenerator.ts`) et/ou une page `/legal/*`.

## 🟡 Mineurs — non résolus

- `backend/middleware/error-handler.js` détermine le status HTTP par matching de sous-chaîne (`includes('not found')`, `'Invalid'`, `'already exists'`) sur le message d'erreur — un message tiers contenant accidentellement un de ces mots renverrait un code trompeur.
- `Document.uploadedBy` reste nullable dans `prisma/schema.prisma` — si `null`, la comparaison de propriétaire échoue pour le vrai propriétaire (faux négatif), sauf admin.
- Aucune micro-mention "action définitive" sous le bouton "Signer le contrat" de `SignaturePanel` — existe déjà pour le déploiement de contrat, pas encore pour la signature elle-même.
- Aucune journalisation d'IP/user-agent au moment de la signature (`syncContract` post-signature) — renforcerait le faisceau de preuve en cas de litige, non bloquant, à évaluer avec le juriste en même temps que les points juridiques ci-dessus.
- `frontend/src/components/ui/chart.tsx` utilise `dangerouslySetInnerHTML` pour générer des variables CSS depuis une config interne — pas de contenu utilisateur actuellement, à surveiller si la config venait un jour de l'API.
- Léger FOUC mobile au hard-refresh (`isMobile` initialisé à `false` avant correction par `useEffect`) — cosmétique.
- TODO non implémenté dans `backend/services/auth.js` : email au créateur quand un contrat est prêt à être déployé.

## Volontairement reportés — décision produit, pas un oubli

Ces sujets ont chacun leur propre document de référence, plus détaillé qu'un résumé ici ne pourrait l'être :

- **Séquestre on-chain legacy** (`depositEscrow`/`releaseEscrow`/`applyPenalty` toujours actifs sur le contrat déployé, alors que le produit réel utilise l'escrow fiat hors-chaîne) → `escrow-onchain-deferred.md`.
- **Architecture NFT/certificat** (ERC-5192 fait et testé, déploiement en attente ; mint multi-signataire non implémenté) → `nft-architecture-deferred.md`.
- **Optimisations gaz différées** (réordonnancement de `ContractData`, nécessitant une coordination avec `blockchain-sync.js` ; retrait de l'event `Notification` non écouté) → `blockchain/GAS-OPTIMIZATION.md`.

## Pour référence — corrigés depuis les audits (résumé)

Trace courte de ce qui a été vérifié comme réellement en place, pour ne pas perdre la mémoire du travail fait sans garder les quatre documents complets : prise de contrôle de compte via email non vérifié, verrouillage définitif de l'escrow par `terminateContract`, réentrance CEI dans `_finalizeContract`, garde-fou "dernier admin", tests dédiés escrow (dépôt/libération/pénalité), `applyPenalty` met bien à jour `status`, troncature `uint88` gardée par un `require`, `renounceOwnership()` désactivé, middleware mort `fund-check.js` et fichiers frontend morts (`sidebar.tsx`, `providers.tsx`) supprimés, contrôle d'accès unifié entre `getDraftDetails`/`getContractDetails` (`hasContractAccess` partagé), statut/filtre KYC dans `/admin/users`, mode simulation KYC bloqué en production, clause de pénalité de séquestre réellement implémentée (`EscrowService._release`), `sandbox` sur les iframes PDF, recalcul du SHA-256 pour un PDF importé au moment de signer, utilitaire `hash.ts` partagé, texte de consentement unifié (`signatureLegalBasisClause`), avertissement visuel distinct pour une signature numérique détectée vs une heuristique IA, prévisualisation du PDF avant l'étape finale du wizard, saisie manuelle obligatoire de la loi applicable pour un pays hors liste, distinction "date de signature originale" vs "date d'ancrage blockchain" dans le certificat PDF.
