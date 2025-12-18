"use client";
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText,
  Users,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Upload,
  Download,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Type,
  Hash,
  Calendar as CalendarIcon,
  DollarSign as CurrencyIcon,
  User as UserIcon,
  Send,
  Loader,
  Settings,
  Shield,
  Gavel
} from 'lucide-react';

interface ContractParty {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'signer' | 'witness';
  walletAddress?: string;
}

interface ContractClause {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
  order: number;
}

interface PaymentTerm {
  id: string;
  description: string;
  amount: string;
  currency: string;
  dueDate: string;
  isAutomatic: boolean;
}

interface CustomContractData {
  title: string;
  description: string;
  content: string;
  parties: ContractParty[];
  clauses: ContractClause[];
  paymentTerms: PaymentTerm[];
  startDate: string;
  endDate: string;
  jurisdiction: string;
  isConfidential: boolean;
  requiresNotarization: boolean;
}

const CreateContract: React.FC = () => {
  const [contractData, setContractData] = useState<CustomContractData>({
    title: '',
    description: '',
    content: '',
    parties: [
      { id: '1', name: '', email: '', role: 'creator', walletAddress: '' }
    ],
    clauses: [],
    paymentTerms: [],
    startDate: '',
    endDate: '',
    jurisdiction: 'France',
    isConfidential: false,
    requiresNotarization: false
  });

  const [activeSection, setActiveSection] = useState<string>('general');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const sections = [
    { id: 'general', label: 'Informations générales', icon: FileText },
    { id: 'content', label: 'Contenu du contrat', icon: Type },
    { id: 'parties', label: 'Parties prenantes', icon: Users },
    { id: 'clauses', label: 'Clauses spéciales', icon: List },
    { id: 'payments', label: 'Conditions financières', icon: DollarSign },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setTimeout(() => {
      handleAutoSave();
    }, 5000);

    return () => clearTimeout(autoSave);
  }, [contractData]);

  const handleAutoSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      // Simulation de sauvegarde
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateContractData = <K extends keyof CustomContractData>(
    field: K,
    value: CustomContractData[K]
  ): void => {
    setContractData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
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
    updateContractData('parties', [...contractData.parties, newParty]);
  };

  const updateParty = (id: string, updates: Partial<ContractParty>): void => {
    const updatedParties = contractData.parties.map(party =>
      party.id === id ? { ...party, ...updates } : party
    );
    updateContractData('parties', updatedParties);
  };

  const removeParty = (id: string): void => {
    if (contractData.parties.length > 1) {
      const filteredParties = contractData.parties.filter(party => party.id !== id);
      updateContractData('parties', filteredParties);
    }
  };

  const addClause = (): void => {
    const newClause: ContractClause = {
      id: Date.now().toString(),
      title: '',
      content: '',
      isRequired: false,
      order: contractData.clauses.length + 1
    };
    updateContractData('clauses', [...contractData.clauses, newClause]);
  };

  const updateClause = (id: string, updates: Partial<ContractClause>): void => {
    const updatedClauses = contractData.clauses.map(clause =>
      clause.id === id ? { ...clause, ...updates } : clause
    );
    updateContractData('clauses', updatedClauses);
  };

  const removeClause = (id: string): void => {
    const filteredClauses = contractData.clauses.filter(clause => clause.id !== id);
    updateContractData('clauses', filteredClauses);
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
    updateContractData('paymentTerms', [...contractData.paymentTerms, newPayment]);
  };

  const updatePaymentTerm = (id: string, updates: Partial<PaymentTerm>): void => {
    const updatedPayments = contractData.paymentTerms.map(payment =>
      payment.id === id ? { ...payment, ...updates } : payment
    );
    updateContractData('paymentTerms', updatedPayments);
  };

  const removePaymentTerm = (id: string): void => {
    const filteredPayments = contractData.paymentTerms.filter(payment => payment.id !== id);
    updateContractData('paymentTerms', filteredPayments);
  };

  const insertTextAtCursor = (text: string): void => {
    if (contentRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        
        // Update the content
        updateContractData('content', contentRef.current.innerText);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!contractData.title.trim()) {
      newErrors.title = 'Le titre du contrat est requis';
    }
    if (!contractData.content.trim()) {
      newErrors.content = 'Le contenu du contrat est requis';
    }
    if (contractData.parties.length < 2) {
      newErrors.parties = 'Au moins deux parties sont requises';
    }
    
    // Validate parties
    contractData.parties.forEach((party, index) => {
      if (!party.name.trim()) {
        newErrors[`party_${index}_name`] = 'Le nom est requis';
      }
      if (!party.email.trim() || !/\S+@\S+\.\S+/.test(party.email)) {
        newErrors[`party_${index}_email`] = 'Email valide requis';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      alert('Veuillez corriger les erreurs avant de soumettre');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulation de création du contrat
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('Contrat créé:', contractData);
      alert('Contrat créé avec succès !');
      
      // Redirection vers la page de signature
      // router.push(`/contracts/${contractId}/sign`);
      
    } catch (error) {
      console.error('Erreur création contrat:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePreviewContent = (): string => {
    let content = contractData.content;
    
    // Replace variables with actual values
    content = content.replace(/\[NOM_PARTIE_1\]/g, contractData.parties[0]?.name || '[NOM_PARTIE_1]');
    content = content.replace(/\[DATE_DEBUT\]/g, contractData.startDate || '[DATE_DEBUT]');
    content = content.replace(/\[DATE_FIN\]/g, contractData.endDate || '[DATE_FIN]');
    content = content.replace(/\[MONTANT\]/g, contractData.paymentTerms[0]?.amount || '[MONTANT]');
    content = content.replace(/\[NUMERO_CONTRAT\]/g, `CTR-${Date.now()}`);
    
    return content;
  };

  const renderGeneralSection = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du contrat</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du contrat *
            </label>
            <input
              type="text"
              value={contractData.title}
              onChange={(e) => updateContractData('title', e.target.value)}
              placeholder="Ex: Contrat de prestation de services"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={contractData.description}
              onChange={(e) => updateContractData('description', e.target.value)}
              placeholder="Brève description du contrat..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={contractData.startDate}
                onChange={(e) => updateContractData('startDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin (optionnel)
              </label>
              <input
                type="date"
                value={contractData.endDate}
                onChange={(e) => updateContractData('endDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Juridiction
            </label>
            <select
              value={contractData.jurisdiction}
              onChange={(e) => updateContractData('jurisdiction', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

  const renderContentSection = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Contenu du contrat</h3>
          <div className="flex space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Upload className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rich Text Toolbar */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3">
              <button className="p-2 hover:bg-gray-100 rounded">
                <Bold className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Italic className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Underline className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3">
              <button className="p-2 hover:bg-gray-100 rounded">
                <AlignLeft className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <AlignCenter className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <AlignRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button 
                onClick={() => insertTextAtCursor('[NOM_PARTIE_1]')}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                + Partie 1
              </button>
              <button 
                onClick={() => insertTextAtCursor('[DATE_DEBUT]')}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                + Date début
              </button>
              <button 
                onClick={() => insertTextAtCursor('[MONTANT]')}
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                + Montant
              </button>
            </div>
          </div>
        </div>

        <div
          ref={contentRef}
          contentEditable
          onInput={(e) => updateContractData('content', e.currentTarget.innerText)}
          className={`min-h-[400px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prose prose-sm max-w-none ${
            errors.content ? 'border-red-300' : 'border-gray-300'
          }`}
          style={{ whiteSpace: 'pre-wrap' }}
          suppressContentEditableWarning={true}
        >
          {contractData.content || 'Commencez à rédiger votre contrat ici...\n\nVous pouvez utiliser les variables prédéfinies pour insérer automatiquement les informations des parties, dates, et montants.'}
        </div>
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Variables disponibles</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <UserIcon className="w-3 h-3 text-blue-600" />
              <code>[NOM_PARTIE_1]</code>
            </div>
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-3 h-3 text-green-600" />
              <code>[DATE_DEBUT]</code>
            </div>
            <div className="flex items-center space-x-1">
              <CurrencyIcon className="w-3 h-3 text-purple-600" />
              <code>[MONTANT]</code>
            </div>
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-3 h-3 text-green-600" />
              <code>[DATE_FIN]</code>
            </div>
            <div className="flex items-center space-x-1">
              <Hash className="w-3 h-3 text-gray-600" />
              <code>[NUMERO_CONTRAT]</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPartiesSection = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Parties contractantes</h3>
          <button
            onClick={addParty}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>

        {errors.parties && <p className="mb-4 text-sm text-red-600">{errors.parties}</p>}

        <div className="space-y-4">
          {contractData.parties.map((party, index) => (
            <div key={party.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">
                  {index === 0 ? 'Créateur du contrat' : `Partie ${index + 1}`}
                </h4>
                {contractData.parties.length > 1 && (
                  <button
                    onClick={() => removeParty(party.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                    disabled={index === 0} // Le créateur ne peut pas changer de rôle
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClausesSection = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Clauses spéciales</h3>
          <button
            onClick={addClause}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une clause</span>
          </button>
        </div>

        <div className="space-y-4">
          {contractData.clauses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <List className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune clause spéciale ajoutée</p>
              <p className="text-sm">Ajoutez des clauses pour personnaliser votre contrat</p>
            </div>
          ) : (
            contractData.clauses.map((clause, index) => (
              <div key={clause.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Clause {index + 1}</h4>
                  <button
                    onClick={() => removeClause(clause.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre de la clause
                    </label>
                    <input
                      type="text"
                      value={clause.title}
                      onChange={(e) => updateClause(clause.id, { title: e.target.value })}
                      placeholder="Ex: Clause de confidentialité"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contenu de la clause
                    </label>
                    <textarea
                      value={clause.content}
                      onChange={(e) => updateClause(clause.id, { content: e.target.value })}
                      placeholder="Décrivez les termes de cette clause..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`clause-required-${clause.id}`}
                      checked={clause.isRequired}
                      onChange={(e) => updateClause(clause.id, { isRequired: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`clause-required-${clause.id}`} className="ml-2 text-sm text-gray-700">
                      Clause obligatoire
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderPaymentsSection = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Conditions financières</h3>
          <button
            onClick={addPaymentTerm}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un paiement</span>
          </button>
        </div>

        <div className="space-y-4">
          {contractData.paymentTerms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune condition financière définie</p>
              <p className="text-sm">Ajoutez les modalités de paiement pour votre contrat</p>
            </div>
          ) : (
            contractData.paymentTerms.map((payment, index) => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Paiement {index + 1}</h4>
                  <button
                    onClick={() => removePaymentTerm(payment.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Devise
                      </label>
                      <select
                        value={payment.currency}
                        onChange={(e) => updatePaymentTerm(payment.id, { currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="XOF">XOF</option>
                        <option value="BTC">BTC</option>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderSettingsSection = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres du contrat</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Confidentialité</h4>
              <p className="text-sm text-gray-600">
                Rendre ce contrat confidentiel (seules les parties pourront y accéder)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={contractData.isConfidential}
                onChange={(e) => updateContractData('isConfidential', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Notarisation</h4>
              <p className="text-sm text-gray-600">
                Requérir une notarisation pour ce contrat
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={contractData.requiresNotarization}
                onChange={(e) => updateContractData('requiresNotarization', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-yellow-800">Sécurité et conformité</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Tous les contrats sont stockés de manière sécurisée et horodatés sur la blockchain.
                  Les signatures électroniques sont conformes au règlement eIDAS.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewModal = () => (
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
            <h1>{contractData.title}</h1>
            {contractData.description && (
              <p className="text-gray-600">{contractData.description}</p>
            )}
            
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div dangerouslySetInnerHTML={{ __html: generatePreviewContent().replace(/\n/g, '<br/>') }} />
            </div>

            {contractData.clauses.length > 0 && (
              <div className="mt-8">
                <h2>Clauses spéciales</h2>
                {contractData.clauses.map((clause, index) => (
                  <div key={clause.id} className="mt-4">
                    <h3>{index + 1}. {clause.title}</h3>
                    <p>{clause.content}</p>
                  </div>
                ))}
              </div>
            )}

            {contractData.paymentTerms.length > 0 && (
              <div className="mt-8">
                <h2>Conditions financières</h2>
                {contractData.paymentTerms.map((payment, index) => (
                  <div key={payment.id} className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4>Paiement {index + 1}: {payment.description}</h4>
                    <p>Montant: {payment.amount} {payment.currency}</p>
                    <p>Échéance: {payment.dueDate}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2>Signatures</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {contractData.parties.map((party, index) => (
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
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSection();
      case 'content':
        return renderContentSection();
      case 'parties':
        return renderPartiesSection();
      case 'clauses':
        return renderClausesSection();
      case 'payments':
        return renderPaymentsSection();
      case 'settings':
        return renderSettingsSection();
      default:
        return renderGeneralSection();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Nouveau contrat</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Sauvegardé à {lastSaved.toLocaleTimeString()}</span>
                  </>
                ) : null}
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>Aperçu</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Création...' : 'Créer le contrat'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className="bg-white border border-gray-200 rounded-xl p-4 sticky top-8">
              <ul className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeSection === section.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{section.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderActiveSection()}
          </div>
        </div>
      </div>

      {showPreview && renderPreviewModal()}
    </div>
  );
};

export default CreateContract;