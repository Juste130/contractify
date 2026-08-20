"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { StatusBadge } from "../ui/status-badge";

import { Spinner } from "../ui/spinner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { contractsApi } from "@/lib/api/contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  FileText,
  Download,
  Archive,
  Trash2,
  AlertCircle
} from "lucide-react";

export function ContractsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: contractsData, isLoading, error } = useQuery({
    queryKey: ['contracts', 'cached', filterStatus],
    queryFn: () => contractsApi.getCachedContracts({
      status: filterStatus === "all" ? undefined : filterStatus.toUpperCase(),
      limit: 50
    }),
  });

  const contracts = contractsData?.contracts || [];

  const filteredContracts = contracts.filter((contract) => {
    return contract.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING_SIGNATURES': return 'pending';
      case 'ACTIVE': return 'signed';
      case 'COMPLETED': return 'completed';
      case 'CANCELLED': return 'cancelled';
      case 'DISPUTED': return 'disputed';
      default: return 'pending';
    }
  };

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar />

      <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">Mes contrats</h1>
            <p className="text-muted-foreground">
              Gérez tous vos contrats en un seul endroit
            </p>
          </div>
          <Link href="/create-contract">
            <Button
              className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouveau contrat
            </Button>
          </Link>
        </div>

        {/* Filters and Search */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Tous', id: 'all' },
                { label: 'En attente', id: 'pending_signatures' },
                { label: 'Signés', id: 'active' },
                { label: 'Complétés', id: 'completed' }
              ].map((btn) => (
                <Button
                  key={btn.id}
                  variant={filterStatus === btn.id ? "default" : "outline"}
                  onClick={() => setFilterStatus(btn.id)}
                  className={filterStatus === btn.id ? "bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]" : ""}
                >
                  {btn.label}
                </Button>
              ))}
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input-background"
              />
            </div>
          </div>
        </Card>

        {/* Contracts Table */}
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center bg-card rounded-lg border">
            <Spinner size="lg" label="Récupération de vos contrats..." />
          </div>
        ) : error ? (
          <Card className="p-12 text-center text-destructive">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Erreur lors du chargement des contrats.</p>
          </Card>
        ) : filteredContracts.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du contrat</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead>IPFS CID</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/contracts/${contract.contractId ?? contract.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FFC107]" />
                        <span className="font-medium">{contract.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs opacity-60">
                      {contract.ipfsHash ? `${contract.ipfsHash.slice(0, 10)}...` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={getStatusLabel(contract.status) as any} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/contracts/${contract.contractId ?? contract.id}`)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Détails
                          </DropdownMenuItem>
                          {contract.ipfsHash && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://gateway.pinata.cloud/ipfs/${contract.ipfsHash}`, '_blank');
                            }}>
                              <Download className="w-4 h-4 mr-2" />
                              Voir sur IPFS
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Archive className="w-4 h-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">Aucun contrat trouvé</h3>
              <p className="text-muted-foreground mb-6">
                Commencez par créer votre premier contrat avec
                l'aide de notre IA sécurisée.
              </p>
              <Link href="/create-contract">
                <Button
                  className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Créer un contrat
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}