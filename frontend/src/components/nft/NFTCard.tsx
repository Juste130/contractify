"use client";

import React from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ExternalLink, ShieldCheck } from "lucide-react";

interface NFTCardProps {
  tokenId: string;
  contractId: string;
  title: string;
  effectiveDate?: string;
  ipfsUrl?: string;
}

export function NFTCard({
  tokenId,
  contractId,
  title,
  effectiveDate,
  ipfsUrl,
}: NFTCardProps) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="gap-1 border-[#FFC107] text-[#FFC107]">
          <ShieldCheck className="size-3.5" /> NFT Contract #{tokenId}
        </Badge>
        <span className="text-xs text-muted-foreground">ID: {contractId}</span>
      </div>

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
