import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { LandingHeader } from "../layout/landing-header";
import { LandingFooter } from "../layout/landing-footer";
import { Zap, Shield, Smile, Brain, ChevronDown, Star } from "lucide-react";
import { AiBadge } from "../ui/ai-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const features = [
    {
      icon: Zap,
      title: "Rapidité",
      description: "Créez et signez vos contrats en quelques minutes grâce à l'IA"
    },
    {
      icon: Shield,
      title: "Sécurité",
      description: "Vos données sont protégées avec un chiffrement de niveau bancaire"
    },
    {
      icon: Smile,
      title: "Simplicité",
      description: "Interface intuitive, aucune formation requise"
    }
  ];

  const testimonials = [
    {
      name: "Marie Laurent",
      role: "Directrice RH",
      company: "TechCorp",
      content: "Contractify nous a fait gagner 80% de temps sur la gestion des contrats. L'IA génère des documents parfaits à chaque fois.",
      rating: 5
    },
    {
      name: "Pierre Dubois",
      role: "Freelance",
      company: "Consultant",
      content: "Enfin une solution simple pour mes contrats freelance. Plus besoin d'un juriste pour chaque mission !",
      rating: 5
    },
    {
      name: "Sophie Martin",
      role: "CEO",
      company: "StartupCo",
      content: "La signature électronique et le suivi en temps réel ont transformé notre processus. Indispensable !",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "Comment fonctionne la génération de contrats par IA ?",
      answer: "Notre IA analyse vos besoins et génère automatiquement un contrat conforme aux normes juridiques. Vous n'avez qu'à remplir un formulaire simple avec les informations clés, et l'IA rédige le document complet en quelques secondes."
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Absolument. Nous utilisons un chiffrement de niveau bancaire pour toutes vos données. De plus, notre infrastructure blockchain garantit l'intégrité et la traçabilité de tous vos contrats."
    },
    {
      question: "Puis-je personnaliser les modèles générés par l'IA ?",
      answer: "Oui, tous les contrats générés peuvent être modifiés selon vos besoins. L'IA propose une base solide que vous pouvez ajuster avec notre éditeur intuitif."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#FFC107]/10 px-4 py-2 rounded-full mb-6">
              <AiBadge />
              <span className="text-sm">Propulsé par l'intelligence artificielle</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-6 max-w-4xl mx-auto">
              Simplifiez la gestion de vos contrats
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Créez, signez et gérez tous vos contrats en un seul endroit. 
              L'IA rédige vos documents en quelques secondes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-8 py-6"
                onClick={() => onNavigate('signup')}
              >
                Commencer gratuitement
              </Button>
              <Button 
                variant="outline"
                className="px-8 py-6"
                onClick={() => onNavigate('how-it-works')}
              >
                Comment ça marche
              </Button>
            </div>
          </div>

          <div className="mt-16">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1748609339084-ea43ec1b8fbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBidXNpbmVzcyUyMGRhc2hib2FyZHxlbnwxfHx8fDE3NjYwMDAyNjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Dashboard Contractify"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="mb-4">Pourquoi choisir Contractify ?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Une solution complète pour transformer votre gestion de contrats
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-8 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#FFC107]/10 rounded-2xl flex items-center justify-center">
                    <Icon className="w-8 h-8 text-[#FFC107]" />
                  </div>
                  <h3 className="mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <Brain className="w-6 h-6 text-[#9C27B0]" />
                <AiBadge />
              </div>
              
              <h2 className="mb-6">Rédaction automatique par IA</h2>
              
              <p className="text-muted-foreground mb-6">
                Notre intelligence artificielle avancée analyse vos besoins et génère 
                automatiquement des contrats professionnels conformes aux normes juridiques.
              </p>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-[#4CAF50]">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1">Génération instantanée</h4>
                    <p className="text-sm text-muted-foreground">
                      Créez un contrat complet en moins de 30 secondes
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-[#4CAF50]">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1">Conformité juridique</h4>
                    <p className="text-sm text-muted-foreground">
                      Tous les contrats respectent la législation en vigueur
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-[#4CAF50]">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1">Personnalisation facile</h4>
                    <p className="text-sm text-muted-foreground">
                      Modifiez et ajustez chaque clause selon vos besoins
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-[#9C27B0]/10 to-[#FFC107]/10 rounded-2xl p-8 border border-border">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-8 h-8 text-[#9C27B0]" />
                  <div className="flex-1">
                    <div className="h-2 bg-[#9C27B0]/20 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-[#9C27B0] animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <p className="text-[#9C27B0] text-sm mb-4">IA rédige votre contrat...</p>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                  <div className="h-3 bg-muted rounded w-4/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="mb-4">Ils nous font confiance</h2>
            <p className="text-muted-foreground">
              Découvrez ce que nos utilisateurs pensent de Contractify
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#FFC107] text-[#FFC107]" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>
                <div>
                  <p>{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role} - {testimonial.company}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="mb-4">Questions fréquentes</h2>
            <p className="text-muted-foreground">
              Tout ce que vous devez savoir sur Contractify
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-6">
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#FFC107] to-[#FFB300]">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-[#212121] mb-6">
            Prêt à simplifier vos contrats ?
          </h2>
          <p className="text-[#212121]/80 text-xl mb-8">
            Rejoignez des milliers d'entreprises qui font confiance à Contractify
          </p>
          <Button 
            className="bg-[#212121] text-white hover:bg-[#212121]/90 px-8 py-6"
            onClick={() => onNavigate('signup')}
          >
            Commencer gratuitement
          </Button>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
