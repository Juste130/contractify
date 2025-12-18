"use client";
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Shield,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  Wallet,
  Lock,
  Zap,
  Award,
  Download,
  Share,
  Copy,
  ExternalLink,
  User,
  Calendar,
  DollarSign,
  MapPin,
  Info
} from 'lucide-react';

interface SignerType {
    name: string,
    email: string,
    wallet: string,
    signed: boolean,
    signedAt: Date | null,
    isCurrentUser?: boolean
}
interface PaymentScheduleType {
    milestone: string, 
    amount: string, 
    percentage: number 
    dueDate: Date 
}
interface DetailType {
    amount: string,
    currency: string,
    startDate: Date,
    endDate: Date,
    description: string,
    deliverables: string[],
    paymentSchedule: PaymentScheduleType[],
}

interface ContractType {
    id: string,
    title: string,
    type: string,
    creator: SignerType,
    signers: SignerType[],
    details: DetailType,
    createdAt: Date,
    ipfsHash: string,
    status: string
}

const SignaturePage = () => {
  const [currentUser, setCurrentUser] = useState('alice@exemple.com');
  const [walletConnected, setWalletConnected] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [showContractDetails, setShowContractDetails] = useState(true);
  
  // Données simulées du contrat
  const contractData: ContractType = {
    id: "CTR-2024-002",
    title: "Mission Freelance - Application Mobile E-Commerce",
    type: "Freelance",
    creator: {
      name: "Alice Martin",
      email: "alice@techcorp.com",
      wallet: "0x1234...5678",
      signed: true,
      signedAt: new Date("2024-11-20T14:30:00Z")
    },
    signers: [
      {
        name: "Bob Johnson",
        email: "bob@startupxyz.com", 
        wallet: "0x8765...4321",
        signed: false,
        signedAt: null,
        isCurrentUser: true
      },
      {
        name: "Marie Dubois",
        email: "marie@witness.com",
        wallet: "0x9999...1111",
        signed: false,
        signedAt: null,
        isCurrentUser: false
      }
    ],
    details: {
      amount: "8,500",
      currency: "EUR",
      startDate: new Date("2024-12-01"),
      endDate: new Date("2024-03-15"),
      description: "Développement d'une application mobile e-commerce native iOS et Android avec backend API, système de paiement intégré et interface d'administration.",
      deliverables: [
        "Application iOS native (Swift)",
        "Application Android native (Kotlin)", 
        "API Backend (Node.js)",
        "Panel d'administration web",
        "Documentation technique complète",
        "Tests unitaires et fonctionnels"
      ],
      paymentSchedule: [
        { milestone: "Signature du contrat", amount: "2,125", percentage: 25, dueDate: new Date("2024-12-01") },
        { milestone: "Livraison MVP", amount: "2,550", percentage: 30, dueDate: new Date("2025-01-15") },
        { milestone: "Version Beta complète", amount: "2,550", percentage: 30, dueDate: new Date("2025-02-15") },
        { milestone: "Livraison finale", amount: "1,275", percentage: 15, dueDate: new Date("2025-03-15") }
      ]
    },
    createdAt: new Date("2024-11-20T10:00:00Z"),
    ipfsHash: "QmX4f8p2nS9R7gH3kL6dJ8qW5eT9mY1vU2cI7oB6fN3xA8s",
    status: "pending_signatures"
  };

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletConnected(true);
      } catch (error) {
        console.error('Erreur de connexion wallet:', error);
      }
    } else {
      alert('MetaMask n\'est pas installé');
    }
  };

  const handleSign = async () => {
    if (!walletConnected) {
      await handleConnectWallet();
      return;
    }

    setSigning(true);
    
    try {
      // Simulation de la signature MetaMask
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSigned(true);
    } catch (error) {
      console.error('Erreur de signature:', error);
    } finally {
      setSigning(false);
    }
  };

  const getSignatureStatus = () => {
    const totalSigners = contractData.signers.length + 1; // +1 pour le créateur
    const signedCount = [contractData.creator, ...contractData.signers]
      .filter(person => person.signed).length;
    
    return { signed: signedCount, total: totalSigners };
  };

  const currentUserSigner = contractData.signers.find(s => s.isCurrentUser);
  const { signed: signedCount, total: totalCount } = getSignatureStatus();
  const allSigned = signedCount === totalCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Retour</span>
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Signature de contrat</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {walletConnected ? (
                <div className="flex items-center space-x-2 bg-secondary-50 text-secondary-700 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">0x8765...4321</span>
                </div>
              ) : (
                <button 
                  onClick={handleConnectWallet}
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Connecter Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contrat Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* En-tête du contrat */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">💻</span>
                    <h2 className="text-2xl font-bold text-gray-900">{contractData.title}</h2>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{contractData.id}</span>
                    <span>•</span>
                    <span>{contractData.type}</span>
                    <span>•</span>
                    <span>Créé le {new Date(contractData.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Share className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Statut des signatures */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Progression des signatures</h3>
                  <span className="text-sm text-gray-600">{signedCount}/{totalCount} signatures</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(signedCount / totalCount) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">
                  {allSigned ? (
                    <span className="text-secondary-600 font-medium">✅ Toutes les signatures collectées</span>
                  ) : signed ? (
                    <span className="text-secondary-600 font-medium">✅ Vous avez signé ce contrat</span>
                  ) : (
                    <span className="text-accent-600 font-medium">⏳ Votre signature est requise</span>
                  )}
                </div>
              </div>
            </div>

            {/* Détails du contrat */}
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="p-6 border-b border-gray-200">
                <button
                  onClick={() => setShowContractDetails(!showContractDetails)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Détails du contrat</h3>
                  <Eye className={`w-5 h-5 text-gray-400 transition-transform ${showContractDetails ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {showContractDetails && (
                <div className="p-6 space-y-6">
                  {/* Informations générales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-primary-600" />
                        Informations financières
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Montant total:</span>
                          <span className="font-medium">{contractData.details.amount} {contractData.details.currency}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-secondary-600" />
                        Période
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Début:</span>
                          <span className="font-medium">{new Date(contractData.details.startDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fin:</span>
                          <span className="font-medium">{new Date(contractData.details.endDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Description du projet</h4>
                    <p className="text-gray-700 leading-relaxed">{contractData.details.description}</p>
                  </div>

                  {/* Livrables */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Livrables attendus</h4>
                    <ul className="space-y-2">
                      {contractData.details.deliverables.map((deliverable, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-secondary-500 mr-2 flex-shrink-0" />
                          {deliverable}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Échéancier de paiement */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Échéancier de paiement</h4>
                    <div className="space-y-3">
                      {contractData.details.paymentSchedule.map((payment, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{payment.milestone}</span>
                            <span className="font-semibold text-primary-600">
                              {payment.amount} {contractData.details.currency} ({payment.percentage}%)
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Échéance: {new Date(payment.dueDate).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Zone de signature */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Signature électronique</h3>
              
              {!signed ? (
                <div className="space-y-4">
                  <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-accent-900 mb-1">Avant de signer</h4>
                        <p className="text-sm text-accent-700">
                          Veuillez lire attentivement tous les termes du contrat. Votre signature sera 
                          enregistrée sur la blockchain et sera juridiquement contraignante.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mb-4">
                    <input 
                      type="checkbox" 
                      id="terms-agreement"
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="terms-agreement" className="text-sm text-gray-700">
                      J&apos;ai lu et j&apos;accepte tous les termes et conditions de ce contrat
                    </label>
                  </div>

                  <button
                    onClick={handleSign}
                    disabled={signing || !walletConnected}
                    className={`w-full flex items-center justify-center space-x-2 py-4 rounded-lg font-semibold transition-all ${
                      signing 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : walletConnected
                        ? 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {signing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signature en cours...</span>
                      </>
                    ) : !walletConnected ? (
                      <>
                        <Wallet className="w-5 h-5" />
                        <span>Connecter votre wallet pour signer</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        <span>Signer avec MetaMask</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                    <Lock className="w-3 h-3" />
                    <span>Signature cryptographique sécurisée</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-secondary-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Contrat signé avec succès !</h4>
                  <p className="text-gray-600 mb-4">
                    Votre signature a été enregistrée sur la blockchain le {new Date().toLocaleString('fr-FR')}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Hash de transaction:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-gray-900">0xabc123...def789</span>
                        <button className="text-primary-600 hover:text-primary-700">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Statut et Parties */}
          <div className="space-y-6">
            {/* Statut du contrat */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Statut du contrat</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">État:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700 border border-accent-200">
                    En attente de signatures
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Blockchain:</span>
                  <span className="text-sm font-medium text-gray-900">Polygon</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stockage:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">IPFS</span>
                    <button className="text-primary-600 hover:text-primary-700">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Parties prenantes */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Parties prenantes</h3>
              
              <div className="space-y-4">
                {/* Créateur */}
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">{contractData.creator.name}</p>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">Créateur</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{contractData.creator.email}</p>
                    <div className="flex items-center space-x-2">
                      {contractData.creator.signed ? (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-secondary-500" />
                          <span className="text-xs text-secondary-700">
                            Signé le {contractData?.creator?.signedAt?.toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-accent-500" />
                          <span className="text-xs text-accent-700">En attente</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Signataires */}
                {contractData.signers.map((signer, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      signer.isCurrentUser ? 'bg-accent-100' : 'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${
                        signer.isCurrentUser ? 'text-accent-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{signer.name}</p>
                        {signer.isCurrentUser && (
                          <span className="text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded">Vous</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{signer.email}</p>
                      <div className="flex items-center space-x-2">
                        {signer.signed || (signer.isCurrentUser && signed) ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-secondary-500" />
                            <span className="text-xs text-secondary-700">
                              Signé {signer.isCurrentUser && signed ? 'maintenant' : `le ${signer?.signedAt?.toLocaleDateString('fr-FR')}`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-accent-500" />
                            <span className="text-xs text-accent-700">En attente</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions après signature */}
            {(signed || allSigned) && (
              <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Award className="w-6 h-6 text-secondary-600" />
                  <h3 className="font-semibold text-secondary-900">Prochaines étapes</h3>
                </div>
                
                {allSigned ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-secondary-600" />
                      <span className="text-sm text-secondary-700">Génération du NFT de preuve en cours...</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-secondary-600" />
                      <span className="text-sm text-secondary-700">Activation des paiements automatiques</span>
                    </div>
                    <button className="w-full bg-secondary-500 text-white py-2 rounded-lg hover:bg-secondary-600 transition-colors text-sm">
                      Voir le tableau de bord
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-secondary-700">
                      Votre signature a été enregistrée. En attente des autres signataires.
                    </p>
                    <button className="w-full bg-secondary-500 text-white py-2 rounded-lg hover:bg-secondary-600 transition-colors text-sm">
                      Suivre le processus
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePage;
                