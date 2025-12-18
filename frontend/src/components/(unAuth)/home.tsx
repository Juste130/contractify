"use client";
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Users, 
  Zap, 
  ArrowRight, 
  Star,
  Play,
  ChevronRight,
  Award,
} from 'lucide-react';
import Header from '../layout/header';
import Footer from '../layout/footer';

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: FileText,
      title: "Contrats Intelligents",
      description: "Créez des contrats sécurisés avec nos templates professionnels (CDI, Freelance, Location)",
      color: "text-primary-600"
    },
    {
      icon: Shield,
      title: "Signatures Cryptographiques", 
      description: "Signez vos contrats de manière sécurisée via MetaMask avec preuve blockchain",
      color: "text-secondary-600"
    },
    {
      icon: Award,
      title: "NFT de Preuve",
      description: "Chaque contrat signé génère automatiquement un NFT unique comme preuve légale",
      color: "text-accent-600"
    }
  ];

  const stats = [
    { number: "100%", label: "Sécurisé", subtext: "Blockchain Polygon" },
    { number: "24/7", label: "Disponible", subtext: "Service continu" },
    { number: "< 2min", label: "Signature", subtext: "Processus rapide" }
  ];

  const steps = [
    {
      step: "01",
      title: "Créer",
      description: "Choisissez un template et personnalisez votre contrat",
      icon: FileText
    },
    {
      step: "02", 
      title: "Inviter",
      description: "Ajoutez les signataires et envoyez les invitations",
      icon: Users
    },
    {
      step: "03",
      title: "Signer",
      description: "Signatures cryptographiques sécurisées via MetaMask",
      icon: Shield
    },
    {
      step: "04",
      title: "Finaliser",
      description: "Génération automatique du NFT de preuve",
      icon: Award
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header/>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Plateforme de contrats blockchain
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Des contrats{' '}
              <span className="text-primary-600">intelligents</span>
              <br />
              sécurisés par NFT
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Créez, signez et exécutez vos contrats en toute sécurité grâce à la blockchain. 
              Chaque accord génère un NFT unique comme preuve indélébile.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button className="bg-primary-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-600 transition-all hover:shadow-lg flex items-center">
                Créer mon premier contrat
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center">
                <Play className="w-5 h-5 mr-2" />
                Voir la démo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                  <div className="text-sm font-medium text-gray-600 mb-1">{stat.label}</div>
                  <div className="text-xs text-gray-500">{stat.subtext}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Une solution complète et sécurisée
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Découvrez les fonctionnalités qui font de ContractChain la référence 
              en matière de contrats intelligents
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className={`bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                    activeFeature === index ? 'ring-2 ring-primary-500 shadow-lg' : ''
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-6`}>
                    <Icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-gray-600">
              4 étapes simples pour créer et signer vos contrats blockchain
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="relative mb-8">
                    <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 hover:bg-primary-600 transition-colors">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary-100 text-primary-700 text-sm font-bold px-3 py-1 rounded-full">
                        {step.step}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-8 left-full w-full">
                        <ChevronRight className="w-6 h-6 text-gray-400 mx-auto" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ils nous font confiance
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marie Dubois",
                role: "Directrice RH, TechCorp",
                content: "ContractChain a révolutionné notre processus de signature des CDI. Simple, sécurisé et legally binding.",
                rating: 5
              },
              {
                name: "Jean-Baptiste K.",
                role: "Freelance Développeur",
                content: "Parfait pour mes missions freelance. Les paiements automatiques me font gagner un temps précieux.",
                rating: 5
              },
              {
                name: "Amina Traoré",
                role: "Propriétaire immobilier",
                content: "La gestion des baux n'a jamais été aussi simple. Le NFT de preuve rassure mes locataires.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">{testimonial.content}</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary-500">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à créer votre premier contrat ?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Rejoignez la nouvelle génération de contrats intelligents sécurisés par blockchain
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="text-primary-600 px-8 py-4 rounded-lg bg-gray-50 font-semibold hover:bg-gray-100 transition-colors" onClick={() => alert('Inscription gratuite !')}>
              Commencer gratuitement
            </button>
            <button className="border border-primary-300 text-white px-8 py-4 rounded-lg bg-[#3b82f6] font-semibold hover:bg-primary-600 transition-colors" onClick={() => alert('Planifier une démo !')}>
              Planifier une démo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer/>
    </div>
  );
};
