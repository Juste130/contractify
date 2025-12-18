import { useState } from "react";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { 
  User, 
  Brain, 
  Lock, 
  Bell, 
  CreditCard, 
  Info,
  Camera,
  Shield
} from "lucide-react";

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [selectedSection, setSelectedSection] = useState("profile");

  const sections = [
    { id: "profile", label: "Profil", icon: User },
    { id: "ai", label: "Préférences IA", icon: Brain },
    { id: "security", label: "Sécurité", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "subscription", label: "Abonnement", icon: CreditCard },
    { id: "about", label: "À propos", icon: Info },
  ];

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar currentPage="settings" onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        <h1 className="mb-8">Paramètres du compte</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <Card className="p-4 h-fit">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      selectedSection === section.id
                        ? 'bg-[#FFC107] text-[#212121]'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </Card>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Section */}
            {selectedSection === "profile" && (
              <Card className="p-6">
                <h2 className="mb-6">Profil</h2>
                
                <div className="flex items-center gap-6 mb-8">
                  <Avatar className="w-24 h-24">
                    <AvatarFallback className="bg-[#FFC107] text-[#212121] text-2xl">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline">
                      <Camera className="w-4 h-4 mr-2" />
                      Changer la photo
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG ou GIF. 5 MB max.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prénom</Label>
                      <Input defaultValue="Jean" className="bg-input-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input defaultValue="Dupont" className="bg-input-background" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue="jean@exemple.com" type="email" className="bg-input-background" />
                  </div>

                  <div className="space-y-2">
                    <Label>Entreprise</Label>
                    <Input defaultValue="TechCorp SAS" className="bg-input-background" />
                  </div>

                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input defaultValue="+33 6 12 34 56 78" className="bg-input-background" />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                    Enregistrer les modifications
                  </Button>
                </div>
              </Card>
            )}

            {/* AI Preferences Section */}
            {selectedSection === "ai" && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Brain className="w-6 h-6 text-[#9C27B0]" />
                  <h2>Préférences IA</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1">Suggestions automatiques</h4>
                      <p className="text-sm text-muted-foreground">
                        L'IA propose des améliorations pendant la rédaction
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1">Rédaction automatique</h4>
                      <p className="text-sm text-muted-foreground">
                        Générer automatiquement les clauses standards
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1">Vérification juridique</h4>
                      <p className="text-sm text-muted-foreground">
                        L'IA vérifie la conformité juridique des contrats
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Ton des documents</Label>
                    <select className="w-full p-2 rounded-lg border border-border bg-input-background">
                      <option>Formel (par défaut)</option>
                      <option>Semi-formel</option>
                      <option>Professionnel</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Langue préférée</Label>
                    <select className="w-full p-2 rounded-lg border border-border bg-input-background">
                      <option>Français</option>
                      <option>English</option>
                      <option>Español</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                    Enregistrer
                  </Button>
                </div>
              </Card>
            )}

            {/* Security Section */}
            {selectedSection === "security" && (
              <Card className="p-6">
                <h2 className="mb-6">Sécurité</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="mb-4">Mot de passe</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Mot de passe actuel</Label>
                        <Input type="password" className="bg-input-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nouveau mot de passe</Label>
                        <Input type="password" className="bg-input-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirmer le mot de passe</Label>
                        <Input type="password" className="bg-input-background" />
                      </div>
                    </div>
                    <Button variant="outline" className="mt-4">
                      Changer le mot de passe
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1">Authentification à deux facteurs</h4>
                      <p className="text-sm text-muted-foreground">
                        Sécurisez votre compte avec une vérification supplémentaire
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-3">Sessions actives</h3>
                    <div className="space-y-3">
                      <Card className="p-4 bg-muted">
                        <div className="flex items-center justify-between">
                          <div>
                            <p>MacBook Pro - Paris, France</p>
                            <p className="text-sm text-muted-foreground">Session actuelle</p>
                          </div>
                          <span className="text-[#4CAF50] text-sm">Actif</span>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p>iPhone - Lyon, France</p>
                            <p className="text-sm text-muted-foreground">Dernière activité: Il y a 2 jours</p>
                          </div>
                          <Button variant="outline" size="sm">
                            Déconnecter
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Notifications Section */}
            {selectedSection === "notifications" && (
              <Card className="p-6">
                <h2 className="mb-6">Notifications</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="mb-4">Email</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="mb-1">Nouveaux contrats</h4>
                          <p className="text-sm text-muted-foreground">
                            Quand un nouveau contrat est créé
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="mb-1">Signatures</h4>
                          <p className="text-sm text-muted-foreground">
                            Quand un contrat est signé
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="mb-1">Rappels</h4>
                          <p className="text-sm text-muted-foreground">
                            Rappels pour les contrats en attente
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-4">In-app</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="mb-1">Messages</h4>
                          <p className="text-sm text-muted-foreground">
                            Notifications pour les nouvelles discussions
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="mb-1">Mentions d'équipe</h4>
                          <p className="text-sm text-muted-foreground">
                            Quand quelqu'un vous mentionne
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                    Enregistrer
                  </Button>
                </div>
              </Card>
            )}

            {/* Subscription Section */}
            {selectedSection === "subscription" && (
              <Card className="p-6">
                <h2 className="mb-6">Abonnement</h2>

                <Card className="p-6 bg-gradient-to-br from-[#FFC107]/10 to-[#FFB300]/10 border-[#FFC107] mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3>Plan Pro</h3>
                      <p className="text-sm text-muted-foreground">
                        Abonnement actif jusqu'au 17 janvier 2025
                      </p>
                    </div>
                    <p className="text-2xl">49€<span className="text-sm text-muted-foreground">/mois</span></p>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <p>✓ Contrats illimités</p>
                    <p>✓ IA avancée</p>
                    <p>✓ 10 membres d'équipe</p>
                    <p>✓ Signature électronique</p>
                    <p>✓ Support prioritaire</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Changer de plan
                  </Button>
                </Card>

                <div className="space-y-4">
                  <h3>Historique des paiements</h3>
                  <div className="space-y-2">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p>17 décembre 2024</p>
                          <p className="text-sm text-muted-foreground">Plan Pro</p>
                        </div>
                        <div className="text-right">
                          <p>49€</p>
                          <Button variant="ghost" size="sm">
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p>17 novembre 2024</p>
                          <p className="text-sm text-muted-foreground">Plan Pro</p>
                        </div>
                        <div className="text-right">
                          <p>49€</p>
                          <Button variant="ghost" size="sm">
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            )}

            {/* About Section */}
            {selectedSection === "about" && (
              <Card className="p-6">
                <h2 className="mb-6">À propos</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3">Contractify</h3>
                    <p className="text-muted-foreground mb-2">Version 2.0.1</p>
                    <p className="text-sm text-muted-foreground">
                      Contractify est une plateforme de gestion de contrats propulsée par l'IA,
                      conçue pour simplifier la création, la signature et la gestion de tous vos documents juridiques.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-[#9C27B0]" />
                      <h3>Sécurité avancée</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vos contrats sont protégés par un chiffrement de niveau bancaire. 
                      De plus, notre infrastructure utilise la technologie blockchain pour garantir 
                      l'intégrité et la traçabilité de tous vos documents. Chaque contrat signé 
                      est horodaté et enregistré de manière immuable, assurant une preuve 
                      juridique incontestable.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <a href="#" className="block text-[#FFC107] hover:underline">
                      Centre d'aide
                    </a>
                    <a href="#" className="block text-[#FFC107] hover:underline">
                      Conditions d'utilisation
                    </a>
                    <a href="#" className="block text-[#FFC107] hover:underline">
                      Politique de confidentialité
                    </a>
                    <a href="#" className="block text-[#FFC107] hover:underline">
                      Nous contacter
                    </a>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
