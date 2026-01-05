"use client";

import { useState } from "react";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AIInput } from "../ui/ai-input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { AiBadge } from "../ui/ai-badge";
import { aiApi } from "@/lib/api/ai";
import { ipfsApi } from "@/lib/api/ipfs";
import { useWeb3 } from "@/contexts/web3-context";
import { useContract } from "@/hooks/useContract";
import { contractTemplates as dataTemplates } from "@/lib/data/contract";
import {
  FileText,
  Users,
  Home,
  FileSignature,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Brain,
  Send,
  Eye,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  CheckCircle2
} from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { useRouter } from "next/navigation";

export function CreateContractPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isConnected, connect } = useWeb3();
  const { createContract } = useContract();

  // Form State
  const [formData, setFormData] = useState({
    partyA: { name: "", email: "", address: "", phone: "" },
    partyB: { name: "", email: "", address: "", phone: "" },
    details: {
      duration: "",
      amount: "",
      paymentTerms: "",
      startDate: new Date().toISOString().split('T')[0],
      description: "",
      city: "Paris"
    },
    options: {
      confidentiality: false,
      nonCompete: false,
      probation: false
    }
  });

  const [contractText, setContractText] = useState("");
  const [signatories, setSignatories] = useState<string[]>([]);
  const [newSignatory, setNewSignatory] = useState("");

  const contractTemplatesUI = [
    { id: "cdi", name: "CDI", icon: Briefcase, description: "Contrat à durée indéterminée" },
    { id: "freelance", name: "Freelance", icon: Users, description: "Contrat de prestation de services" },
    { id: "location", name: "Location", icon: Home, description: "Bail de location immobilière" },
    { id: "nda", name: "NDA", icon: FileSignature, description: "Accord de confidentialité" },
    { id: "commercial", name: "Commercial", icon: Briefcase, description: "Contrat commercial" },
    { id: "custom", name: "Personnalisé", icon: FileText, description: "Créer un contrat sur mesure" },
  ];

  const steps = [
    { number: 1, title: "Type de contrat" },
    { number: 2, title: "Informations" },
    { number: 3, title: "Aperçu & Édition" },
    { number: 4, title: "Signataires" },
  ];

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentStep(3);

    // Simulate "thinking" time for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const template = dataTemplates.find(t => t.id === selectedTemplate);

      if (template) {
        let content = template.defaultContent;

        // Replace placeholders
        content = content.replace(/\[PARTIE_1\]/g, formData.partyA.name || "[Nom Partie A]");
        content = content.replace(/\[PARTIE_2\]/g, formData.partyB.name || "[Nom Partie B]");
        content = content.replace(/\[MONTANT\]/g, formData.details.amount || "[Montant]");
        content = content.replace(/\[DATE_DEBUT\]/g, formData.details.startDate || "[Date début]");
        content = content.replace(/\[VILLE\]/g, formData.details.city || "[Ville]");
        content = content.replace(/\[DATE_SIGNATURE\]/g, new Date().toLocaleDateString('fr-FR'));

        // Specific placeholders based on template
        if (selectedTemplate === 'cdi') {
          content = content.replace(/\[POSTE\]/g, formData.details.description || "[Poste]");
        } else if (selectedTemplate === 'freelance') {
          content = content.replace(/\[DESCRIPTION_PRESTATION\]/g, formData.details.description || "[Description prestation]");
          content = content.replace(/\[DATE_FIN\]/g, "TBD"); // Add endDate to form if needed
        } else if (selectedTemplate === 'location') {
          content = content.replace(/\[DESCRIPTION_BIEN\]/g, formData.details.description || "[Description bien]");
          content = content.replace(/\[DUREE\]/g, formData.details.duration || "[Durée]");
          content = content.replace(/\[CAUTION\]/g, "0"); // Add caution to form if needed
        }

        setContractText(content);
      } else {
        // Fallback for custom or unknown templates
        const response = await aiApi.generateContract({
          templateType: selectedTemplate,
          partyAData: formData.partyA,
          partyBData: formData.partyB,
          additionalClauses: Object.entries(formData.options)
            .filter(([_, val]) => val)
            .map(([key]) => key)
        });
        setContractText(response.contract);
      }

      // Automatically add party A and B emails to signatories if present
      const initialSignatories = [];
      if (formData.partyA.email) initialSignatories.push(formData.partyA.email);
      if (formData.partyB.email) initialSignatories.push(formData.partyB.email);
      setSignatories(Array.from(new Set(initialSignatories)));

    } catch (err: any) {
      setError("Échec de la génération du contrat. Veuillez réessayer.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSignatory = () => {
    if (newSignatory && !signatories.includes(newSignatory)) {
      setSignatories([...signatories, newSignatory]);
      setNewSignatory("");
    }
  };

  const removeSignatory = (email: string) => {
    setSignatories(signatories.filter(s => s !== email));
  };

  const handleFinalSubmit = async () => {
    if (!isConnected) {
      setError("Veuillez connecter votre wallet pour finaliser.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Upload to IPFS
      const ipfsResult = await ipfsApi.uploadJSON({
        data: {
          title: contractTemplatesUI.find(t => t.id === selectedTemplate)?.name || "Nouveau Contrat",
          content: contractText,
          parties: { partyA: formData.partyA, partyB: formData.partyB },
          signatories,
          createdAt: new Date().toISOString()
        },
        name: `contract_${Date.now()}`
      });

      console.log("IPFS Upload Success:", ipfsResult);

      // 2. Blockchain Transaction
      // Calculate expiration (e.g., 1 year from now by default if not specified)
      const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

      // Additional signers (excluding creator if they are Party A)
      // For now, take all signatories except the current user's email if it's there
      const additionalSigners = signatories.filter(s => s !== formData.partyA.email);

      const contractResult = await createContract(
        expiresAt,
        additionalSigners,
        ipfsResult.cid
      );

      console.log("Blockchain Transaction Success:", contractResult);

      router.push(`/contracts/${contractResult.id}?created=success`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la finalisation du contrat.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (section: keyof typeof formData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: section === 'options'
        ? { ...prev.options, [field]: value }
        : { ...(prev[section] as any), [field]: value }
    }));
  };

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar />

      <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">Créer un nouveau contrat</h1>
          <p className="text-muted-foreground">
            Laissez notre IA vous guider pour créer un contrat professionnel sécurisé.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors font-bold ${currentStep >= step.number
                      ? 'bg-[#FFC107] text-[#212121]'
                      : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {step.number}
                  </div>
                  <p className={`text-xs mt-2 font-medium ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 mx-2 mb-6 ${currentStep > step.number ? 'bg-[#FFC107]' : 'bg-muted'
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="mb-2 font-bold">Choisissez le type de contrat</h2>
                <p className="text-muted-foreground">
                  Sélectionnez un modèle pour commencer
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {contractTemplatesUI.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card
                      key={template.id}
                      className={`p-6 cursor-pointer transition-all hover:shadow-lg hover:border-[#FFC107] ${selectedTemplate === template.id
                        ? 'border-2 border-[#FFC107] bg-[#FFC107]/5'
                        : 'border-2 border-transparent'
                        }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 rounded-lg ${selectedTemplate === template.id ? 'bg-[#FFC107]/20' : 'bg-muted'}`}>
                          <Icon className={`w-6 h-6 ${selectedTemplate === template.id ? 'text-[#FFC107]' : 'text-muted-foreground'}`} />
                        </div>
                        <AiBadge />
                      </div>
                      <h3 className="mb-2 font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-8"
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedTemplate}
                >
                  Suivant
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Form */}
          {currentStep === 2 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="mb-2 font-bold">Remplissez les informations</h2>
                <div className="flex items-center justify-center gap-2 text-[#9C27B0]">
                  <Brain className="w-5 h-5" />
                  <p className="font-medium text-sm">Utilisez le stylo magique pour reformuler vos entrées</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Partie A */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#FFC107]/10 text-[#FFC107] flex items-center justify-center text-sm font-bold">A</div>
                    Partie A (Employeur / Client)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom complet / Entreprise</Label>
                      <AIInput
                        context="Nom d'entreprise ou d'employeur"
                        placeholder="Jean Dupont ou Ma Société SAS"
                        className="bg-input-background"
                        value={formData.partyA.name}
                        onChange={(e) => updateFormData('partyA', 'name', e.target.value)}
                        onAIChange={(val) => updateFormData('partyA', 'name', val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="jean@exemple.com"
                        className="bg-input-background"
                        value={formData.partyA.email}
                        onChange={(e) => updateFormData('partyA', 'email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Adresse</Label>
                      <AIInput
                        context="Adresse postale complète"
                        placeholder="123 Rue de la Paix, 75001 Paris"
                        className="bg-input-background"
                        value={formData.partyA.address}
                        onChange={(e) => updateFormData('partyA', 'address', e.target.value)}
                        onAIChange={(val) => updateFormData('partyA', 'address', val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input
                        placeholder="+33 6 12 34 56 78"
                        className="bg-input-background"
                        value={formData.partyA.phone}
                        onChange={(e) => updateFormData('partyA', 'phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-border w-full" />

                {/* Partie B */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#4CAF50]/10 text-[#4CAF50] flex items-center justify-center text-sm font-bold">B</div>
                    Partie B (Salarié / Prestataire)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom complet</Label>
                      <AIInput
                        context="Nom complet d'une personne"
                        placeholder="Sophie Martin"
                        className="bg-input-background"
                        value={formData.partyB.name}
                        onChange={(e) => updateFormData('partyB', 'name', e.target.value)}
                        onAIChange={(val) => updateFormData('partyB', 'name', val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="sophie@exemple.com"
                        className="bg-input-background"
                        value={formData.partyB.email}
                        onChange={(e) => updateFormData('partyB', 'email', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-border w-full" />

                {/* Détails du contrat */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Détails du contrat
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Durée</Label>
                      <AIInput
                        context="Durée du contrat (ex: 6 mois, indéterminée)"
                        placeholder="12 mois"
                        className="bg-input-background"
                        value={formData.details.duration}
                        onChange={(e) => updateFormData('details', 'duration', e.target.value)}
                        onAIChange={(val) => updateFormData('details', 'duration', val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Montant total</Label>
                      <Input
                        placeholder="50 000"
                        className="bg-input-background"
                        value={formData.details.amount}
                        onChange={(e) => updateFormData('details', 'amount', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de début</Label>
                      <Input
                        type="date"
                        className="bg-input-background"
                        value={formData.details.startDate}
                        onChange={(e) => updateFormData('details', 'startDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ville de signature</Label>
                      <Input
                        className="bg-input-background"
                        value={formData.details.city}
                        onChange={(e) => updateFormData('details', 'city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description / Poste / Objet</Label>
                      <AIInput
                        context="Description du poste ou de la prestation"
                        placeholder="Développeur Fullstack ou Création site web"
                        className="bg-input-background"
                        value={formData.details.description}
                        onChange={(e) => updateFormData('details', 'description', e.target.value)}
                        onAIChange={(val) => updateFormData('details', 'description', val)}
                      />
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Options additionnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-input-background cursor-pointer" onClick={() => updateFormData('options', 'confidentiality', !formData.options.confidentiality)}>
                      <Checkbox id="clause1" checked={formData.options.confidentiality} onCheckedChange={(val) => updateFormData('options', 'confidentiality', val)} />
                      <Label htmlFor="clause1" className="cursor-pointer text-sm">Clause de confidentialité</Label>
                    </div>
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-input-background cursor-pointer" onClick={() => updateFormData('options', 'nonCompete', !formData.options.nonCompete)}>
                      <Checkbox id="clause2" checked={formData.options.nonCompete} onCheckedChange={(val) => updateFormData('options', 'nonCompete', val)} />
                      <Label htmlFor="clause2" className="cursor-pointer text-sm">Clause de non-concurrence</Label>
                    </div>
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-input-background cursor-pointer" onClick={() => updateFormData('options', 'probation', !formData.options.probation)}>
                      <Checkbox id="clause3" checked={formData.options.probation} onCheckedChange={(val) => updateFormData('options', 'probation', val)} />
                      <Label htmlFor="clause3" className="cursor-pointer text-sm">Période d'essai</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-10">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="px-8">
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>
                <Button
                  className="bg-[#9C27B0] text-white hover:bg-[#7B1FA2] px-8 font-bold"
                  onClick={handleGenerateWithAI}
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Générer le contrat
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Preview & Edit */}
          {currentStep === 3 && (
            <div className="min-h-[400px]">
              {isGenerating ? (
                <Card className="p-16 text-center">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <Brain className="w-24 h-24 text-[#9C27B0] animate-pulse" />
                    <div className="absolute inset-0 bg-[#9C27B0]/20 rounded-full animate-ping"></div>
                  </div>
                  <h2 className="mb-4 font-bold text-2xl text-[#9C27B0]">Génération du contrat...</h2>
                  <p className="text-muted-foreground mb-8 text-lg">
                    Remplissage du modèle avec vos informations.
                  </p>
                  <div className="max-w-md mx-auto">
                    <div className="h-3 bg-muted rounded-full overflow-hidden border">
                      <div className="h-full bg-gradient-to-r from-[#9C27B0] to-[#E91E63] animate-[loading_2s_infinite]"></div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Preview */}
                  <Card className="lg:col-span-2 p-8 shadow-xl">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-xl">Aperçu du document</h3>
                      <div className="flex items-center gap-2">
                        <AiBadge />
                        <span className="text-xs text-muted-foreground">Version 1.0</span>
                      </div>
                    </div>

                    <div className="bg-white text-gray-800 p-10 rounded-lg min-h-[600px] shadow-inner border font-serif text-sm leading-relaxed overflow-y-auto max-h-[700px]">
                      <Textarea
                        value={contractText}
                        onChange={(e) => setContractText(e.target.value)}
                        className="w-full h-full min-h-[600px] border-none focus-visible:ring-0 p-0 resize-none font-serif text-base"
                      />
                    </div>

                    <div className="flex justify-between mt-8">
                      <Button variant="outline" onClick={() => setCurrentStep(2)} className="px-8">
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        Précédent
                      </Button>
                      <Button
                        className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-8 font-bold"
                        onClick={() => setCurrentStep(4)}
                      >
                        Suivant
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  {/* Edit Panel */}
                  <div className="space-y-6">
                    <Card className="p-6">
                      <h3 className="mb-4 font-bold flex items-center gap-2">
                        <Brain className="w-5 h-5 text-[#9C27B0]" />
                        Actions IA
                      </h3>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start text-sm hover:bg-[#9C27B0]/5 border-[#9C27B0]/30">
                          <Brain className="w-4 h-4 mr-3 text-[#9C27B0]" />
                          Simplifier le langage
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-sm hover:bg-[#2196F3]/5 border-[#2196F3]/30">
                          <Eye className="w-4 h-4 mr-3 text-[#2196F3]" />
                          Vérifier la conformité
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-6 bg-muted/40 border-dashed border-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Info</h4>
                      <p className="text-xs leading-relaxed italic">
                        Le contrat a été généré sur la base du modèle sélectionné. Vous pouvez le modifier manuellement avant de finaliser.
                      </p>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Signatories */}
          {currentStep === 4 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="mb-2 font-bold">Ajouter les signataires</h2>
                <p className="text-muted-foreground">
                  Définissez qui doit signer ce contrat par voie électronique.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {signatories.map((email, idx) => (
                  <Card key={idx} className="p-4 border-l-4 border-l-[#4CAF50] bg-[#4CAF50]/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#4CAF50]" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{email}</p>
                          <p className="text-xs text-muted-foreground">Signataire #{idx + 1}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeSignatory(email)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="email@destinataire.com"
                    className="bg-input-background"
                    value={newSignatory}
                    onChange={(e) => setNewSignatory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSignatory()}
                  />
                  <Button variant="outline" onClick={handleAddSignatory}>
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <Separator className="mb-8" />

              <div className="space-y-4 mb-10">
                <h3 className="font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#FFC107]" />
                  Sécurité et Blockchain
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-input-background">
                    <Checkbox id="sequential" defaultChecked />
                    <div>
                      <Label htmlFor="sequential" className="font-bold text-sm block mb-1">Signature séquentielle</Label>
                      <p className="text-xs text-muted-foreground">Chaque partie signe après la précédente.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-background border-[#FFC107]/30 bg-[#FFC107]/5">
                    <Shield className="w-5 h-5 text-[#FFC107] shrink-0" />
                    <div>
                      <p className="font-bold text-sm block mb-1">Enregistrement Blockchain</p>
                      <p className="text-xs text-muted-foreground">Le contrat sera ancré de manière immuable sur Polygon.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setCurrentStep(3)} className="px-8">
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>

                <div className="flex gap-3">
                  <Button
                    className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-10 py-6 text-lg font-bold"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || signatories.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        Finalisation...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-3" />
                        Déployer et Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {!isConnected && (
                <div className="mt-6 p-4 bg-[#FFC107]/10 border border-[#FFC107]/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FFC107]" />
                    <p className="text-sm">Veuillez connecter votre wallet pour la signature blockchain.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={connect} className="border-[#FFC107] text-[#FFC107] hover:bg-[#FFC107] hover:text-[#212121]">
                    Connecter
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

const Separator = ({ className }: { className?: string }) => (
  <div className={`h-[1px] bg-border w-full ${className}`} />
);


