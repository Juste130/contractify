import { LegalPage } from "@/components/pages/legal-page";

export default function Page() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updatedAt="26 août 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l'accès et l'utilisation de ContracTify, un service de
        création, signature électronique et archivage de contrats s'appuyant sur une intelligence
        artificielle et sur le réseau blockchain Polygon.
      </p>

      <h2>2. Ce que ContracTify fait — et ne fait pas</h2>
      <p>
        La rédaction assistée par IA propose un texte de contrat à partir des informations
        fournies ; elle ne constitue pas un avis juridique et ne se substitue pas à l'examen d'un
        professionnel du droit, en particulier pour un engagement à enjeu significatif.
      </p>
      <p>
        La signature réalisée sur ContracTify confirme l'identité de l'utilisateur via son compte
        et son portefeuille numérique déjà connectés à la session ; elle ne constitue pas une
        vérification d'identité par pièce officielle. La valeur juridique de cette signature
        dépend du cadre légal applicable dans le pays du contrat concerné.
      </p>
      <p>
        L'ancrage blockchain assure l'horodatage et l'intégrité du document signé (toute
        modification ultérieure du texte est détectable). ContracTify fonctionne actuellement sur
        Polygon Amoy, un réseau de test public, en amont d'un déploiement sur le réseau principal.
      </p>

      <h2>3. Compte et portefeuille numérique</h2>
      <p>
        L'inscription entraîne la création automatique d'un portefeuille numérique associé au
        compte de l'utilisateur, utilisé pour signer les contrats sur la blockchain. L'utilisateur
        reste responsable de la confidentialité de l'accès à son compte.
      </p>

      <h2>4. Séquestre (escrow) et litiges</h2>
      <p>
        La fonctionnalité de séquestre de fonds entre parties, lorsqu'elle est proposée dans un
        contrat, n'est pas encore active en production à la date de cette page : aucun fonds réel
        n'est aujourd'hui déplacé via cette fonctionnalité. Le signalement d'un litige sur un
        contrat suspend, côté ContracTify, la libération automatique ou anticipée d'un séquestre
        associé, en attendant sa résolution. La résolution d'un litige signalé est examinée par
        l'équipe ContracTify ; elle ne constitue pas une décision arbitrale ou judiciaire.
      </p>

      <h2>5. Résiliation et suspension</h2>
      <p>
        ContracTify peut suspendre l'accès à la plateforme en cas d'incident technique ou de
        sécurité affectant l'ensemble du service. Cette suspension est distincte de la résiliation
        d'un contrat individuel entre utilisateurs, qui reste régie par les clauses propres à ce
        contrat.
      </p>

      <h2>6. Responsabilité</h2>
      <p>À préciser avec un professionnel du droit avant publication définitive.</p>

      <h2>7. Droit applicable</h2>
      <p>À préciser selon les juridictions effectivement desservies par ContracTify.</p>
    </LegalPage>
  );
}
