'use client';
import React, { useState, useEffect } from 'react';
import { 
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Wallet,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptNewsletter: boolean;
}

interface RegisterError {
  field?: keyof RegisterFormData;
  message: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

const RegisterPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptNewsletter: false
  });
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<RegisterError | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error?.field === field) setError(null);
  };

  const getPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score++;
    else feedback.push('Au moins 8 caractères');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Une majuscule');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Une minuscule');

    if (/\d/.test(password)) score++;
    else feedback.push('Un chiffre');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Un caractère spécial');

    const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-yellow-400', 'bg-green-500'];
    
    return {
      score,
      feedback,
      color: colors[score] || 'bg-gray-300'
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validateStep1 = (): boolean => {
    if (!formData.firstName.trim()) {
      setError({ field: 'firstName', message: 'Le prénom est requis' });
      return false;
    }
    if (!formData.lastName.trim()) {
      setError({ field: 'lastName', message: 'Le nom est requis' });
      return false;
    }
    if (!formData.email.trim()) {
      setError({ field: 'email', message: 'L\'email est requis' });
      return false;
    }
    if (!formData.email.includes('@')) {
      setError({ field: 'email', message: 'Format d\'email invalide' });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.password) {
      setError({ field: 'password', message: 'Le mot de passe est requis' });
      return false;
    }
    if (passwordStrength.score < 3) {
      setError({ field: 'password', message: 'Le mot de passe n\'est pas assez fort' });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError({ field: 'confirmPassword', message: 'Les mots de passe ne correspondent pas' });
      return false;
    }
    if (!formData.acceptTerms) {
      setError({ field: 'acceptTerms', message: 'Vous devez accepter les conditions d\'utilisation' });
      return false;
    }
    return true;
  };

  const nextStep = (): void => {
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }
    
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const prevStep = (): void => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleRegister = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Simulation de l'inscription
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Ici on appellerait l'API d'inscription
      console.log('Inscription:', formData);
      
      // Passage à l'étape de confirmation
      setCurrentStep(3);
      
    } catch (err) {
      setError({ message: 'Erreur lors de l\'inscription. Veuillez réessayer.' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations personnelles
        </h2>
        <p className="text-gray-600">
          Commençons par créer votre profil ContracTify
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom *
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Votre nom"
                required
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  error?.field === 'lastName'
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
              />
            </div>
            {error?.field === 'lastName' && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prénom *
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Votre prénom"
                required
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  error?.field === 'firstName'
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
              />
            </div>
            {error?.field === 'firstName' && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adresse email *
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="votre@email.com"
              required
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone (optionnel)
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Localisation (optionnel)
            </label>
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Paris, France"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sécurité du compte
        </h2>
        <p className="text-gray-600">
          Créez un mot de passe fort pour protéger votre compte
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mot de passe *
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
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex space-x-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded ${
                      i < passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-600">
                Force: {['Très faible', 'Faible', 'Moyenne', 'Bonne', 'Excellente'][passwordStrength.score]}
                {passwordStrength.feedback.length > 0 && (
                  <span className="ml-2">
                    Manque: {passwordStrength.feedback.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {error?.field === 'password' && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmer le mot de passe *
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                error?.field === 'confirmPassword'
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : formData.confirmPassword && formData.password === formData.confirmPassword
                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {formData.confirmPassword && (
            <div className="mt-2 flex items-center">
              {formData.password === formData.confirmPassword ? (
                <div className="flex items-center text-green-600">
                  <Check className="w-4 h-4 mr-1" />
                  <span className="text-sm">Les mots de passe correspondent</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <X className="w-4 h-4 mr-1" />
                  <span className="text-sm">Les mots de passe ne correspondent pas</span>
                </div>
              )}
            </div>
          )}
          
          {error?.field === 'confirmPassword' && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error.message}
            </p>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
              className={`w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-0.5 ${
                error?.field === 'acceptTerms' ? 'border-red-300' : ''
              }`}
            />
            <span className="text-sm text-gray-600">
              J&apos;accepte les{' '}
              <button className="text-primary-600 hover:text-primary-500 underline">
                conditions d&apos;utilisation
              </button>{' '}
              et la{' '}
              <button className="text-primary-600 hover:text-primary-500 underline">
                politique de confidentialité
              </button>{' '}
              de ContracTify *
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.acceptNewsletter}
              onChange={(e) => handleInputChange('acceptNewsletter', e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-0.5"
            />
            <span className="text-sm text-gray-600">
              Je souhaite recevoir les actualités et offres spéciales de ContracTify
            </span>
          </label>

          {error?.field === 'acceptTerms' && (
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-secondary-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Compte créé avec succès ! 🎉
      </h2>
      
      <p className="text-gray-600 mb-8">
        Bienvenue sur ContracTify, <strong>{formData.firstName}</strong> !<br />
        Un email de confirmation a été envoyé à <strong>{formData.email}</strong>
      </p>

      <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-3">
          <Wallet className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
          <div className="text-left">
            <h4 className="font-medium text-primary-900 mb-2">
              Prochaine étape : Connecter votre wallet
            </h4>
            <p className="text-sm text-[#1d4ed8] mb-4">
              Pour utiliser toutes les fonctionnalités de ContracTify, connectez votre wallet MetaMask.
            </p>
            <button className="bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors text-sm">
              Connecter MetaMask
            </button>
          </div>
        </div>
      </div>

      <button className="bg-[#22c55e] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#16a34a] transition-colors">
        Accéder au dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className={`max-w-lg w-full transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-[#3b82f6] to-[#22c55e] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rejoignez ContracTify
          </h1>
          <p className="text-gray-600">
            Créez votre compte pour gérer vos contrats intelligents
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step < currentStep ? 'bg-[#22c55e] text-white' :
                step === currentStep ? 'bg-[#3b82f6] text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{step}</span>
                )}
              </div>
              {step < 3 && (
                <div className={`w-16 h-0.5 ${
                  step < currentStep ? 'bg-[#22c55e]' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Error Message */}
          {error && !error.field && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 3 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>

              {currentStep === 2 ? (
                <button
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-[#22c55e] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#16a34a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Création...</span>
                    </>
                  ) : (
                    <>
                      <span>Créer mon compte</span>
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="flex items-center space-x-2 bg-[#3b82f6] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2563eb] transition-all"
                >
                  <span>Suivant</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Login Link */}
        {currentStep < 3 && (
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Vous avez déjà un compte ?{' '}
              <a href="/login" className="text-[#2563eb] hover:text-[#3b82f6] font-semibold transition-colors">
                Se connecter
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;