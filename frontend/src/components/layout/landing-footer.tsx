import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-[#212121] text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-[#FFC107] mb-4">ContracTify</h3>
            <p className="text-sm text-gray-400">
              Simplifiez la gestion de vos contrats avec l'IA.
            </p>
          </div>
          
          <div>
            <h4 className="mb-4">Produit</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#FFC107]">Fonctionnalités</a></li>
              <li><a href="#" className="hover:text-[#FFC107]">Tarifs</a></li>
              <li><a href="#" className="hover:text-[#FFC107]">Sécurité</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4">Entreprise</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#FFC107]">À propos</a></li>
              <li><a href="#" className="hover:text-[#FFC107]">Blog</a></li>
              <li><a href="#" className="hover:text-[#FFC107]">Carrières</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#FFC107]">Centre d'aide</a></li>
              <li><a href="#" className="hover:text-[#FFC107]">Contact</a></li>
              <li><Link href="/legal/mentions-legales" className="hover:text-[#FFC107]">Mentions légales</Link></li>
              <li><Link href="/legal/cgu" className="hover:text-[#FFC107]">Conditions générales</Link></li>
              <li><Link href="/legal/confidentialite" className="hover:text-[#FFC107]">Confidentialité</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} ContracTify. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
