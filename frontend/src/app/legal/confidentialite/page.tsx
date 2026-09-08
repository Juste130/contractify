import { LegalPage, type LegalSection } from "@/components/pages/legal-page";

const sections: LegalSection[] = [
  {
    id: "donnees-collectees",
    title: "1. Données collectées",
    content: (
      <p>
        ContracTify collecte l'adresse e-mail utilisée à l'inscription, les informations saisies
        dans les contrats (identités et coordonnées des parties, clauses, montants), les documents
        téléversés, et les métadonnées techniques nécessaires à la sécurité du service (journaux
        de connexion, adresse de portefeuille numérique).
      </p>
    ),
  },
  {
    id: "sous-traitants",
    title: "2. Sous-traitants et services tiers",
    content: (
      <p>
        Le service s'appuie sur des prestataires tiers pour fonctionner : Privy (authentification
        et gestion du portefeuille numérique), Groq (génération assistée par IA du texte des
        contrats), Pinata/IPFS (stockage décentralisé des documents), et le réseau Polygon
        (horodatage blockchain). Les documents ancrés sur IPFS et les données inscrites sur la
        blockchain sont, par nature, difficiles voire impossibles à supprimer rétroactivement.
      </p>
    ),
  },
  {
    id: "finalite-du-traitement",
    title: "3. Finalité du traitement",
    content: (
      <p>
        Les données sont utilisées pour créer, faire signer et archiver les contrats de
        l'utilisateur, sécuriser son compte, et lui adresser les notifications liées à ses
        contrats (demande de signature, changement de statut, litige).
      </p>
    ),
  },
  {
    id: "securite",
    title: "4. Sécurité",
    incomplete: true,
    content: (
      <p>
        Les mots de passe ne sont jamais stockés : l'authentification passe par Privy, qui gère
        également la clé du portefeuille numérique de l'utilisateur sans que ContracTify n'y ait
        directement accès. Les échanges avec le service sont chiffrés en transit. Le détail complet
        des mesures techniques (chiffrement au repos, gestion des accès internes, journalisation)
        reste à documenter précisément avant publication définitive.
      </p>
    ),
  },
  {
    id: "transferts-internationaux",
    title: "5. Transferts internationaux",
    incomplete: true,
    content: (
      <p>
        Les prestataires tiers utilisés (Privy, Groq, Pinata) peuvent traiter ou stocker des
        données en dehors du pays de résidence de l'utilisateur. Les garanties applicables à ces
        transferts (clauses contractuelles types ou équivalent) restent à formaliser avec un
        professionnel du droit.
      </p>
    ),
  },
  {
    id: "conservation",
    title: "6. Conservation",
    incomplete: true,
    content: (
      <p>
        Durées de conservation par type de donnée — à préciser avec un professionnel du droit.
        Distinction importante à retenir pour cette page : les données du compte (profil, e-mail)
        peuvent en principe être supprimées sur demande, alors que le hash du document, sa version
        archivée sur IPFS et les écritures de signature inscrites sur la blockchain sont, par
        nature, difficiles voire impossibles à supprimer rétroactivement une fois publiées — ce
        point doit être expliqué clairement à l'utilisateur avant toute signature, pas seulement
        dans cette politique.
      </p>
    ),
  },
  {
    id: "droits-des-personnes",
    title: "7. Droits des personnes concernées",
    incomplete: true,
    content: (
      <p>
        Modalités d'exercice des droits d'accès, de rectification et de suppression — à préciser
        avant publication définitive, y compris les limites propres aux données déjà ancrées sur
        la blockchain (voir section 6). Un utilisateur souhaitant exercer ces droits pourra, à
        terme, le faire via son compte ou en contactant ContracTify directement.
      </p>
    ),
  },
  {
    id: "contact",
    title: "8. Contact",
    incomplete: true,
    content: <p>Adresse de contact pour toute question relative aux données personnelles — à compléter.</p>,
  },
];

export default function Page() {
  return <LegalPage title="Politique de confidentialité" updatedAt="26 août 2026" sections={sections} />;
}
