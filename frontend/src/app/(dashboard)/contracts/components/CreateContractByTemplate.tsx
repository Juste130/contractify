"use client";
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Users, 
  Shield, 
  DollarSign,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Save,
  Send,
  Calendar,
  User,
  Mail,
  MapPin,
  Phone,
  Lock,
  ChevronLeft,
  ChevronRight,
  Loader
} from 'lucide-react';
import { contractTemplates } from '../../../../lib/data/contract';
import { ContractFormData, ContractParty, ContractClause, PaymentTerm } from '../../../../lib/types/contract';

const CreateContractByTemplate = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<ContractFormData>({
    title: '',
    description: '',
    content: '',
    parties: [
      { id: '1', name: '', email: '', role: 'creator', walletAddress: '' },
      { id: '2', name: '', email: '', role: 'signer', walletAddress: '' }
    ],
    clauses: [],
    paymentTerms: [],
    startDate: '',
    endDate: '',
    jurisdiction: 'France',
    isConfidential: false,
    requiresNotarization: false,
    templateId: ''
  });

  const steps = [
    { id: 1, title: 'Choix du template', icon: FileText, completed: currentStep > 1 },
    { id: 2, title: 'Informations générales', icon: Shield, completed: currentStep > 2 },
    { id: 3, title: 'Parties prenantes', icon: Users, completed: currentStep > 3 },
    { id: 4, title: 'Conditions financières', icon: DollarSign, completed: currentStep > 4 },
    { id: 5, title: 'Finalisation', icon: CheckCircle, completed: false }
  ];

  const selectedTemplateData = contractTemplates.find(t => t.id === selectedTemplate);

  const updateFormData = (field: keyof ContractFormData, value: unknown): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = contractTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        templateId,
        content: template.defaultContent,
        clauses: template.defaultClauses,
        paymentTerms: template.defaultPaymentTerms
      }));
    }
  };

  const addParty = (): void => {
    const newParty: ContractParty = {
      id: Date.now().toString(),
      name: '',
      email: '',
      role: 'signer',
      walletAddress: ''
    };
    updateFormData('parties', [...formData.parties, newParty]);
  };

  const updateParty = (id: string, updates: Partial<ContractParty>): void => {
    const updatedParties = formData.parties.map(party =>
      party.id === id ? { ...party, ...updates } : party
    );
    updateFormData('parties', updatedParties);
  };

  const removeParty = (id: string): void => {
    if (formData.parties.length > 2) {
      const filteredParties = formData.parties.filter(party => party.id !== id);
      updateFormData('parties', filteredParties);
    }
  };

  const addClause = (): void => {
    const newClause: ContractClause = {
      id: Date.now().toString(),
      title: '',
      content: '',
      isRequired: false,
      order: formData.clauses.length + 1
    };
    updateFormData('clauses', [...formData.clauses, newClause]);
  };

  const updateClause = (id: string, updates: Partial<ContractClause>): void => {
    const updatedClauses = formData.clauses.map(clause =>
      clause.id === id ? { ...clause, ...updates } : clause
    );
    updateFormData('clauses', updatedClauses);
  };

  const removeClause = (id: string): void => {
    const filteredClauses = formData.clauses.filter(clause => clause.id !== id);
    updateFormData('clauses', filteredClauses);
  };

  const addPaymentTerm = (): void => {
    const newPayment: PaymentTerm = {
      id: Date.now().toString(),
      description: '',
      amount: '',
      currency: 'EUR',
      dueDate: '',
      isAutomatic: false
    };
    updateFormData('paymentTerms', [...formData.paymentTerms, newPayment]);
  };

  const updatePaymentTerm = (id: string, updates: Partial<PaymentTerm>): void => {
    const updatedPayments = formData.paymentTerms.map(payment =>
      payment.id === id ? { ...payment, ...updates } : payment
    );
    updateFormData('paymentTerms', updatedPayments);
  };

  const removePaymentTerm = (id: string): void => {
    const filteredPayments = formData.paymentTerms.filter(payment => payment.id !== id);
    updateFormData('paymentTerms', filteredPayments);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1 && !selectedTemplate) {
      newErrors.template = 'Veuillez sélectionner un template';
    }

    if (step === 2) {
      if (!formData.title.trim()) {
        newErrors.title = 'Le titre est requis';
      }
      if (!formData.startDate) {
        newErrors.startDate = 'La date de début est requise';
      }
    }

    if (step === 3) {
      formData.parties.forEach((party, index) => {
        if (!party.name.trim()) {
          newErrors[`party_${index}_name`] = 'Le nom est requis';
        }
        if (!party.email.trim() || !/\S+@\S+\.\S+/.test(party.email)) {
          newErrors[`party_${index}_email`] = 'Email valide requis';
        }
      });
    }

    if (step === 4) {
      if (!formData.paymentTerms.some(p => p.amount)) {
        newErrors.payments = 'Au moins un montant est requis';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = (): void => {
    if (validateStep(currentStep) && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (): void => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      // Simulation de création
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Contrat créé:', formData);
      alert('Contrat créé avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Choisissez votre type de contrat</h2>
        <p className="text-gray-600">Sélectionnez le template qui correspond le mieux à vos besoins</p>
      </div>

      {errors.template && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{errors.template}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contractTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template.id)}
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-4xl mb-4">{template.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.title}</h3>
            <p className="text-gray-600 text-sm">{template.description}</p>
            {selectedTemplate === template.id && (
              <div className="mt-4 flex items-center text-blue-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Sélectionné</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Informations du contrat</h2>
        <p className="text-gray-600">Complétez les détails de votre contrat</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Détails principaux</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du contrat *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              placeholder="Ex: Contrat CDI Développeur Frontend"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Description du contrat..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => updateFormData('startDate', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.startDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => updateFormData('endDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Juridiction
            </label>
            <select
              value={formData.jurisdiction}
              onChange={(e) => updateFormData('jurisdiction', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="France">France</option>
              <option value="Bénin">Bénin</option>
              <option value="International">International</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Parties prenantes</h2>
        <p className="text-gray-600">Ajoutez tous les signataires du contrat</p>
      </div>

      {errors.parties && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">Veuillez compléter toutes les informations des parties</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {formData.parties.map((party, index) => (
          <div key={party.id} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {index === 0 ? 'Créateur du contrat' : `Signataire ${index}`}
              </h3>
              {index > 1 && (
                <button
                  onClick={() => removeParty(party.id)}
                  className="text-red-500 hover:text-red-700 p-2 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={party.name}
                  onChange={(e) => updateParty(party.id, { name: e.target.value })}
                  placeholder="Nom et prénom"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors[`party_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors[`party_${index}_name`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`party_${index}_name`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={party.email}
                  onChange={(e) => updateParty(party.id, { email: e.target.value })}
                  placeholder="email@exemple.com"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors[`party_${index}_email`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors[`party_${index}_email`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`party_${index}_email`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rôle
                </label>
                <select
                  value={party.role}
                  onChange={(e) => updateParty(party.id, { 
                    role: e.target.value as 'creator' | 'signer' | 'witness' 
                  })}
                  disabled={index === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="creator">Créateur</option>
                  <option value="signer">Signataire</option>
                  <option value="witness">Témoin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse wallet (optionnel)
                </label>
                <input
                  type="text"
                  value={party.walletAddress || ''}
                  onChange={(e) => updateParty(party.id, { walletAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addParty}
        className="flex items-center space-x-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 px-4 py-3 rounded-lg transition-colors"
      >
        <Plus className="w-5 h-5 text-gray-600" />
        <span className="text-gray-700 font-medium">Ajouter un signataire</span>
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Conditions financières</h2>
        <p className="text-gray-600">Définissez les montants et modalités de paiement</p>
      </div>

      {errors.payments && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{errors.payments}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {formData.paymentTerms.map((payment, index) => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Paiement {index + 1}</h3>
              <button
                onClick={() => removePaymentTerm(payment.id)}
                className="text-red-500 hover:text-red-700 p-2 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={payment.description}
                  onChange={(e) => updatePaymentTerm(payment.id, { description: e.target.value })}
                  placeholder="Ex: Acompte, Solde final..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant
                  </label>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => updatePaymentTerm(payment.id, { amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Devise
                  </label>
                  <select
                    value={payment.currency}
                    onChange={(e) => updatePaymentTerm(payment.id, { currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="XOF">XOF (FCFA)</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d&apos;échéance
                </label>
                <input
                  type="date"
                  value={payment.dueDate}
                  onChange={(e) => updatePaymentTerm(payment.id, { dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`payment-automatic-${payment.id}`}
                    checked={payment.isAutomatic}
                    onChange={(e) => updatePaymentTerm(payment.id, { isAutomatic: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`payment-automatic-${payment.id}`} className="ml-2 text-sm text-gray-700">
                    Paiement automatique
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addPaymentTerm}
        className="flex items-center space-x-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 px-4 py-3 rounded-lg transition-colors"
      >
        <Plus className="w-5 h-5 text-gray-600" />
        <span className="text-gray-700 font-medium">Ajouter un paiement</span>
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Paiements automatisés
            </h4>
            <p className="text-sm text-blue-700">
              Les paiements seront exécutés automatiquement selon les clauses définies via smart contract.
              La conversion crypto/fiat sera gérée par Ramp Network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Finalisation</h2>
        <p className="text-gray-600">Vérifiez les informations avant de créer le contrat</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Résumé du contrat</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Type de contrat</h4>
              <p className="text-gray-900">{selectedTemplateData?.title || 'Non défini'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Titre</h4>
              <p className="text-gray-900">{formData.title || 'Non défini'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Date de début</h4>
              <p className="text-gray-900">{formData.startDate || 'Non définie'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Date de fin</h4>
              <p className="text-gray-900">{formData.endDate || 'Non définie'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Montant total</h4>
              <p className="text-gray-900">
                {formData.paymentTerms.reduce((total, payment) => total + Number(payment.amount || 0), 0)} €
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Nombre de signataires</h4>
              <p className="text-gray-900">{formData.parties.length}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Parties prenantes</h4>
            <div className="space-y-2">
              {formData.parties.map((party, index) => (
                <div key={party.id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">
                      {party.name || `Partie ${index + 1}`}
                    </span>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                  <span className="text-sm text-gray-500 capitalize">
                    {index === 0 ? 'Créateur' : 'Signataire'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {formData.paymentTerms.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Paiements</h4>
              <div className="space-y-2">
                {formData.paymentTerms.map((payment, index) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{payment.description}</span>
                    <span className="text-sm text-gray-500">
                      {payment.amount} {payment.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Prêt à créer le contrat ?</h4>
            <p className="text-gray-600">
              Le contrat sera sauvegardé sur IPFS et les invitations envoyées aux signataires
            </p>
          </div>
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
      </div>

      <div className="flex items-center space-x-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <input
          type="checkbox"
          id="confidential"
          checked={formData.isConfidential}
          onChange={(e) => updateFormData('isConfidential', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="confidential" className="text-sm text-gray-700">
          Rendre ce contrat confidentiel
        </label>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch(currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Retour au dashboard</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                <span>{showPreview ? 'Masquer l\'aperçu' : 'Aperçu'}</span>
              </button>
              
              <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Progress */}
        <aside className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Création de contrat</h2>
            
            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = step.completed;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-blue-100 border border-blue-200' 
                        : isCompleted
                        ? 'bg-green-100 border border-green-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive 
                        ? 'bg-blue-200' 
                        : isCompleted
                        ? 'bg-green-200'
                        : 'bg-gray-100'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Icon className={`w-6 h-6 ${
                          isActive ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${
                        isActive ? 'text-blue-900' : 
                        isCompleted ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">Étape {step.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Progression</span>
                <span className="text-sm text-gray-500">{Math.round((currentStep / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {renderCurrentStep()}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>

              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  Étape {currentStep} sur {steps.length}
                </span>
                
                {currentStep < steps.length ? (
                  <button
                    onClick={nextStep}
                    disabled={currentStep === 1 && !selectedTemplate}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <span>Suivant</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Création...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Créer le contrat</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Aperçu du contrat</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <EyeOff className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-lg max-w-none">
                <h1>{formData.title}</h1>
                {formData.description && (
                  <p className="text-gray-600">{formData.description}</p>
                )}
                
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <pre className="whitespace-pre-wrap font-sans">
                    {formData.content}
                  </pre>
                </div>

                {formData.clauses.length > 0 && (
                  <div className="mt-8">
                    <h2>Clauses spéciales</h2>
                    {formData.clauses.map((clause, index) => (
                      <div key={clause.id} className="mt-4">
                        <h3>{index + 1}. {clause.title}</h3>
                        <p>{clause.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h2>Signatures</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {formData.parties.map((party, index) => (
                      <div key={party.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium">{party.name}</h4>
                        <p className="text-sm text-gray-600">{party.email}</p>
                        <p className="text-sm text-gray-600 capitalize">{party.role}</p>
                        <div className="mt-4 h-16 border-b border-gray-300"></div>
                        <p className="text-xs text-gray-500 mt-2">Signature</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fermer l&apos;aperçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateContractByTemplate;