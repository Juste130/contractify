import { LandingHeader } from "../layout/landing-header";
import { LandingFooter } from "../layout/landing-footer";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { AiBadge } from "../ui/ai-badge";
import Link from "next/link";
import {
  FileText,
  Brain,
  CheckCircle2,
  Send,
  Zap,
  Shield,
  Clock,
  Users,
  TrendingUp,
  Lock
} from "lucide-react";

export function HowItWorksPage() {
  const steps = [
    {
      number: 1,
      title: "Choisissez un modèle",
      description: "Sélectionnez un type de contrat parmi nos modèles pré-conçus ou créez un contrat personnalisé",
      icon: FileText,
      color: "#FFC107"
    },
    {
      number: 2,
      title: "L'IA génère le contrat",
      description: "Remplissez un simple formulaire et notre IA rédige automatiquement un contrat complet en quelques secondes",
      icon: Brain,
      color: "#9C27B0"
    },
    {
      number: 3,
      title: "Personnalisez et validez",
      description: "Relisez et modifiez le document généré selon vos besoins avec notre éditeur intuitif",
      icon: CheckCircle2,
      color: "#4CAF50"
    },
    {
      number: 4,
      title: "Envoyez pour signature",
      description: "Ajoutez les signataires et envoyez le contrat pour signature électronique sécurisée",
      icon: Send,
      color: "#2196F3"
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Gain de temps massif",
      description: "Réduisez de 80% le temps de création de contrats. Ce qui prenait des heures ne prend plus que quelques minutes."
    },
    {
      icon: Shield,
      title: "Conformité juridique",
      description: "Nos modèles sont conformes aux normes juridiques françaises et régulièrement mis à jour par des experts."
    },
    {
      icon: Users,
      title: "Collaboration simplifiée",
      description: "Travaillez en équipe sur vos contrats avec des permissions personnalisables et un suivi en temps réel."
    },
    {
      icon: TrendingUp,
      title: "Suivi intelligent",
      description: "Tableaux de bord et analytics pour suivre l'état de tous vos contrats en un coup d'œil."
    }
  ];

  const securityFeatures = [
    {
      icon: Lock,
      title: "Chiffrement bout en bout",
      description: "Toutes vos données sont chiffrées avec un protocole de niveau bancaire (AES-256)"
    },
    {
      icon: Shield,
      title: "Blockchain",
      description: "Chaque signature est enregistrée sur blockchain pour une traçabilité et une preuve juridique immuables"
    },
    {
      icon: CheckCircle2,
      title: "Signature électronique qualifiée",
      description: "Nos signatures électroniques ont la même valeur juridique qu'une signature manuscrite"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#FFC107]/10 to-[#FFB300]/5">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full mb-6 shadow-sm">
            <AiBadge />
            <span className="text-sm">Propulsé par l'intelligence artificielle</span>
          </div>

          <h1 className="mb-6">Comment fonctionne Contractify ?</h1>

          <p className="text-xl text-muted-foreground mb-8">
            Créez des contrats professionnels en 4 étapes simples, grâce à l'IA
          </p>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={step.number}
                  className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}
                >
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                        style={{ backgroundColor: step.color }}
                      >
                        {step.number}
                      </div>
                      <h2>{step.title}</h2>
                    </div>
                    <p className="text-lg text-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  {/* Illustration */}
                  <div className="flex-1">
                    <Card className="p-12 bg-muted flex items-center justify-center">
                      <Icon
                        className="w-32 h-32"
                        style={{ color: step.color }}
                      />
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Generation Demo */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-[#9C27B0]" />
              <AiBadge />
            </div>
            <h2 className="mb-4">Le processus de génération IA</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Notre intelligence artificielle analyse vos besoins et génère un contrat complet en quelques secondes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="w-12 h-12 rounded-xl bg-[#9C27B0]/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-[#9C27B0]" />
              </div>
              <h3 className="mb-3">Analyse</h3>
              <p className="text-muted-foreground">
                L'IA analyse le type de contrat et les informations fournies pour comprendre vos besoins spécifiques
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-xl bg-[#9C27B0]/10 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-[#9C27B0]" />
              </div>
              <h3 className="mb-3">Rédaction</h3>
              <p className="text-muted-foreground">
                Le système génère automatiquement toutes les clauses nécessaires, conformes aux normes juridiques
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-xl bg-[#9C27B0]/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-[#9C27B0]" />
              </div>
              <h3 className="mb-3">Vérification</h3>
              <p className="text-muted-foreground">
                Une dernière vérification automatique assure la cohérence et la conformité du document final
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="mb-4">Les avantages de Contractify</h2>
            <p className="text-lg text-muted-foreground">
              Découvrez pourquoi des milliers d'entreprises nous font confiance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="p-8">
                  <div className="w-14 h-14 rounded-xl bg-[#FFC107]/10 flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-[#FFC107]" />
                  </div>
                  <h3 className="mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4CAF50]/10 mb-4">
              <Shield className="w-8 h-8 text-[#4CAF50]" />
            </div>
            <h2 className="mb-4">Sécurité de niveau entreprise</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Vos contrats et données sont protégés par les technologies de sécurité les plus avancées
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {securityFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[#4CAF50]" />
                  </div>
                  <h3 className="mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>

          <Card className="p-8 mt-12 bg-gradient-to-br from-[#4CAF50]/5 to-[#4CAF50]/10 border-[#4CAF50]/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#4CAF50]" />
              </div>
              <div>
                <h3 className="mb-2">Blockchain pour la traçabilité</h3>
                <p className="text-muted-foreground">
                  Chaque contrat signé est enregistré sur notre blockchain privée,
                  garantissant une preuve d'horodatage immuable et juridiquement valable.
                  Cette technologie assure que vos documents ne peuvent pas être modifiés
                  rétroactivement et fournit une piste d'audit complète.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="mb-6">Prêt à simplifier vos contrats ?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Rejoignez des milliers d'entreprises qui gagnent du temps avec Contractify
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-8 py-6"
              >
                Commencer gratuitement
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                className="px-8 py-6"
              >
                En savoir plus
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
