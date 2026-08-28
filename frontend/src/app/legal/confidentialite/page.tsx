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

      <h2>4. Sécurité</h2>
      <p>
        Les mots de passe ne sont jamais stockés : l'authentification passe par Privy, qui gère
        également la clé du portefeuille numérique de l'utilisateur sans que ContracTify n'y ait
        directement accès. Les échanges avec le service sont chiffrés en transit. Le détail complet
        des mesures techniques (chiffrement au repos, gestion des accès internes, journalisation)
        reste à documenter précisément avant publication définitive.
      </p>

      <h2>5. Transferts internationaux</h2>
      <p>
        Les prestataires tiers utilisés (Privy, Groq, Pinata) peuvent traiter ou stocker des
        données en dehors du pays de résidence de l'utilisateur. Les garanties applicables à ces
        transferts (clauses contractuelles types ou équivalent) restent à formaliser avec un
        professionnel du droit.
      </p>

      <h2>6. Conservation</h2>
      <p>
        Durées de conservation par type de donnée — à préciser avec un professionnel du droit.
        Distinction importante à retenir pour cette page : les données du compte (profil, e-mail)
        peuvent en principe être supprimées sur demande, alors que le hash du document, sa version
        archivée sur IPFS et les écritures de signature inscrites sur la blockchain sont, par
        nature, difficiles voire impossibles à supprimer rétroactivement une fois publiées — ce
        point doit être expliqué clairement à l'utilisateur avant toute signature, pas seulement
        dans cette politique.
      </p>

      <h2>7. Droits des personnes concernées</h2>
      <p>
        Modalités d'exercice des droits d'accès, de rectification et de suppression — à préciser
        avant publication définitive, y compris les limites propres aux données déjà ancrées sur
        la blockchain (voir section 6). Un utilisateur souhaitant exercer ces droits pourra, à
        terme, le faire via son compte ou en contactant ContracTify directement.
      </p>

      <h2>8. Contact</h2>
      <p>Adresse de contact pour toute question relative aux données personnelles — à compléter.</p>
    </LegalPage>
  );
}
