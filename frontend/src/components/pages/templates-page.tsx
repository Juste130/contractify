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
  Trash2,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateSelector } from "@/components/contract/templateSelector";
import { CONTRACT_TEMPLATES } from "@/lib/contract-templates";

// Purely cosmetic — the actual list of supported contract types (fields, prompt content)
// lives in @/lib/contract-templates and is shared with the creation wizard.
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  cdi: Briefcase,
  cdd: Briefcase,
  freelance: Users,
  location: Home,
  nda: FileSignature,
  commercial: Briefcase,
  custom: FileSignature,
};

export function TemplatesPage() {
  const router = useRouter();

  const aiTemplates = CONTRACT_TEMPLATES.filter((t) => t.id !== "custom").map((t) => ({
    id: t.id,
    name: t.name,
    icon: TEMPLATE_ICONS[t.id] ?? FileSignature,
    description: t.description,
  }));

  const customTemplates: { id: number; name: string; description: string; createdDate: string; uses: number }[] = [];

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
            onSelect={(tpl) => router.push(`/create-contract?template=${tpl.id}`)}
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
