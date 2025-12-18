import { useState } from 'react';
import { LandingPage } from './components/pages/landing-page';
import { LoginPage } from './components/pages/login-page';
import { SignupPage } from './components/pages/signup-page';
import { DashboardPage } from './components/pages/dashboard-page';
import { ContractsPage } from './components/pages/contracts-page';
import { CreateContractPage } from './components/pages/create-contract-page';
import { ContractDetailsPage } from './components/pages/contract-details-page';
import { TemplatesPage } from './components/pages/templates-page';
import { TeamPage } from './components/pages/team-page';
import { SettingsPage } from './components/pages/settings-page';
import { HowItWorksPage } from './components/pages/how-it-works-page';

type Page = 
  | 'landing' 
  | 'login' 
  | 'signup' 
  | 'dashboard' 
  | 'contracts' 
  | 'create-contract'
  | 'contract-details'
  | 'templates'
  | 'team'
  | 'settings'
  | 'how-it-works';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
      {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {currentPage === 'signup' && <SignupPage onNavigate={handleNavigate} />}
      {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
      {currentPage === 'contracts' && <ContractsPage onNavigate={handleNavigate} />}
      {currentPage === 'create-contract' && <CreateContractPage onNavigate={handleNavigate} />}
      {currentPage === 'contract-details' && <ContractDetailsPage onNavigate={handleNavigate} />}
      {currentPage === 'templates' && <TemplatesPage onNavigate={handleNavigate} />}
      {currentPage === 'team' && <TeamPage onNavigate={handleNavigate} />}
      {currentPage === 'settings' && <SettingsPage onNavigate={handleNavigate} />}
      {currentPage === 'how-it-works' && <HowItWorksPage onNavigate={handleNavigate} />}
    </>
  );
}
