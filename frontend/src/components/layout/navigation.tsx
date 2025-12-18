import { WalletButton } from "../auth/walletButton";
export default function Navigation() {
    return (
        <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">Fonctionnalités</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary-600 transition-colors">Comment ça marche</a>
              <a href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors">Tarifs</a>            
              <WalletButton />
        </nav>
    );
}