import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { AiBadge } from "../ui/ai-badge";
import { Input } from "../ui/input";
import { 
  Briefcase, 
  Users, 
  Home, 
  FileSignature, 
  Plus,
  Search,
  Pencil,
  Trash2
} from "lucide-react";

interface TemplatesPageProps {
  onNavigate: (page: string) => void;
}

export function TemplatesPage({ onNavigate }: TemplatesPageProps) {
  const aiTemplates = [
    {
      id: 1,
      name: "CDI",
      icon: Briefcase,
      description: "Contrat de travail à durée indéterminée conforme au code du travail français",
      uses: 45
    },
    {
      id: 2,
      name: "Freelance",
      icon: Users,
      description: "Contrat de prestation de services pour travailleurs indépendants",
      uses: 38
    },
    {
      id: 3,
      name: "Location",
      icon: Home,
      description: "Bail de location immobilière résidentielle ou commerciale",
      uses: 32
    },
    {
      id: 4,
      name: "NDA",
      icon: FileSignature,
      description: "Accord de confidentialité pour protéger vos informations sensibles",
      uses: 28
    },
    {
      id: 5,
      name: "Commercial",
      icon: Briefcase,
      description: "Contrat commercial B2B pour relations d'affaires",
      uses: 25
    },
    {
      id: 6,
      name: "CDD",
      icon: Briefcase,
      description: "Contrat de travail à durée déterminée",
      uses: 22
    },
  ];

  const customTemplates = [
    {
      id: 1,
      name: "Contrat SaaS personnalisé",
      description: "Modèle créé pour les abonnements SaaS",
      createdDate: "10/12/2024",
      uses: 8
    },
    {
      id: 2,
      name: "Partenariat startup",
      description: "Accord de partenariat adapté aux startups",
      createdDate: "05/12/2024",
      uses: 5
    },
  ];

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar currentPage="templates" onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">Modèles de contrats</h1>
            <p className="text-muted-foreground">
              Utilisez nos modèles générés par IA ou créez les vôtres
            </p>
          </div>
          <Button 
            className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
            onClick={() => onNavigate('create-contract')}
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer un modèle
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un modèle..."
            className="pl-10 bg-card"
          />
        </div>

        {/* AI Templates */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2>Modèles générés par IA</h2>
            <AiBadge />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FFC107]/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-[#FFC107]" />
                    </div>
                    <AiBadge />
                  </div>
                  
                  <h3 className="mb-2">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {template.uses} utilisations
                    </p>
                    <Button 
                      className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                      onClick={() => onNavigate('create-contract')}
                    >
                      Utiliser
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Custom Templates */}
        <div>
          <h2 className="mb-6">Mes modèles personnalisés</h2>
          
          {customTemplates.length > 0 ? (
            <div className="space-y-4">
              {customTemplates.map((template) => (
                <Card key={template.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="mb-2">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Créé le {template.createdDate}</span>
                        <span>•</span>
                        <span>{template.uses} utilisations</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                      <Button 
                        className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                        onClick={() => onNavigate('create-contract')}
                      >
                        Utiliser
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Plus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">Aucun modèle personnalisé</h3>
              <p className="text-muted-foreground mb-6">
                Créez vos propres modèles pour gagner du temps
              </p>
              <Button 
                className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                onClick={() => onNavigate('create-contract')}
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer un modèle
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
