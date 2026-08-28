import { LegalPage } from "@/components/pages/legal-page";

export default function Page() {
  return (
    <LegalPage title="Mentions légales" updatedAt="26 août 2026">
      <h2>Éditeur du site</h2>
      <p>
        <em>
          Raison sociale, forme juridique, adresse du siège, numéro d'immatriculation et
          directeur de la publication — à compléter par l'équipe ContracTify avant publication
          définitive. Ces informations sont obligatoires dans la plupart des juridictions avant
          toute mise en ligne d'un service à destination du public.
        </em>
      </p>

      <h2>Hébergement</h2>
      <p>Coordonnées de l'hébergeur de l'application et de l'infrastructure associée — à compléter.</p>

      <h2>Nature du service</h2>
      <p>
        ContracTify est une plateforme de rédaction assistée par IA, de signature électronique et
        d'archivage de contrats, s'appuyant sur le réseau blockchain Polygon pour l'horodatage et
        la preuve d'intégrité des documents. À la date de cette page, ContracTify fonctionne sur
        le réseau de test public Polygon Amoy, et non sur le réseau principal (mainnet) : les
        contrats et signatures y sont fonctionnels mais l'infrastructure blockchain sous-jacente
        n'est pas encore celle d'un environnement de production définitif.
      </p>

      <h2>Contrats générés par intelligence artificielle</h2>
      <p>
        Les contrats proposés par l'assistant de rédaction de ContracTify sont générés
        automatiquement à partir des informations fournies par l'utilisateur. Ils ne constituent
        pas un avis juridique et ne remplacent pas la relecture par un professionnel du droit
        compétent dans la juridiction concernée, en particulier pour tout contrat à enjeu
        significatif.
      </p>

      <h2>Contact</h2>
      <p>Adresse de contact pour toute question relative au service — à compléter.</p>
    </LegalPage>
  );
}
