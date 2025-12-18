import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { StatCard } from "../ui/stat-card";
import { StatusBadge } from "../ui/status-badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const stats = [
    {
      title: "Contrats en attente",
      value: 12,
      icon: Clock,
      iconColor: "#FFC107",
      trend: { value: "+3 cette semaine", isPositive: true }
    },
    {
      title: "Signés ce mois",
      value: 28,
      icon: CheckCircle2,
      iconColor: "#4CAF50",
      trend: { value: "+15%", isPositive: true }
    },
    {
      title: "En retard",
      value: 3,
      icon: AlertCircle,
      iconColor: "#d4183d",
      trend: { value: "-2 vs mois dernier", isPositive: true }
    },
    {
      title: "Taux de complétion",
      value: "87%",
      icon: TrendingUp,
      iconColor: "#9C27B0",
      trend: { value: "+5%", isPositive: true }
    }
  ];

  const recentActivities = [
    { 
      id: 1, 
      type: "signed", 
      contract: "CDI - Sophie Martin", 
      time: "Il y a 2 heures",
      user: "SM"
    },
    { 
      id: 2, 
      type: "created", 
      contract: "Contrat Freelance - Pierre Dubois", 
      time: "Il y a 4 heures",
      user: "JD"
    },
    { 
      id: 3, 
      type: "reminder", 
      contract: "NDA - TechCorp", 
      time: "Il y a 1 jour",
      user: "TC"
    },
  ];

  const contractsNeedingAction = [
    { 
      id: 1, 
      name: "Contrat Commercial - ABC Corp", 
      parties: ["AC", "JD"], 
      dueDate: "Dans 2 jours",
      status: "pending" as const
    },
    { 
      id: 2, 
      name: "CDI - Marie Laurent", 
      parties: ["ML", "JD"], 
      dueDate: "Aujourd'hui",
      status: "pending" as const
    },
    { 
      id: 3, 
      name: "Contrat de Location", 
      parties: ["PD", "SM"], 
      dueDate: "En retard",
      status: "expired" as const
    },
  ];

  const chartData = [
    { month: 'Jan', contrats: 12 },
    { month: 'Fév', contrats: 19 },
    { month: 'Mar', contrats: 15 },
    { month: 'Avr', contrats: 25 },
    { month: 'Mai', contrats: 22 },
    { month: 'Jun', contrats: 28 },
  ];

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar currentPage="dashboard" onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">Bonjour, Jean 👋</h1>
            <p className="text-muted-foreground">
              Voici un aperçu de vos contrats aujourd'hui
            </p>
          </div>
          <Button 
            className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
            onClick={() => onNavigate('create-contract')}
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau contrat
          </Button>
        </div>

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
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-[#FFC107] text-[#212121]">
                      {activity.user}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">{activity.contract}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <StatusBadge 
                    status={activity.type === 'signed' ? 'signed' : 'pending'} 
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="mb-6">Actions rapides</h3>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigate('create-contract')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau contrat
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigate('templates')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Voir les modèles
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigate('team')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Inviter un membre
              </Button>
            </div>
          </Card>
        </div>

        {/* Contracts Needing Action */}
        <Card className="p-6 mb-8">
          <h3 className="mb-6">Contrats nécessitant une action</h3>
          <div className="space-y-3">
            {contractsNeedingAction.map((contract) => (
              <div 
                key={contract.id} 
                className="flex items-center gap-4 p-4 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                onClick={() => onNavigate('contract-details')}
              >
                <div className="flex -space-x-2">
                  {contract.parties.map((party, idx) => (
                    <Avatar key={idx} className="w-8 h-8 border-2 border-card">
                      <AvatarFallback className="bg-[#4CAF50] text-white text-xs">
                        {party}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{contract.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Échéance : {contract.dueDate}
                  </p>
                </div>
                <StatusBadge status={contract.status} />
              </div>
            ))}
          </div>
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
      </main>
    </div>
  );
}
