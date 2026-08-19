"use client";

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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateSelector } from "@/components/contract/templateSelector";

export function TemplatesPage() {
  const router = useRouter();

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
      {/* Sidebar will be positioned fixed, main content needs left margin */}
      <AppSidebar />

      <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="mb-2">Modèles de contrats</h1>
            <p className="text-muted-foreground">
              Utilisez nos modèles générés par IA ou créez les vôtres
            </p>
          </div>
          <Link href="/create-contract">
            <Button
              className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer un modèle
            </Button>
          </Link>
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

          <TemplateSelector
            templates={aiTemplates.map(t => ({ ...t, isAi: true }))}
            onSelect={() => router.push('/create-contract')}
          />
        </div>

        {/* Custom Templates */}
        <div>
          <h2 className="mb-6">Mes modèles personnalisés</h2>

          {customTemplates.length > 0 ? (
            <div className="space-y-4">
              {customTemplates.map((template) => (
                <Card key={template.id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                        onClick={() => router.push('/create-contract')}
                      >
                        Utiliser
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Supprimer le modèle">
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
                onClick={() => router.push('/create-contract')}
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
