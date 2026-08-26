"use client";

import React from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";

interface NFTCardProps {
  tokenId: string;
  contractId: string;
  title: string;
  effectiveDate?: string;
  ipfsUrl?: string;
  /** The underlying contract's current status. The NFT itself never changes after mint —
   *  this only controls the notice shown alongside it, so a contract that's since been
   *  terminated/disputed doesn't look identical to one still fully in force. */
  contractStatus?: string;
}

const STALE_STATUS_LABELS: Record<string, string> = {
  DISPUTED: "Ce contrat fait actuellement l'objet d'un litige.",
  TERMINATED: "Ce contrat a été résilié.",
  CANCELLED: "Ce contrat a été annulé.",
  RESIGNED: "Ce contrat a fait l'objet d'une démission.",
};

export function NFTCard({
  tokenId,
  contractId,
  title,
  effectiveDate,
  ipfsUrl,
  contractStatus,
}: NFTCardProps) {
  const staleNotice = contractStatus ? STALE_STATUS_LABELS[contractStatus] : undefined;

  return (
    <div className="border border-border rounded-xl p-4 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="gap-1 border-[#FFC107] text-[#FFC107]">
          <ShieldCheck className="size-3.5" /> NFT Contract #{tokenId}
        </Badge>
        <span className="text-xs text-muted-foreground">ID: {contractId}</span>
      </div>

      {staleNotice && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 mb-3">
          <AlertTriangle className="size-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive leading-relaxed">
            {staleNotice} Ce certificat prouve la signature d'origine, pas l'état actuel du contrat.
          </p>
        </div>
      )}

      <h4 className="font-semibold text-base mb-2 line-clamp-1">{title}</h4>

      {effectiveDate && (
        <p className="text-xs text-muted-foreground mb-4">
          Finalisé le : {new Date(effectiveDate).toLocaleDateString()}
        </p>
      )}

      {ipfsUrl && (
        <a href={ipfsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
            <ExternalLink className="size-3.5" /> Voir l'acte sur IPFS
          </Button>
        </a>
      )}
    </div>
  );
}
