"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Server, AlertCircle, CheckCircle, Activity, XCircle } from "lucide-react";

export function AdminSystemPage() {
    const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline'>('loading');
    const [dbStatus, setDbStatus] = useState<'loading' | 'online' | 'offline'>('loading');

    useEffect(() => {
        const checkHealth = async () => {
            try {
                await apiClient.get('/api/users?limit=1');
                setApiStatus('online');
                setDbStatus('online');
            } catch {
                setApiStatus('offline');
                setDbStatus('offline');
            }
        };
        checkHealth();
    }, []);

    const StatusBadge = ({ status }: { status: 'loading' | 'online' | 'offline' }) => {
        if (status === 'loading') return <Badge className="bg-gray-400 text-white">Chargement…</Badge>;
        if (status === 'online') return <Badge className="bg-[#4CAF50] text-white"><CheckCircle className="w-3 h-3 mr-1" />En ligne</Badge>;
        return <Badge className="bg-destructive text-white"><XCircle className="w-3 h-3 mr-1" />Hors ligne</Badge>;
    };

    return (
        <div className="flex min-h-screen bg-muted">
            <AppSidebar />

            <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
                <div className="mb-8">
                    <h1 className="mb-2">Paramètres système</h1>
                    <p className="text-muted-foreground">
                        Configuration et gestion du système
                    </p>
                </div>

                {/* System Status */}
                <Card className="p-6 mb-6">
                    <h3 className="mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        État du système
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                            <div>
                                <p className="text-sm text-muted-foreground">API Backend</p>
                                <p className="font-medium">{apiStatus === 'online' ? 'Opérationnel' : apiStatus === 'loading' ? 'Vérification…' : 'Inaccessible'}</p>
                            </div>
                            <StatusBadge status={apiStatus} />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                            <div>
                                <p className="text-sm text-muted-foreground">Blockchain</p>
                                <p className="font-medium">Connecté</p>
                            </div>
                            <Badge className="bg-[#4CAF50] text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Actif
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                            <div>
                                <p className="text-sm text-muted-foreground">Base de données</p>
                                <p className="font-medium">{dbStatus === 'online' ? 'Sain' : dbStatus === 'loading' ? 'Vérification…' : 'Erreur'}</p>
                            </div>
                            <StatusBadge status={dbStatus} />
                        </div>
                    </div>
                </Card>

                {/* Emergency Admin */}
                <Card className="p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-[#9C27B0]" />
                        <h3>Emergency Admin</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Gérez l'administrateur d'urgence du smart contract
                    </p>
                    <div className="bg-muted p-4 rounded-lg mb-4">
                        <p className="text-sm text-muted-foreground mb-1">Adresse actuelle</p>
                        <p className="font-mono text-sm">0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb</p>
                    </div>
                    <Button variant="outline">
                        Modifier l'Emergency Admin
                    </Button>
                </Card>

                {/* Feature Flags */}
                <Card className="p-6 mb-6">
                    <h3 className="mb-4">Fonctionnalités</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="mb-1">Génération IA</h4>
                                <p className="text-sm text-muted-foreground">
                                    Activer la génération automatique de contrats par IA
                                </p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="mb-1">Signature électronique</h4>
                                <p className="text-sm text-muted-foreground">
                                    Permettre la signature électronique des contrats
                                </p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="mb-1">Blockchain</h4>
                                <p className="text-sm text-muted-foreground">
                                    Enregistrer les contrats sur la blockchain
                                </p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </div>
                </Card>

                {/* Maintenance Mode */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Server className="w-5 h-5 text-[#FFC107]" />
                        <h3>Mode maintenance</h3>
                    </div>
                    <div className="bg-[#FFC107]/10 border border-[#FFC107]/20 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-[#FFC107] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium mb-1">Attention</p>
                                <p className="text-sm text-muted-foreground">
                                    Activer le mode maintenance empêchera tous les utilisateurs (sauf les admins) d'accéder à la plateforme.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="mb-1">Activer le mode maintenance</h4>
                            <p className="text-sm text-muted-foreground">
                                La plateforme sera inaccessible aux utilisateurs
                            </p>
                        </div>
                        <Switch />
                    </div>
                </Card>
            </main>
        </div>
    );
}
