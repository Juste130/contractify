import { useState } from "react";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { AiBadge } from "../ui/ai-badge";
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
  Trash2
} from "lucide-react";
import { Checkbox } from "../ui/checkbox";

interface CreateContractPageProps {
  onNavigate: (page: string) => void;
}

export function CreateContractPage({ onNavigate }: CreateContractPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const contractTemplates = [
    { 
      id: "cdi", 
      name: "CDI", 
      icon: Briefcase, 
      description: "Contrat à durée indéterminée"
    },
    { 
      id: "freelance", 
      name: "Freelance", 
      icon: Users, 
      description: "Contrat de prestation de services"
    },
    { 
      id: "location", 
      name: "Location", 
      icon: Home, 
      description: "Bail de location immobilière"
    },
    { 
      id: "nda", 
      name: "NDA", 
      icon: FileSignature, 
      description: "Accord de confidentialité"
    },
    { 
      id: "commercial", 
      name: "Commercial", 
      icon: Briefcase, 
      description: "Contrat commercial"
    },
    { 
      id: "custom", 
      name: "Personnalisé", 
      icon: FileText, 
      description: "Créer un contrat sur mesure"
    },
  ];

  const steps = [
    { number: 1, title: "Type de contrat" },
    { number: 2, title: "Informations" },
    { number: 3, title: "Aperçu & Édition" },
    { number: 4, title: "Signataires" },
  ];

  const handleGenerateWithAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setCurrentStep(3);
    }, 3000);
  };

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar currentPage="contracts" onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">Créer un nouveau contrat</h1>
          <p className="text-muted-foreground">
            Laissez notre IA vous guider pour créer un contrat professionnel
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      currentStep >= step.number 
                        ? 'bg-[#FFC107] text-[#212121]' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.number}
                  </div>
                  <p className={`text-xs mt-2 ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 mx-2 mb-6 ${
                    currentStep > step.number ? 'bg-[#FFC107]' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="mb-2">Choisissez le type de contrat</h2>
                <p className="text-muted-foreground">
                  Sélectionnez un modèle ou créez un contrat personnalisé
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {contractTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card
                      key={template.id}
                      className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                        selectedTemplate === template.id
                          ? 'border-2 border-[#FFC107] bg-[#FFC107]/5'
                          : 'border-2 border-transparent'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="w-8 h-8 text-[#FFC107]" />
                        <AiBadge />
                      </div>
                      <h3 className="mb-2">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
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
                <h2 className="mb-2">Remplissez les informations</h2>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Brain className="w-5 h-5 text-[#9C27B0]" />
                  <p>Notre IA rédige automatiquement votre contrat</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Partie A */}
                <div className="space-y-4">
                  <h3>Partie A</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom complet</Label>
                      <Input placeholder="Jean Dupont" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="jean@exemple.com" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Adresse</Label>
                      <Input placeholder="123 Rue de la Paix" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input placeholder="+33 6 12 34 56 78" className="bg-input-background" />
                    </div>
                  </div>
                </div>

                {/* Partie B */}
                <div className="space-y-4">
                  <h3>Partie B</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom complet</Label>
                      <Input placeholder="Sophie Martin" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="sophie@exemple.com" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Adresse</Label>
                      <Input placeholder="456 Avenue des Champs" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input placeholder="+33 6 98 76 54 32" className="bg-input-background" />
                    </div>
                  </div>
                </div>

                {/* Détails du contrat */}
                <div className="space-y-4">
                  <h3>Détails du contrat</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Durée</Label>
                      <Input placeholder="12 mois" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Montant</Label>
                      <Input placeholder="50 000 €" className="bg-input-background" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Modalités de paiement</Label>
                      <Input placeholder="Mensuel, virement bancaire" className="bg-input-background" />
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <h3>Options</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id="clause1" />
                      <Label htmlFor="clause1" className="cursor-pointer">
                        Inclure une clause de confidentialité
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="clause2" />
                      <Label htmlFor="clause2" className="cursor-pointer">
                        Inclure une clause de non-concurrence
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="clause3" />
                      <Label htmlFor="clause3" className="cursor-pointer">
                        Ajouter une période d'essai
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>
                <Button
                  className="bg-[#9C27B0] text-white hover:bg-[#7B1FA2]"
                  onClick={handleGenerateWithAI}
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Générer avec IA
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Preview & Edit */}
          {currentStep === 3 && (
            <>
              {isGenerating ? (
                <Card className="p-12 text-center">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-[#9C27B0] animate-pulse" />
                  <h2 className="mb-2">IA rédige votre contrat...</h2>
                  <p className="text-muted-foreground mb-6">
                    Veuillez patienter quelques instants
                  </p>
                  <div className="max-w-md mx-auto">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-[#9C27B0] animate-pulse"></div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Preview */}
                  <Card className="lg:col-span-2 p-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h3>Aperçu du document</h3>
                      <AiBadge />
                    </div>
                    
                    <div className="bg-muted p-8 rounded-lg min-h-[600px] space-y-4">
                      <div className="text-center mb-6">
                        <h2>CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE</h2>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <p>Entre les soussignés :</p>
                        <p>La société [Nom de l'entreprise], représentée par [Représentant légal]...</p>
                        <p>Ci-après dénommée "l'Employeur"</p>
                        <p>D'une part,</p>
                        <p>Et</p>
                        <p>M./Mme [Nom du salarié], demeurant à [Adresse]...</p>
                        <p>Ci-après dénommé(e) "le Salarié"</p>
                        <p>D'autre part,</p>
                        <p>Il a été convenu ce qui suit :</p>
                        <h4 className="pt-4">Article 1 - Engagement</h4>
                        <p>L'Employeur engage le Salarié qui accepte, aux clauses et conditions du présent contrat...</p>
                        <h4 className="pt-4">Article 2 - Fonctions</h4>
                        <p>Le Salarié exercera les fonctions de [Poste]...</p>
                      </div>
                    </div>

                    <div className="flex justify-between mt-6">
                      <Button variant="outline" onClick={() => setCurrentStep(2)}>
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        Retour
                      </Button>
                      <Button
                        className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                        onClick={() => setCurrentStep(4)}
                      >
                        Suivant
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  {/* Edit Panel */}
                  <Card className="p-6">
                    <h3 className="mb-4">Éditer le document</h3>
                    
                    <div className="space-y-3 mb-6">
                      <div className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                        <p className="text-sm">Article 1 - Engagement</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                        <p className="text-sm">Article 2 - Fonctions</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                        <p className="text-sm">Article 3 - Rémunération</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                        <p className="text-sm">Article 4 - Durée</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <Brain className="w-4 h-4 mr-2 text-[#9C27B0]" />
                        Améliorer avec IA
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une clause
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Step 4: Signatories */}
          {currentStep === 4 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="mb-2">Ajouter les signataires</h2>
                <p className="text-muted-foreground">
                  Définissez qui doit signer ce contrat
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#4CAF50]" />
                      </div>
                      <div>
                        <p>Jean Dupont</p>
                        <p className="text-sm text-muted-foreground">jean@exemple.com</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#4CAF50]" />
                      </div>
                      <div>
                        <p>Sophie Martin</p>
                        <p className="text-sm text-muted-foreground">sophie@exemple.com</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </Card>

                <Button variant="outline" className="w-full">
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter un signataire
                </Button>
              </div>

              <div className="space-y-4 mb-8">
                <h3>Options d'envoi</h3>
                <div className="flex items-center gap-2">
                  <Checkbox id="sequential" defaultChecked />
                  <Label htmlFor="sequential" className="cursor-pointer">
                    Signature séquentielle (dans l'ordre)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="reminder" defaultChecked />
                  <Label htmlFor="reminder" className="cursor-pointer">
                    Envoyer des rappels automatiques
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="notify" defaultChecked />
                  <Label htmlFor="notify" className="cursor-pointer">
                    Me notifier à chaque signature
                  </Label>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline">
                    <Eye className="w-5 h-5 mr-2" />
                    Prévisualiser
                  </Button>
                  <Button
                    className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                    onClick={() => onNavigate('dashboard')}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Envoyer pour signature
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
