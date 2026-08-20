"use client";

import React from "react";
import { NFTCard } from "./NFTCard";

interface NFTItem {
  tokenId: string;
  contractId: string;
  title: string;
  effectiveDate?: string;
  ipfsUrl?: string;
}

interface NFTGalleryProps {
  nfts: NFTItem[];
}

export function NFTGallery({ nfts }: NFTGalleryProps) {
  if (!nfts || nfts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl p-6">
        Aucun NFT d'acte contractuel disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {nfts.map((nft) => (
        <NFTCard key={nft.tokenId} {...nft} />
      ))}
    </div>
  );
}
