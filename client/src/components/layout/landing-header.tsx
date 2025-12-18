import { Button } from "../ui/button";

interface LandingHeaderProps {
  onNavigate: (page: string) => void;
}

export function LandingHeader({ onNavigate }: LandingHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <h2 className="text-[#FFC107]">Contractify</h2>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-[#FFC107] transition-colors">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="text-foreground hover:text-[#FFC107] transition-colors">
              Comment ça marche
            </a>
            <a href="#testimonials" className="text-foreground hover:text-[#FFC107] transition-colors">
              Témoignages
            </a>
            <a href="#faq" className="text-foreground hover:text-[#FFC107] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => onNavigate('login')}
            >
              Se connecter
            </Button>
            <Button
              className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
              onClick={() => onNavigate('signup')}
            >
              Commencer gratuitement
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
