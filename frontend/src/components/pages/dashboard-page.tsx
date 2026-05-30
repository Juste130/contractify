"use client";

import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { StatCard } from "../ui/stat-card";
import { StatusBadge } from "../ui/status-badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Spinner } from "../ui/spinner";
import { FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from "next/link";
import { useAuthStore } from "@/hooks/useAuth";
import { contractsApi } from "@/lib/api/contracts";
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { fr } from 'date-fns/locale';

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: contractsData, isLoading, error } = useQuery({
    queryKey: ['contracts', 'cached'],
    queryFn: () => contractsApi.getCachedContracts({ limit: 10 }),
  });

  const contracts = contractsData?.contracts || [];

  // Calcul du résumé des stats
  const pendingCount = contracts.filter(c => c.status === 'PENDING_SIGNATURES').length;
  const activeCount = contracts.filter(c => c.status === 'ACTIVE').length;
  const totalCount = contracts.length;

  const stats = [
    {
      title: "Contrats en attente",
      value: pendingCount,
      icon: Clock,
      iconColor: "#FFC107",
      trend: { value: "Nécessite action", isPositive: false }
    },
    {
      title: "Contrats Actifs",
      value: activeCount,
      icon: CheckCircle2,
      iconColor: "#4CAF50",
      trend: { value: "Total: " + totalCount, isPositive: true }
    },
    {
      title: "Documents IPFS",
      value: contracts.filter(c => c.ipfsHash).length,
      icon: FileText,
      iconColor: "#2196F3",
      trend: { value: "Sécurisés", isPositive: true }
    },
    {
      title: "Engagement",
      value: totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : "0%",
      icon: TrendingUp,
      iconColor: "#9C27B0",
      trend: { value: "Taux d'achèvement", isPositive: true }
    }
  ];

  const recentActivities = contracts.slice(0, 5).map(c => ({
    id: c.id,
    type: c.status === 'ACTIVE' ? 'signed' : 'created',
    contract: c.title,
    time: formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: fr }),
    user: c.title.substring(0, 2).toUpperCase()
  }));

  const chartData = [
    { month: 'Jan', contrats: 12 },
    { month: 'Fév', contrats: 19 },
    { month: 'Mar', contrats: 15 },
    { month: 'Avr', contrats: 25 },
    { month: 'Mai', contrats: 22 },
    { month: 'Jun', contrats: totalCount },
  ];

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar />

      <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">Bonjour, {user?.email.split('@')[0]} 👋</h1>
            <p className="text-muted-foreground">
              Voici un aperçu de vos contrats aujourd'hui
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

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" label="Chargement de vos données..." />
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-destructive">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Erreur lors de la récupération des contrats. Veuillez réessayer.</p>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Recent Activities */}
              <Card className="lg:col-span-2 p-6">
                <h3 className="mb-6">Activités récentes</h3>
                {recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-[#FFC107] text-[#212121]">
                            {activity.user}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.contract}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                        <StatusBadge
                          status={activity.type === 'signed' ? 'signed' : 'pending'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune activité récente. Créez votre premier contrat pour commencer !
                  </div>
                )}
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="mb-6">Actions rapides</h3>
                <div className="space-y-3">
                  <Link href="/create-contract">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nouveau contrat
                    </Button>
                  </Link>
                  <Link href="/templates">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Voir les modèles
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Configurer mon wallet
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* Contracts Needing Action */}
            <Card className="p-6 mb-8">
              <h3 className="mb-6">Contrats nécessitant une action</h3>
              {contracts.filter(c => c.status === 'PENDING_SIGNATURES').length > 0 ? (
                <div className="space-y-3">
                  {contracts
                    .filter(c => c.status === 'PENDING_SIGNATURES')
                    .slice(0, 3)
                    .map((contract) => (
                      <Link href={`/contracts/${contract.contractId}`} key={contract.id}>
                        <div
                          className="flex items-center gap-4 p-4 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{contract.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Créé le {new Date(contract.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status="pending" />
                        </div>
                      </Link>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Tout est à jour ! Aucun document en attente.
                </div>
              )}
            </Card>

            {/* Progress Chart */}
            <Card className="p-6">
              <h3 className="mb-6">Progression mensuelle</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis dataKey="month" stroke="#9E9E9E" />
                    <YAxis stroke="#9E9E9E" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #E5E5E5',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="contrats"
                      stroke="#FFC107"
                      strokeWidth={3}
                      dot={{ fill: '#FFC107', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}


