import { Shield } from 'lucide-react';
import { AuthAwareCta } from './auth-aware-cta';
export default function Header() {
    return (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#3b82f6]">Contrac<span className='text-[#22c55e]'>Tify</span></span>
            </div>
            <AuthAwareCta />
          </div>
        </div>
      </header>
    );
}