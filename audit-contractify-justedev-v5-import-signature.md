# Audit ciblé — Processus d'import de contrat et de signature — branche `justedev` (v5)

Angle : **UI/UX**, **génie logiciel** et **juridique**, sur le parcours complet « Créer/Importer un contrat → Aperçu → Signataires → Déploiement blockchain → Signature KYC » (`create-contract-page.tsx`, `contract-details-page.tsx`, `contract-view-page.tsx`, `kyc-signature-modal.tsx`, `signaturePanel.tsx`, `backend/controllers/contract.js`, `backend/controllers/ai.js`, `blockchain/contracts/ContractManager.sol`, `prisma/schema.prisma`, pages `/legal/*`).

Dernier commit audité : `742152a` ("fix(nft,ipfs): affiche le certificat dans l'app et corrige le CID mislabelise").

Méthode : lecture exhaustive du code réel, **aucune modification**. Les audits `v3`/`v4` (sécurité générale) restent valides — ce document ne les répète pas, sauf recoupement direct avec l'import/la signature. Un point notable de `v4` (réentrance CEI dans `_finalizeContract`, mint NFT avant mise à jour du statut) est **déjà corrigé** dans le code actuel : `contractData.status = ContractStatus.Active` est bien positionné avant l'appel externe `contractNFT.mintContractNFT(...)` (`ContractManager.sol` L686-691).

---

## Cartographie du parcours réel

1. **Étape 1 — Choix** : "J'ai déjà un contrat (PDF)" *ou* un des 6 templates IA (`create-contract-page.tsx` L275-284).
2. **Étape 2 — Formulaire** :
   - *Import PDF* : upload (`.pdf`, 10 Mo max), analyse IA best-effort en tâche de fond (extraction des parties, détection de signature existante), puis saisie Partie A/B.
   - *IA* : saisie Partie A/B + détails (description, montant, séquestre déclaratif, ville/pays de juridiction avec suggestion IA).
3. **Étape 3 — Aperçu & Édition** (skippée pour l'import) : génération du texte par LLM, simplification, **vérification de conformité IA obligatoire** avant de continuer, édition libre du texte.
4. **Étape 4 — Signataires** : ajout des signataires (email + rôle), case de consentement, **Enregistrer le brouillon** → `POST /contracts/draft`.
5. **Déploiement** : si tous les signataires ont déjà un wallet, proposition immédiate de déploiement on-chain (`createContract` sur `ContractManager.sol`) ; sinon invitation par email, déploiement différé après inscription de tous.
6. **Signature** : `KycSignatureModal` (3 étapes : identité déclarative → relecture + vérification de hash → signature) → `signContract(contractId)` on-chain → resynchronisation immédiate côté backend.

---

## 🎨 Angle UI/UX

### 1. Le wizard est globalement bien pensé, mais la sortie "brouillon" laisse l'utilisateur dans un entre-deux
Après "Enregistrer le brouillon" (étape 4), deux chemins possibles : déploiement immédiat (`readyToDeployDraft`) ou redirection vers `contract-details`. C'est cohérent. Mais **rien dans l'étape 1 ni dans le bouton final n'indique clairement, avant de s'engager, qu'un contrat créé n'est *pas encore* signé ni déployé tant que ce second geste n'a pas eu lieu** — un utilisateur pressé peut croire que "Enregistrer le brouillon" = "le contrat est fait". Le badge de statut (`DRAFT_WAITING_SIGNERS` / `READY_TO_DEPLOY`) sur la page de détails compense partiellement, mais seulement une fois arrivé là.
**Plan d'action** : ajouter un texte explicite sous le bouton "Enregistrer le brouillon" (« Cette étape ne signe ni ne déploie rien — vous ou vos signataires devrez ensuite déployer puis signer ») visible avant le clic, pas seulement après.

### 2. L'avertissement d'import (signature/tampon déjà présents) est un simple checkbox dismissible
`importWarningActive` (L525-529) déclenche un encart ambre avec une case à cocher "J'ai pris connaissance…" — mais rien n'empêche de la cocher sans lire, et l'IA qui détecte "looksLikeContract"/"mentionsExistingSignature" peut se tromper dans les deux sens (faux négatif comme faux positif, cf. commentaire du code lui-même, L494-497 : *"best-effort only"*). Le seul vrai blocage dur du flux est le mismatch de hash SHA-256 dans le modal KYC, pas ce warning d'import.
**Plan d'action** : rien à corriger dans la logique (le compromis "best-effort, non bloquant" est assumé et documenté dans le code) — mais **renforcer visuellement** l'avertissement quand `hasDigitalSignature` est vrai (signature numérique PDF détectée par regex `/ByteRange/` + `/Sig|DocTimeStamp/`, un signal beaucoup plus fiable que l'heuristique IA) : distinguer visuellement ce cas (fort risque de double-signature avec deux dates distinctes) du cas "texte évoquant une signature" (faible confiance IA) plutôt que de les fondre dans le même bloc ambre.

### 3. Aucune prévisualisation du PDF importé avant validation finale
L'utilisateur voit le nom du fichier et un résumé textuel de l'analyse IA, mais ne revoit jamais le PDF lui-même avant de cliquer "Enregistrer le brouillon" à l'étape 4 (le document n'apparaît qu'après, sur `contract-details`/`contract-view` via iframe). Pour un document qui va être ancré de façon irréversible, ne pas donner l'occasion de vérifier visuellement "est-ce bien le bon fichier ?" avant l'engagement est un manque.
**Plan d'action** : afficher l'iframe du PDF uploadé (déjà disponible en mémoire côté client via `URL.createObjectURL(uploadedFile)`, sans even attendre l'upload IPFS) quelque part entre l'étape 2 et l'étape 4.

### 4. Le message "Toute signature est définitive" apparaît seulement à l'étape 2 du modal KYC (relecture), jamais avant
Un utilisateur qui clique directement "Signer le contrat" depuis `SignaturePanel`/`contract-details-page.tsx` ne voit cet avertissement qu'après avoir déjà ouvert le modal et avancé d'un cran. C'est un détail mineur (le modal reste annulable jusqu'au bout), mais un rappel de l'irréversibilité dès le bouton d'entrée renforcerait le consentement éclairé.
**Plan d'action** : ajouter une micro-mention ("action définitive") sous le bouton "Signer le contrat" de `SignaturePanel`, comme c'est déjà fait pour le déploiement ("Le déploiement est immédiat et irréversible…", L1562-1565 de `create-contract-page.tsx`).

### 5. Incohérence de vocabulaire "Signature électronique" vs actions on-chain distinctes
Le modal KYC parle uniformément de "signature électronique" pour l'étape 3 ("Signature électronique… déclenchera une transaction immuable"), ce qui est correct, mais le texte de consentement de l'étape 4 du wizard (checkbox finale, L1707) et celui du modal (L314-317) emploient des formulations légèrement différentes pour désigner le même acte ("signature électronique sur blockchain" vs "signature électronique ayant valeur légale") — l'un cite `E_SIGNATURE_LEGAL_BASIS[country]`, l'autre aussi mais avec un texte différent. Cohérence rédactionnelle mineure mais visible pour un utilisateur qui verrait les deux textes côte à côte (l'un à la création, un pour chaque signataire).
**Plan d'action** : factoriser en un seul texte de consentement partagé (constante réutilisée par les deux composants) pour garantir l'identité stricte du texte auquel chaque partie consent réellement.

### 6. Bon point à noter — pas de régression
Autosave localStorage du brouillon (L239-254), retour au champ d'erreur en `scrollIntoView`, verrouillage des parties nommées comme signataires non retirables (`isNamedContractParty`), warning explicite si séquestre déclaré mais paiement non actif : ce sont des choix UX solides et honnêtes (le texte dit clairement "le paiement en ligne n'est pas encore activé" plutôt que de laisser croire à un vrai dépôt).

---

## ⚙️ Angle génie logiciel

### 1. Le contrôle MIME à l'upload repose uniquement sur l'en-tête `Content-Type` envoyé par le client
`backend/routes/ipfs.js` et `backend/routes/ai.js` filtrent sur `file.mimetype` (déclaré par le client, trivialement falsifiable), pas sur la signature binaire réelle du fichier (magic bytes `%PDF-`). Un fichier HTML/JS renommé avec un `Content-Type: application/pdf` forgé passerait le filtre, serait épinglé sur IPFS, puis servi via `<iframe src={ipfsApi.getPublicUrl(...)}>` **sans attribut `sandbox`** (`contract-details-page.tsx` L908-913, `contract-view-page.tsx` L91-96). Le contenu s'exécuterait dans l'origine du gateway IPFS (pas celle de l'app — cookies httpOnly de session non exposés), mais reste une porte ouverte à du contenu trompeur/hameçonnage affiché dans le cadre de confiance de l'app.
**Plan d'action** :
- Vérifier la signature binaire réelle (`%PDF-` en tête de fichier) côté backend avant d'accepter l'upload, en plus du `mimetype` déclaré.
- Ajouter `sandbox="allow-scripts allow-same-origin"` (ou plus restrictif si le rendu PDF du gateway le permet) sur les deux iframes, par défense en profondeur.

### 2. Le hash SHA-256 vérifié au moment de la signature ne couvre le contenu que pour les contrats générés par IA, pas les PDF importés
Dans `KycSignatureModal`, `hasHashMismatch` est explicitement désactivé quand `contractContent === "CONTRAT_PDF_EXTERNE"` (L116-119) — logique, puisqu'il n'y a pas de texte à comparer. Mais cela signifie que **pour un import PDF, rien ne revérifie au moment de la signature que le fichier disponible sur IPFS est toujours celui dont le SHA-256 a été calculé à l'upload** — seule l'empreinte est affichée (L271-276), jamais recalculée depuis le fichier réellement servi. Le risque réel est faible (IPFS est adressé par contenu, un CID ne peut pas changer de contenu), mais rien dans l'UI ne vérifie *que le CID lui-même correspond bien au SHA-256 stocké* — un bug d'upload (mauvais fichier envoyé à IPFS après calcul du hash sur un autre) passerait inaperçu.
**Plan d'action** : au chargement du modal KYC pour un import PDF, télécharger le fichier depuis le gateway IPFS et recalculer son SHA-256 côté client pour le comparer à `originalHash`, exactement comme c'est fait pour le texte — même garde-fou, cohérent entre les deux types de contrat.

### 3. `signContract(contractId)` ne signe cryptographiquement rien du contenu du document
Le smart contract (`ContractManager.sol` L392-420) enregistre uniquement que `msg.sender` a appelé `signContract(contractId)` avant expiration — la preuve on-chain est *"cette adresse a soumis cette transaction à cet instant"*, pas *"cette adresse a signé cryptographiquement le hash du document X"*. Le lien entre le hash et le contrat repose entièrement sur `sha256Hash`, écrit une seule fois par le créateur à `createContract` et jamais recontrôlé par les signataires suivants au niveau du contrat lui-même (seule l'UI empêche de cliquer en cas de mismatch, côté client). C'est un design courant et défendable pour ce type de dApp, mais ça mérite d'être documenté explicitement (y compris pour vos utilisateurs juristes) : la preuve forte est *"qui a transigé quand"*, la preuve du contenu repose sur IPFS + le hash déclaré par le créateur, pas sur une signature individuelle de chaque partie liée cryptographiquement au contenu.
**Plan d'action** : aucune correction de code nécessaire à ce stade (refonte lourde pour un gain de robustesse marginal vu le contexte), mais documenter ce choix dans le certificat PDF généré (`pdfGenerator`) et/ou la page `/legal/*` pertinente, pour que la portée exacte de la preuve soit correctement comprise par les parties et opposable en cas de litige.

### 4. Duplication de logique de calcul du SHA-256 entre 3 endroits
`computeSHA256`/`computeFileSHA256` sont dupliqués identiquement dans `create-contract-page.tsx` et `kyc-signature-modal.tsx`. Mineur, mais un futur changement d'algorithme ou de format de sortie devra être répercuté à la main aux deux endroits sans garde-fou de compilation qui le rappelle.
**Plan d'action** : extraire dans `frontend/src/lib/utils/hash.ts` (ou équivalent) et importer des deux côtés.

### 5. `resendSignatureRequest` n'a pas de limite de fréquence dédiée
`POST /contracts/:id/resend` (contrôlé par `contract.js` L287-346) est protégé par l'auth mais pas par un rate-limit spécifique — le créateur d'un contrat peut le déclencher en boucle vers un signataire pour spammer sa boîte mail (pas un vecteur d'attaque externe puisqu'il faut être authentifié et propriétaire/admin du contrat, mais un abus interne reste possible).
**Plan d'action** : appliquer un rate-limit léger par `(userId, signatoryId)` (ex. 1 relance / 5 min), cohérent avec la remarque déjà faite sur `/api/auth/privy` dans l'audit `v4`.

### 6. Bon point à noter — pas de régression
La vérification serveur de `markDraftDeployed` (ne fait jamais confiance au `transactionHash` déclaré par le client sans le revérifier on-chain, gestion de la race condition avec l'event listener via `dropStalePlaceholder`/retry sur `P2002`), le calcul serveur du rôle `Creator` (`isDraftCreator`, non falsifiable depuis le client), et la limite `MAX_SIGNATORIES = 20` / `signersWithRoles.length <= 50` côté contrat sont des protections solides et correctement pensées.

---

## ⚖️ Angle juridique

### 1. Le socle juridique de la plateforme (CGU / Confidentialité / Mentions légales) est explicitement un brouillon non validé
`legal-page.tsx` (L12-19, commentaire du code lui-même) : *"ContracTify had no Terms of Service, Privacy Policy, or Mentions légales at all before this page existed… The honest fix is to say so plainly rather than publish AI-drafted text as if a lawyer had reviewed it."* — et chaque page `/legal/*` affiche un bandeau : *"Ce document est en cours de rédaction par un professionnel du droit et n'a pas encore été formellement validé."*

C'est une transparence louable, **mais c'est aussi le risque juridique le plus élevé de toute la plateforme** : une plateforme qui fait signer des contrats à valeur légale et collecte des données personnelles (email, RCCM, IFU, adresse, date de naissance, contenu de contrats parfois sensibles) sans CGU ni politique de confidentialité opposables n'a, à ce stade, aucun cadre contractuel formel avec ses utilisateurs — pas de limitation de responsabilité, pas de base légale RGPD/loi locale sur la protection des données documentée, pas de conditions d'usage de l'IA opposables.
**Plan d'action** : priorité absolue avant toute mise en production réelle (au-delà du strict périmètre technique de cet audit) — faire valider CGU, politique de confidentialité et mentions légales par un juriste inscrit dans une des juridictions ciblées (Bénin en priorité, vu `JURISDICTION_CITIES`/`E_SIGNATURE_LEGAL_BASIS`), puis retirer les bandeaux d'avertissement une fois fait.

### 2. La formule de consentement affirme une équivalence légale ferme, alors que l'identité du signataire n'est pas vérifiée
Le modal KYC dit explicitement, dans son étape 1 : *"Il ne s'agit pas d'une vérification d'identité par pièce officielle"* (transparence honnête) — puis, à l'étape de consentement final, fait cocher : *"je consens à apposer ma signature électronique ayant valeur légale, au sens de [texte de loi]"* (formulation affirmative et non nuancée). Un wallet Privy peut être créé avec un simple email (pas de vérification d'identité forte, pas de pièce d'identité, pas de 2FA obligatoire visible dans ce périmètre) : la preuve du lien entre l'adresse wallet et l'identité réelle du signataire repose donc essentiellement sur l'email déclaré et éventuellement la connaissance préalable des parties, pas sur un mécanisme d'identification "fiable" au sens généralement exigé par les régimes de signature électronique cités (Bénin, Togo, Côte d'Ivoire — qui, comme la plupart des lois inspirées de la Loi-type CNUDCI/UEMOA, conditionnent l'équivalence à la signature manuscrite à un "procédé d'identification fiable" et à l'intégrité du document).

Cela ne veut pas dire que la signature n'a *aucune* valeur — juste que la formulation actuelle est **plus affirmative que ce que la mécanique technique réelle garantit**, ce qui expose la plateforme (et ses utilisateurs) à voir cette valeur contestée devant un juge en cas de litige sur l'identité du signataire.
**Plan d'action** :
- Faire valider par le juriste (cf. point 1) si le niveau d'identification actuel (email + wallet, sans pièce d'identité) suffit à qualifier ces signatures de "fiables" au sens des textes cités, spécifiquement pour chacune des 4 juridictions listées.
- À défaut, nuancer le texte de consentement ("signature électronique" simple, sans présumer de son opposabilité totale) plutôt que d'affirmer une équivalence catégorique — ou proposer un niveau de KYC renforcé (option) pour les contrats à enjeu élevé.

### 3. Base légale par défaut vague pour les pays hors liste
`DEFAULT_E_SIGNATURE_LEGAL_BASIS = "la loi applicable au présent contrat"` (`contract-templates.ts` L138) s'affiche dès qu'un pays hors Bénin/Togo/Côte d'Ivoire/Sénégal est choisi (le sélecteur propose "Autre" comme option, L1197) — le signataire consent alors à une citation légale qui ne désigne aucun texte précis, ce qui affaiblit la valeur probatoire de la mention elle-même.
**Plan d'action** : soit retirer l'option "Autre" du sélecteur de pays tant qu'aucune base légale précise n'est mappée, soit exiger une saisie manuelle de la loi applicable dans ce cas plutôt que la formule générique.

### 4. Ré-ancrage d'un document déjà signé hors plateforme : le point est bien identifié mais reste un vrai risque juridique résiduel
Le code documente lui-même le cas (L897-899 de `create-contract-page.tsx`) : si un PDF importé porte déjà une signature/tampon antérieur, faire "re-signer" les parties sur ContracTify crée une **nouvelle date de signature on-chain**, distincte de celle réellement indiquée sur le document — ce qui peut créer une ambiguïté sur la date d'effet opposable du contrat (laquelle fait foi : la date sur le papier, ou la date blockchain ?).
**Plan d'action** : le message d'avertissement actuel est correct sur le fond ("ContracTify peut simplement l'ancrer comme preuve" plutôt que refaire signer) — s'assurer que le certificat PDF téléchargé (`generateCertifiedPDF`) distingue explicitement, pour ce cas précis, "date de signature originale (déclarée par les parties)" et "date d'ancrage blockchain" comme deux dates différentes et non substituables, si ce n'est pas déjà le cas.

### 5. Aucune conservation d'éléments de preuve annexes habituellement attendus pour une signature électronique (IP, user-agent, horodatage serveur indépendant)
La preuve repose exclusivement sur : la transaction blockchain (adresse + horodatage bloc), le hash SHA-256 et le CID IPFS. Rien dans le flux observé ne journalise l'adresse IP, le user-agent ou un horodatage serveur indépendant au moment du clic "Signer" — des éléments qui, en pratique, renforcent souvent le faisceau de preuve en cas de contestation (au-delà de la seule preuve cryptographique on-chain, qui est déjà solide en soi mais ne dit rien du contexte humain de l'acte de signature).
**Plan d'action** : évaluer avec le juriste si l'ajout d'un journal serveur (IP, user-agent, timestamp serveur) au moment de l'appel `syncContract` post-signature apporterait une valeur probatoire complémentaire utile, sans que ce soit un pré-requis bloquant vu la force de la preuve blockchain déjà en place.

---

## 📋 Plan d'action priorisé (spécifique import + signature)

### Priorité 1 — Cadre juridique (bloquant avant mise en production réelle)
- [ ] Faire valider CGU / Politique de confidentialité / Mentions légales par un juriste (Bénin en priorité) — point 1 juridique
- [ ] Faire trancher par ce juriste si le niveau d'identification actuel (email + wallet) suffit à l'équivalence "signature manuscrite" revendiquée dans le texte de consentement, ou nuancer ce texte en attendant — point 2 juridique

### Priorité 2 — Intégrité technique de la preuve
- [ ] Vérifier la signature binaire réelle des PDF uploadés (`%PDF-`), pas seulement le `Content-Type` déclaré — point 1 génie logiciel
- [ ] Ajouter `sandbox` aux iframes de rendu PDF (`contract-details-page.tsx`, `contract-view-page.tsx`) — point 1 génie logiciel
- [ ] Recalculer le SHA-256 du PDF importé au moment de la signature (pas seulement à l'upload) pour appliquer le même garde-fou qu'aux contrats IA — point 2 génie logiciel

### Priorité 3 — UX de consentement éclairé
- [ ] Clarifier avant le clic "Enregistrer le brouillon" que rien n'est encore signé/déployé — point 1 UI/UX
- [ ] Distinguer visuellement l'alerte "signature numérique PDF détectée" (fiable) de l'alerte "texte évoquant une signature" (heuristique IA) — point 2 UI/UX
- [ ] Prévisualiser le PDF importé avant l'étape finale — point 3 UI/UX
- [ ] Unifier le texte de consentement (constante partagée) entre le wizard et le modal KYC — point 5 UI/UX

### Priorité 4 — Nettoyage mineur
- [ ] Retirer l'option "Autre" du sélecteur de pays ou exiger une base légale précise — point 3 juridique
- [ ] Vérifier que le certificat PDF distingue date de signature originale vs date d'ancrage blockchain pour un import déjà signé — point 4 juridique
- [ ] Factoriser `computeSHA256`/`computeFileSHA256` dans un utilitaire partagé — point 4 génie logiciel
- [ ] Rate-limit dédié sur `resendSignatureRequest` — point 5 génie logiciel

---

## Verdict

Techniquement, le parcours import + signature est **bien construit et honnête** : autosave, garde-fous serveur sur le rôle créateur et la vérification de déploiement, blocage dur en cas de mismatch de hash, avertissements explicites et non trompeurs sur les limites actuelles (pas de KYC officiel, paiement séquestre pas encore actif, IA best-effort). Le point de réentrance CEI relevé en `v4` est bien corrigé. Les failles techniques restantes sur ce périmètre précis (MIME non vérifié en profondeur, iframe sans `sandbox`, hash non revérifié pour les PDF au moment de signer) sont réelles mais de sévérité modérée, pas critiques.

Le vrai point d'attention de cet audit est **juridique, pas technique** : la plateforme fait signer des contrats en affirmant une valeur légale précise et catégorique, sans CGU/politique de confidentialité finalisées et sans que le niveau d'identification des signataires (email + wallet, explicitement présenté comme non-KYC) ait été confronté à ce que les textes cités exigent réellement pour cette équivalence. Ce n'est pas un problème de code — c'est un écart entre ce que l'interface affirme et ce que le dispositif garantit effectivement, qu'un juriste doit trancher avant que la plateforme ne traite des contrats réels à enjeu significatif.
