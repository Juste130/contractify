# Suivi des audits — points ouverts et reportés

Ce document remplace les quatre audits historiques `audit-contractify-justedev-v3.md`, `v4.md`, `v5-import-signature.md` et `v6-complet.md` (supprimés — contenu intégral toujours consultable dans l'historique git). Ces audits couvraient plusieurs dizaines de points ; la grande majorité a été vérifiée comme **réellement corrigée dans le code actuel** (pas seulement déclarée corrigée) lors du nettoyage de ce document. Ce fichier ne garde que ce qui reste réellement à faire ou volontairement en attente, pour éviter que quatre documents largement obsolètes noient les vrais points ouverts.

Dernière vérification : lecture directe du code (grep + lecture de fichiers), pas une supposition — chaque ligne ci-dessous a été confirmée absente/présente dans le code au moment de la rédaction.

---

## 🔥 Urgent mais reporté — bloqué sur un tiers externe, pas par choix

Ces deux points sont les plus sérieux de tout le suivi d'audit : ils bloquent une mise en production réelle, mais **aucun des deux ne peut être résolu par du code** — chacun attend une action humaine externe précise. Reporté ≠ oublié : ils restent en tête de ce document tant qu'ils ne sont pas traités.

- **CGU / Politique de confidentialité / Mentions légales non validées par un juriste.** `legal-page.tsx` affiche déjà un bandeau honnête ("en cours de rédaction, non formellement validé"). Une plateforme qui fait signer des contrats à valeur légale et collecte des données personnelles sans ce cadre n'a aucune limitation de responsabilité ni base légale RGPD/loi locale documentée. **Action requise** : mandater un juriste inscrit dans une des juridictions ciblées (Bénin en priorité) pour valider les 3 documents — y compris trancher si le niveau d'identification actuel des signataires (email + wallet, sans pièce d'identité par défaut ; le KYC Smile ID existe mais reste optionnel) suffit à l'équivalence "signature manuscrite" revendiquée dans le texte de consentement, pour chacune des juridictions citées (Bénin/Togo/Côte d'Ivoire/Sénégal).
- **Forme exacte du payload webhook Smile ID non confirmée.** L'implémentation actuelle (`Signature.confirm_signature`) est fidèle au SDK installé et lue directement dans son code source, mais n'a jamais été exercée contre un vrai callback — en production, un webhook réel dont la forme diffère de l'hypothèse actuelle (`timestamp`/`signature` à la racine du corps JSON) échouerait silencieusement à valider chaque vérification KYC. **Action requise** : obtenir de vraies credentials sandbox Smile ID et tester un callback réel de bout en bout avant toute utilisation en production du KYC.

## 🟠 Techniques — non résolus

- **Contrôle MIME à l'upload PDF repose uniquement sur le `Content-Type` déclaré par le client** (`backend/routes/ipfs.js`, `backend/routes/ai.js` filtrent sur `file.mimetype`, trivialement falsifiable), pas sur la signature binaire réelle (`%PDF-`). Un fichier renommé avec un `Content-Type` forgé passerait le filtre.
- **Chaîne de dépendances `@privy-io/react-auth`** — passée de `^3.6.1` (cible non appliquée notée en v4) à `^3.18.0` depuis, mais un `npm audit` n'a pas été rejoué pour confirmer que les vulnérabilités `ws`/`wagmi`/`viem` alors citées (haute sévérité) sont bien résolues par cette mise à jour.
- **`tar` critique côté backend** — laissé de côté volontairement pour compatibilité `bcrypt`/`node-pre-gyp`, toujours vrai aujourd'hui, à surveiller.
- **Portée réelle de la preuve `signContract()` non documentée pour l'utilisateur** — le smart contract prouve "qui a transigé quand", pas une signature cryptographique du contenu du document (le lien passe par le hash déclaré par le créateur, jamais recontrôlé on-chain). Pas de correction de code nécessaire, juste un ajout de texte explicatif dans le certificat PDF (`pdfGenerator.ts`) et/ou une page `/legal/*`.
- Aucune journalisation d'IP/user-agent au moment de la signature (`syncContract` post-signature) — renforcerait le faisceau de preuve en cas de litige, non bloquant, à évaluer avec le juriste en même temps que les points juridiques ci-dessus.

## 🟡 Mineurs — tous résolus depuis la dernière passe

- ~~`error-handler.js` matching par sous-chaîne~~ — corrigé : ne s'applique plus que si aucun statusCode n'est déjà connu, et matche désormais sur des mots entiers (regex `\b...\b`) plutôt que de simples sous-chaînes.
- ~~`Document.uploadedBy` nullable~~ — relu : c'est en réalité `IpfsDocument.uploadedBy`, déjà traité intentionnellement (commentaire dédié dans `ipfs.js`) en refus par défaut plutôt qu'un correctif — pas de source de vérité alternative fiable pour deviner le vrai propriétaire d'un upload historique, donc refuser plutôt que supposer reste le bon choix. Rien à changer.
- ~~Micro-mention "action définitive" sous "Signer le contrat"~~ — en réalité déjà présente (`SignaturePanel.tsx` : "Action immédiate et définitive, ancrée sur la blockchain.") ; la vérification précédente avait raté cette ligne par une recherche trop stricte.
- ~~FOUC mobile léger au hard-refresh~~ — corrigé : `SidebarWidthHandler` utilise désormais `useLayoutEffect` (exécuté avant la première peinture) au lieu de `useEffect`.
- ~~TODO non implémenté (`services/auth.js`, email au créateur)~~ — déjà implémenté (notification in-app + email dès qu'un brouillon devient `READY_TO_DEPLOY`).
- `frontend/src/components/ui/chart.tsx` (`dangerouslySetInnerHTML`) — relu, confirmé sans risque actuel (aucun contenu utilisateur n'y entre, config interne uniquement) ; reste sous simple surveillance, aucun changement nécessaire.

## Volontairement reportés — décision produit, pas un oubli

Ces sujets ont chacun leur propre document de référence, plus détaillé qu'un résumé ici ne pourrait l'être :

- **Séquestre on-chain legacy** (`depositEscrow`/`releaseEscrow`/`applyPenalty` toujours actifs sur le contrat déployé, alors que le produit réel utilise l'escrow fiat hors-chaîne) → `escrow-onchain-deferred.md`.
- **Architecture NFT/certificat** (ERC-5192 et mint multi-signataire tous deux faits et testés en code, déploiement groupé en attente) → `nft-architecture-deferred.md`.
- **Optimisations gaz différées** (réordonnancement de `ContractData`, nécessitant une coordination avec `blockchain-sync.js` ; retrait de l'event `Notification` non écouté) → `blockchain/GAS-OPTIMIZATION.md`.

## Pour référence — corrigés depuis les audits (résumé)

Trace courte de ce qui a été vérifié comme réellement en place, pour ne pas perdre la mémoire du travail fait sans garder les quatre documents complets : prise de contrôle de compte via email non vérifié, verrouillage définitif de l'escrow par `terminateContract`, réentrance CEI dans `_finalizeContract`, garde-fou "dernier admin", tests dédiés escrow (dépôt/libération/pénalité), `applyPenalty` met bien à jour `status`, troncature `uint88` gardée par un `require`, `renounceOwnership()` désactivé, middleware mort `fund-check.js` et fichiers frontend morts (`sidebar.tsx`, `providers.tsx`) supprimés, contrôle d'accès unifié entre `getDraftDetails`/`getContractDetails` (`hasContractAccess` partagé), statut/filtre KYC dans `/admin/users`, mode simulation KYC bloqué en production, clause de pénalité de séquestre réellement implémentée (`EscrowService._release`), `sandbox` sur les iframes PDF, recalcul du SHA-256 pour un PDF importé au moment de signer, utilitaire `hash.ts` partagé, texte de consentement unifié (`signatureLegalBasisClause`), avertissement visuel distinct pour une signature numérique détectée vs une heuristique IA, prévisualisation du PDF avant l'étape finale du wizard, saisie manuelle obligatoire de la loi applicable pour un pays hors liste, distinction "date de signature originale" vs "date d'ancrage blockchain" dans le certificat PDF.
