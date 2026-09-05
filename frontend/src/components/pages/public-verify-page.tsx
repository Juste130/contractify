"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { contractsApi } from "@/lib/api/contracts";
import { SealMark } from "@/components/layout/seal-mark";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { getStatusBadgeVariant } from "@/lib/contract-status";
import { formatReference } from "@/lib/utils/contractNaming";
import { CheckCircle2, Clock, XCircle, ShieldCheck } from "lucide-react";

interface PublicVerifyPageProps {
  id: string;
}

interface VerificationData {
  title: string;
  reference: number;
  status: string;
  createdAt: string;
  contractId: number | null;
  sha256Hash: string | null;
  isExternalPdf: boolean;
  signatories: { name: string | null; hasSigned: boolean }[];
}

export function PublicVerifyPage({ id }: PublicVerifyPageProps) {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contractsApi.getPublicVerification(id)
      .then(setData)
      .catch(() => setError("Ce contrat est introuvable, ou l'identifiant fourni n'est pas valide."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="border-b border-border bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-2">
          <SealMark className="w-8 h-8 shrink-0" />
          <span className="text-[#FFC107] text-lg font-bold tracking-tight">ContracTify</span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-1">Vérification de contrat</h1>
            <p className="text-sm text-muted-foreground">
              Cette page confirme l'existence et le statut d'un contrat ancré sur ContracTify — sans nécessiter de compte.
            </p>
          </div>

          {loading ? (
            <Card className="p-10 flex justify-center">
              <Spinner size="md" label="Recherche du contrat…" />
            </Card>
          ) : error || !data ? (
            <Card className="p-8 text-center">
              <XCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-lg leading-snug">{data.title}</h2>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatReference(data.reference)}</p>
                </div>
                <StatusBadge status={getStatusBadgeVariant(data.status)} className="shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Créé le</p>
                  <p>{new Date(data.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Ancrage blockchain</p>
                  <p>{data.contractId ? `Polygon Amoy · ID ${data.contractId}` : "En attente de déploiement"}</p>
                </div>
              </div>

              {/* Le CID IPFS n'est volontairement pas affiché ici : c'est la clé d'accès
                  directe au document complet (original importé ou texte intégral), pas un
                  simple identifiant. Cette page est publique et sans compte — seule
                  l'empreinte SHA-256 (une preuve d'intégrité, pas un moyen d'accès) y
                  figure. Le CID reste consultable depuis la page de détail authentifiée. */}
              {data.sha256Hash && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Empreinte SHA-256</p>
                  <p className="font-mono text-xs bg-muted px-2 py-1.5 rounded break-all">{data.sha256Hash}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Signataires</p>
                <div className="space-y-2">
                  {data.signatories.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
                      <span>{s.name || "Signataire"}</span>
                      {s.hasSigned ? (
                        <span className="flex items-center gap-1 text-[#4CAF50] font-medium text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Signé
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Clock className="w-3.5 h-3.5" /> En attente
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center mt-6">
            <Link href="/" className="hover:underline">ContracTify</Link> — contrats ancrés sur la blockchain Polygon.
          </p>
        </div>
      </main>
    </div>
  );
}
