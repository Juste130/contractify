'use client';
import React, { useState, useEffect } from 'react';
import { 
  Plus,
  FileText, 
  Shield, 
  TrendingUp,
  Bell,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Download,
  CheckCircle,
  Clock,
  Award,
  Calendar,
  Zap,
  User
} from 'lucide-react';

export interface Contract {
    id: string;
    title: string;
    type: "CDI" | "Freelance" | "Location" | "Partenariat";
    status: "active" | "signed" | "pending" | "draft" | "expired";
    parties: string[];
    amount: string;
    progress: number;
    nft: boolean;
    nextAction: string | null;
    createdAt: string;
}


export interface stats {
    title: string;
    value: string;
    change: string;
    changeType: "positive" | "negative" | "warning";
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
}


export default function DashboardComponent() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [walletConnected, setWalletConnected] = useState(true);

  // Données simulées
  const stats: stats[] = [
    {
      title: "Contrats Total",
      value: "12",
      change: "+3 ce mois",
      changeType: "positive",
      icon: FileText,
      color: "bg-primary-50 text-primary-600"
    },
    {
      title: "Contrats Actifs", 
      value: "8",
      change: "+2 cette semaine",
      changeType: "positive",
      icon: CheckCircle,
      color: "bg-secondary-50 text-secondary-600"
    },
    {
      title: "En Attente",
      value: "3",
      change: "1 expire bientôt",
      changeType: "warning",
      icon: Clock,
      color: "bg-accent-50 text-accent-600"
    },
    {
      title: "NFTs Générés",
      value: "9",
      change: "+1 aujourd'hui", 
      changeType: "positive",
      icon: Award,
      color: "bg-purple-50 text-purple-600"
    }
  ];

  const contracts: Contract[] = [
    {
      id: "CTR-2024-001",
      title: "Contrat CDI - Développeur Frontend",
      type: "CDI",
      status: "active",
      parties: ["Alice Martin", "TechCorp SARL"],
      createdAt: "2024-11-15",
      amount: "45,000 €",
      progress: 100,
      nft: true,
      nextAction: null
    },
    {
      id: "CTR-2024-002",
      title: "Mission Freelance - App Mobile",
      type: "Freelance", 
      status: "pending",
      parties: ["Bob Johnson", "StartupXYZ"],
      createdAt: "2024-11-20",
      amount: "8,500 €",
      progress: 75,
      nft: false,
      nextAction: "Signature en attente"
    },
    {
      id: "CTR-2024-003",
      title: "Bail Commercial - Bureau Tech",
      type: "Location",
      status: "signed",
      parties: ["Marie Dubois", "Immobilier Plus"],
      createdAt: "2024-11-10", 
      amount: "2,400 €/mois",
      progress: 100,
      nft: true,
      nextAction: "Paiement le 01/12"
    },
    {
      id: "CTR-2024-004",
      title: "Partenariat Commercial",
      type: "Partenariat",
      status: "draft",
      parties: ["Jean Dupont", "Innovation Corp"],
      createdAt: "2024-11-22",
      amount: "25,000 €",
      progress: 30,
      nft: false,
      nextAction: "Finaliser les termes"
    }
  ];

  const getStatusBadge = (status: 'active' | 'signed' | 'pending' | 'draft' | 'expired') => {
    const variants = {
      active: "bg-secondary-100 text-secondary-700 border-secondary-200",
      signed: "bg-secondary-100 text-secondary-700 border-secondary-200",
      pending: "bg-accent-100 text-accent-700 border-accent-200",
      draft: "bg-gray-100 text-gray-700 border-gray-200",
      expired: "bg-red-100 text-red-700 border-red-200"
    };
    
    const labels = {
      active: "Actif",
      signed: "Signé", 
      pending: "En attente",
      draft: "Brouillon",
      expired: "Expiré"
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeIcon = (type: 'CDI' | 'Freelance' | 'Location' | 'Partenariat') => {
    const icons = {
      CDI: "👔",
      Freelance: "💻", 
      Location: "🏠",
      Partenariat: "🤝"
    };
    return icons[type] || "📄";
  };

  const filteredContracts = contracts.filter(contract => {
    if (activeFilter !== 'all' && contract.status !== activeFilter) return false;
    if (searchTerm && !contract.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bonjour, Alice ! 👋
          </h1>
          <p className="text-gray-600">
            Voici un aperçu de vos contrats et activités récentes
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    stat.changeType === 'positive' ? 'bg-secondary-100 text-secondary-700' :
                    stat.changeType === 'warning' ? 'bg-accent-100 text-accent-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-gray-600 text-sm">{stat.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contracts Section */}
        <div className="bg-white border border-gray-200 rounded-xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Mes Contrats</h2>
              <button className="flex items-center space-x-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Nouveau contrat</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                {[
                  { key: 'all', label: 'Tous' },
                  { key: 'active', label: 'Actifs' },
                  { key: 'pending', label: 'En attente' },
                  { key: 'draft', label: 'Brouillons' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      activeFilter === filter.key
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filtres</span>
              </button>
            </div>
          </div>

          {/* Contracts List */}
          <div className="divide-y divide-gray-200">
            {filteredContracts.map((contract) => (
              <div key={contract.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Type Icon */}
                    <div className="text-2xl">{getTypeIcon(contract.type)}</div>
                    
                    {/* Contract Info */}
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{contract.title}</h3>
                        {getStatusBadge(contract.status)}
                        {contract.nft && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 border border-purple-200">
                            <Award className="w-3 h-3 mr-1" />
                            NFT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{contract.id}</span>
                        <span>•</span>
                        <span>{contract.type}</span>
                        <span>•</span>
                        <span>{contract.createdAt}</span>
                        <span>•</span>
                        <span className="font-medium">{contract.amount}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500">Parties:</span>
                        {contract.parties.map((party, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {party}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    {/* Progress */}
                    <div className="hidden lg:flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${contract.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 w-8">{contract.progress}%</span>
                    </div>

                    {/* Next Action */}
                    {contract.nextAction && (
                      <div className="hidden md:block">
                        <span className="text-xs text-accent-600 bg-accent-50 px-2 py-1 rounded">
                          {contract.nextAction}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredContracts.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contrat trouvé</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Aucun résultat pour votre recherche' : 'Commencez par créer votre premier contrat'}
              </p>
              <button className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors">
                Créer un contrat
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Zap className="w-8 h-8 text-primary-600" />
              <h3 className="font-semibold text-primary-900">Actions rapides</h3>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left text-sm text-primary-700 hover:text-primary-900 transition-colors">
                → Créer un contrat CDI
              </button>
              <button className="w-full text-left text-sm text-primary-700 hover:text-primary-900 transition-colors">
                → Mission freelance
              </button>
              <button className="w-full text-left text-sm text-primary-700 hover:text-primary-900 transition-colors">
                → Bail de location
              </button>
            </div>
          </div>

          <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-8 h-8 text-secondary-600" />
              <h3 className="font-semibold text-secondary-900">Statistiques</h3>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-secondary-700">Taux de signature: <span className="font-semibold">94%</span></p>
              <p className="text-sm text-secondary-700">Temps moyen: <span className="font-semibold">2.3 jours</span></p>
              <p className="text-sm text-secondary-700">NFTs générés: <span className="font-semibold">9/12</span></p>
            </div>
          </div>

          <div className="bg-accent-50 border border-accent-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="w-8 h-8 text-accent-600" />
              <h3 className="font-semibold text-accent-900">Échéances</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-accent-700">Paiement LOCATION-003: <span className="font-semibold">01/12</span></p>
              <p className="text-sm text-accent-700">Signature FREELANCE-002: <span className="font-semibold">En attente</span></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
