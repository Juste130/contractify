"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FileText, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

export function AdminContractsPage() {
    const [contracts, setContracts] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const response = await apiClient.get('/api/contracts/admin/all');
                const mappedContracts = response.data.contracts.map((c: any) => ({
                    id: c.contractId || c.id,
                    title: c.title || (c.metadata?.title) || "Sans titre",
                    type: c.metadata?.type || "Standard",
                    user: c.user?.email || "Inconnu",
                    status: c.status?.toLowerCase() || 'pending',
                    createdAt: c.createdAt,
                    createdDate: new Date(c.createdAt).toLocaleDateString('fr-FR'),
                    signedDate: c.status === 'ACTIVE' || c.status === 'COMPLETED' ? new Date(c.lastSync).toLocaleDateString('fr-FR') : null,
                }));
                setContracts(mappedContracts);
            } catch (error) {
                console.error("Error fetching contracts:", error);
            }
        };
        fetchContracts();
    }, []);

    const thisMonthCount = contracts.filter((c) => {
        const created = new Date(c.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
            case "completed":
                return <Badge className="bg-[#4CAF50] text-white"><CheckCircle className="w-3 h-3 mr-1" />Signé</Badge>;
            case "pending_signatures":
                return <Badge className="bg-[#FFC107] text-[#212121]"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
            case "draft_waiting_signers":
            case "ready_to_deploy":
                return <Badge className="bg-[#9E9E9E] text-white"><FileText className="w-3 h-3 mr-1" />Brouillon</Badge>;
            case "disputed":
            case "terminated":
            case "cancelled":
                return <Badge className="bg-destructive text-white"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
            default:
                return <Badge><AlertCircle className="w-3 h-3 mr-1" />{status}</Badge>;
        }
    };

    return (
        <div className="flex min-h-screen bg-muted">
            <AppSidebar />

            <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="mb-2">Tous les contrats</h1>
                        <p className="text-muted-foreground">
                            Vue d'ensemble de tous les contrats de la plateforme
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Total contrats</p>
                        <p className="text-3xl">{contracts.length}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Signés</p>
                        <p className="text-3xl">{contracts.filter(c => c.status === 'active' || c.status === 'completed').length}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">En attente</p>
                        <p className="text-3xl">{contracts.filter(c => c.status === 'pending_signatures').length}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Ce mois</p>
                        <p className="text-3xl">{thisMonthCount}</p>
                    </Card>
                </div>

                {/* Contracts Table */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Titre</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Créé le</TableHead>
                                <TableHead>Signé le</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.map((contract) => (
                                <TableRow
                                    key={contract.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/contract-details?id=${contract.id}`)}
                                >
                                    <TableCell className="font-medium">{contract.title}</TableCell>
                                    <TableCell>{contract.type}</TableCell>
                                    <TableCell>{contract.user}</TableCell>
                                    <TableCell>{contract.createdDate}</TableCell>
                                    <TableCell>{contract.signedDate || '-'}</TableCell>
                                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </main>
        </div>
    );
}
