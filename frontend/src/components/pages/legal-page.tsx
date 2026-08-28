import { ReactNode } from "react";
import { LandingHeader } from "../layout/landing-header";
import { LandingFooter } from "../layout/landing-footer";
import { AlertTriangle } from "lucide-react";

interface LegalPageProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

/**
 * Shared shell for the /legal/* pages. These are placeholders, not finished legal documents —
 * ContracTify had no Terms of Service, Privacy Policy, or Mentions légales at all before this
 * page existed (a real gap for a platform producing legally binding contracts and collecting
 * PII). The honest fix is to say so plainly rather than publish AI-drafted text as if a lawyer
 * had reviewed it; each page below states in its own content what governs the platform for now
 * and what is still pending.
 */
export function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : {updatedAt}</p>

        <div className="flex items-start gap-3 p-4 rounded-lg border border-[#FFC107]/30 bg-[#FFC107]/5 mb-10">
          <AlertTriangle className="w-5 h-5 text-[#FFC107] shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ce document est en cours de rédaction par un professionnel du droit et n'a pas encore
            été formellement validé. Il reflète l'intention actuelle de ContracTify, mais ne doit
            pas être considéré comme définitif tant que cette mention n'aura pas été retirée.
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-4 leading-relaxed">
          {children}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
