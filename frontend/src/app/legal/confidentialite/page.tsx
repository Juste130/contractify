import { LegalPage } from "@/components/pages/legal-page";

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="26 août 2026">
      <h2>1. Données collectées</h2>
      <p>
        ContracTify collecte l'adresse e-mail utilisée à l'inscription, les informations saisies
        dans les contrats (identités et coordonnées des parties, clauses, montants), les documents
        téléversés, et les métadonnées techniques nécessaires à la sécurité du service (journaux
        de connexion, adresse de portefeuille numérique).
      </p>

      <h2>2. Sous-traitants et services tiers</h2>
      <p>
        Le service s'appuie sur des prestataires tiers pour fonctionner : Privy (authentification
        et gestion du portefeuille numérique), Groq (génération assistée par IA du texte des
        contrats), Pinata/IPFS (stockage décentralisé des documents), et le réseau Polygon
        (horodatage blockchain). Les documents ancrés sur IPFS et les données inscrites sur la
        blockchain sont, par nature, difficiles voire impossibles à supprimer rétroactivement.
      </p>

      <h2>3. Finalité du traitement</h2>
      <p>
        Les données sont utilisées pour créer, faire signer et archiver les contrats de
        l'utilisateur, sécuriser son compte, et lui adresser les notifications liées à ses
        contrats (demande de signature, changement de statut, litige).
      </p>

      <h2>4. Conservation</h2>
      <p>
        Durées de conservation par type de donnée — à préciser avec un professionnel du droit,
        en tenant compte du fait qu'une partie des données (hash et documents ancrés on-chain ou
        sur IPFS) n'est techniquement pas supprimable après publication.
      </p>

      <h2>5. Droits des personnes concernées</h2>
      <p>
        Modalités d'exercice des droits d'accès, de rectification et de suppression — à préciser
        avant publication définitive, y compris les limites propres aux données déjà ancrées sur
        la blockchain.
      </p>

      <h2>6. Contact</h2>
      <p>Adresse de contact pour toute question relative aux données personnelles — à compléter.</p>
    </LegalPage>
  );
}
