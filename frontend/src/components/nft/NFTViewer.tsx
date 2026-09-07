"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { NFTCard } from "./NFTCard";
import { Eye } from "lucide-react";

interface NFTViewerProps {
  tokenId: string;
  contractId: string;
  title: string;
  effectiveDate?: string;
  ipfsUrl?: string;
  contractStatus?: string;
}

export function NFTViewer(props: NFTViewerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="size-4" /> Détails du certificat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Certificat d'authenticité</DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          <NFTCard {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
