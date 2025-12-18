'use client';
import React, { useState, useEffect } from 'react';
import { 
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Wallet,
  ArrowRight,
  AlertCircle,
  Loader,
} from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginError {
  field?: string;
  message: string;
}
interface EthereumProviderError extends Error {
  code: number;
  message: string;
  data?: unknown;
}

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [walletConnecting, setWalletConnecting] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email) {
      setError({ field: 'email', message: 'L\'email est requis' });
      return false;
    }
    
    if (!formData.email.includes('@')) {
      setError({ field: 'email', message: 'Format d\'email invalide' });
      return false;
    }
    
    if (!formData.password) {
      setError({ field: 'password', message: 'Le mot de passe est requis' });
      return false;
    }
    
    if (formData.password.length < 6) {
      setError({ field: 'password', message: 'Le mot de passe doit contenir au moins 6 caractères' });
      return false;
    }
    
    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Simulation de l'authentification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ici on appellerait l'API de connexion
      console.log('Connexion email/password:', formData);
      
      // Redirection vers dashboard
      // router.push('/dashboard');
      
    } catch (err) {
      setError({ message: 'Erreur de connexion. Vérifiez vos identifiants.' });
    } finally {
      setIsLoading(false);
    }
  };

  // const handleWalletConnect = async (): Promise<void> => {
  //   if (typeof window.ethereum === 'undefined') {
  //     setError({ message: 'MetaMask n\'est pas installé. Veuillez l\'installer pour continuer.' });
  //     return;
  //   }

  //   setWalletConnecting(true);
  //   setError(null);

  //   try {
  //     // Demander l'autorisation de connexion
  //     const accounts = await window.ethereum.request({ 
  //       method: 'eth_requestAccounts' 
  //     }) as string[];

  //     // Vérifier le réseau (Polygon)
  //     const chainId = await window.ethereum.request({ 
  //       method: 'eth_chainId' 
  //     }) as string;

  //     if (chainId !== '0x89' && chainId !== '0x13881') { // Polygon Mainnet ou Mumbai Testnet
  //       // Demander le changement de réseau
  //       try {
  //         await window.ethereum.request({
  //           method: 'wallet_switchEthereumChain',
  //           params: [{ chainId: '0x13881' }], // Mumbai testnet
  //         });
  //       } catch (switchError) {
  //         const switchErr = switchError as EthereumProviderError;
  //         if (switchErr.code === 4902) {
  //           // Le réseau n'existe pas, l'ajouter
  //           await window.ethereum.request({
  //             method: 'wallet_addEthereumChain',
  //             params: [{
  //               chainId: '0x13881',
  //               chainName: 'Polygon Mumbai Testnet',
  //               nativeCurrency: {
  //                 name: 'MATIC',
  //                 symbol: 'MATIC',
  //                 decimals: 18
  //               },
  //               rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
  //               blockExplorerUrls: ['https://mumbai.polygonscan.com/']
  //             }]
  //           });
  //         }
  //       }
  //     }

  //     // Générer un nonce pour la signature
  //     const nonce = Math.floor(Math.random() * 1000000);
  //     const message = `Connectez-vous à ContracTify\n\nNonce: ${nonce}`;

  //     // Demander la signature
  //     const signature = await window.ethereum.request({
  //       method: 'personal_sign',
  //       params: [message, accounts[0]]
  //     }) as string;

  //     console.log('Connexion wallet réussie:', { 
  //       address: accounts[0], 
  //       signature, 
  //       nonce 
  //     });

      // Ici on enverrait la signature au backend pour vérification
      // const response = await fetch('/api/auth/wallet', { ... });

      // Redirection vers dashboard
      // router.push('/dashboard');

  //   } catch (err) {
  //     const error = err as EthereumProviderError;
  //     console.error('Erreur connexion wallet:', err);
  //     if (error.code === 4001) {
  //       setError({ message: 'Connexion refusée par l\'utilisateur.' });
  //     } else {
  //       setError({ message: 'Erreur lors de la connexion au wallet.' });
  //     }
  //   } finally {
  //     setWalletConnecting(false);
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className={`max-w-5xl w-full transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue sur ContracTify
          </h1>
          <p className="text-gray-600">
            Connectez-vous pour accéder à vos contrats intelligents
          </p>
        </div>

        {/* Connexion Wallet */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connexion sécurisée
            </h2>
            <p className="text-gray-600 text-sm">
              Choisissez votre méthode de connexion préférée
            </p>
          </div>

          {/* Bouton Wallet */}
          {/* <button
            onClick={handleWalletConnect}
            disabled={walletConnecting}
            className={`w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#3b82f6] to-[#22c55e] text-white py-4 rounded-xl font-semibold transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mb-4`}
          >
            {walletConnecting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Se connecter avec MetaMask</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button> */}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">ou continuez avec</span>
            </div>
          </div>

          {/* Formulaire Email/Password */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    error?.field === 'email'
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                />
              </div>
              {error?.field === 'email' && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {error.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    error?.field === 'password'
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {error?.field === 'password' && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {error.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {error && !error.field && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                  <p className="text-sm text-red-700">{error.message}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-gray-900 text-white py-3 rounded-lg font-semibold transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>
        </div>

        {/* Lien inscription */}
        <div className="text-center">
          <p className="text-gray-600">
            Pas encore de compte ?{' '}
            <a href="/register" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">
              Créer un compte
            </a>
          </p>
        </div>

        {/* Informations sécurité */}
        <div className="mt-8 bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-primary-900 mb-1">
                Sécurisé par blockchain
              </h4>
              <p className="text-sm text-primary-700">
                Vos données sont protégées par cryptographie et stockées de manière décentralisée.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// // Type pour l'objet window.ethereum
// declare global {
//   interface Window {
//     ethereum?: {
//       request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>;
//       on: (event: string, callback: (accounts: string[]) => void) => void;
//       removeListener: (event: string, callback: (accounts: string[]) => void) => void;
//     };
//   }
// }

export default LoginPage;