"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle } from "lucide-react";

export function AdminAnalyticsPage() {
    // Mock data for charts
    const userGrowthData = [
        { month: 'Jan', users: 10 },
        { month: 'Fév', users: 15 },
        { month: 'Mar', users: 25 },
        { month: 'Avr', users: 35 },
        { month: 'Mai', users: 42 },
        { month: 'Juin', users: 50 },
    ];

    const contractsData = [
        { month: 'Jan', created: 5, signed: 3 },
        { month: 'Fév', created: 8, signed: 6 },
        { month: 'Mar', created: 12, signed: 10 },
        { month: 'Avr', created: 15, signed: 12 },
        { month: 'Mai', created: 18, signed: 15 },
        { month: 'Juin', created: 22, signed: 20 },
    ];

    return (
        <div className="flex min-h-screen bg-muted">
            <AppSidebar />

            <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
                <div className="mb-8">
                    <h1 className="mb-2">Analytics</h1>
                    <p className="text-muted-foreground">
                        Statistiques et tendances de la plateforme
                    </p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#4CAF50]/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-[#4CAF50]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Utilisateurs totaux</p>
                                <p className="text-2xl font-bold">50</p>
                                <p className="text-xs text-[#4CAF50] flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +15% ce mois
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#FFC107]/10 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-[#FFC107]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Contrats créés</p>
                                <p className="text-2xl font-bold">22</p>
                                <p className="text-xs text-[#4CAF50] flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +22% ce mois
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#9C27B0]/10 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-[#9C27B0]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Taux de signature</p>
                                <p className="text-2xl font-bold">91%</p>
                                <p className="text-xs text-[#4CAF50] flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +5% ce mois
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#2196F3]/10 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-[#2196F3]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Croissance</p>
                                <p className="text-2xl font-bold">+18%</p>
                                <p className="text-xs text-muted-foreground">vs mois dernier</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="mb-4">Croissance des utilisateurs</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={userGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="users" stroke="#FFC107" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card className="p-6">
                        <h3 className="mb-4">Contrats créés vs signés</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={contractsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="created" fill="#FFC107" />
                                <Bar dataKey="signed" fill="#4CAF50" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            </main>
        </div>
    );
}
