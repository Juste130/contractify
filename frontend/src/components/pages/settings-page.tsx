"use client";

import { useState } from "react";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { useAuthStore } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useWeb3 } from "@/contexts/web3-context";
import { usersApi } from "@/lib/api/users";
import {
  User,
  Brain,
  Lock,
  Bell,
  Camera,
  Shield,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export function SettingsPage() {
  const [selectedSection, setSelectedSection] = useState("profile");
  const { user, checkAuth } = useAuthStore();
  const { account, balance, chainId, connect, disconnect, isConnecting, isConnected } = useWeb3();
  const { notifySuccess, notifyError } = useNotifications();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const sections = [
    { id: "profile", label: "Profil", icon: User },
    { id: "wallet", label: "Wallet Web3", icon: Wallet },
    { id: "ai", label: "Préférences IA", icon: Brain },
    { id: "security", label: "Sécurité", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const name = formData.get('name') as string;
      await usersApi.updateProfile({ name });
      await checkAuth(); // Refresh user data
      setMessage({ text: "Profil mis à jour avec succès !", type: 'success' });
      notifySuccess("Profil mis à jour", "Vos informations ont été enregistrées avec succès.");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Erreur lors de la mise à jour";
      setMessage({ text: errMsg, type: 'error' });
      notifyError("Erreur de mise à jour", errMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar />

      <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${selectedSection === section.id
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
            {message && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            {/* Profile Section */}
            {selectedSection === "profile" && (
              <Card className="p-6">
                <h2 className="mb-6">Profil</h2>

                <form onSubmit={handleUpdateProfile}>
                  <div className="flex items-center gap-6 mb-8">
                    <Avatar className="w-24 h-24">
                      <AvatarFallback className="bg-[#FFC107] text-[#212121] text-2xl font-bold">
                        {user?.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button type="button" variant="outline">
                        <Camera className="w-4 h-4 mr-2" />
                        Changer la photo
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        JPG, PNG ou GIF. 5 MB max.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input id="name" name="name" defaultValue={user?.profileData?.name || ""} className="bg-input-background" />
                    </div>

                    <div className="space-y-2">
                      <Label>Email (non modifiable)</Label>
                      <Input defaultValue={user?.email} disabled className="bg-muted opacity-60" />
                    </div>

                    <div className="space-y-2">
                      <Label>Rôle</Label>
                      <Input defaultValue={user?.role} disabled className="bg-muted opacity-60" />
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                    >
                      {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Wallet Section */}
            {selectedSection === "wallet" && (
              <Card className="p-6">
                <h2 className="mb-6">Wallet Web3</h2>
                <p className="text-muted-foreground mb-8">
                  Connectez votre wallet pour signer numériquement vos contrats sur la blockchain Polygon.
                </p>

                {isConnected ? (
                  <div className="space-y-6">
                    <div className="p-6 bg-muted rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium text-lg">Wallet Connecté</p>
                            <p className="text-sm text-muted-foreground">Polygon Mumbai (Mock Mode Active)</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={disconnect} className="text-destructive hover:text-destructive">
                          Déconnecter
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm py-2 border-b border-border/50">
                          <span className="text-muted-foreground">Adresse</span>
                          <span className="font-mono bg-card px-2 py-1 rounded">{account}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2 border-b border-border/50">
                          <span className="text-muted-foreground">Solde</span>
                          <span className="font-bold">{balance ? parseFloat(balance).toFixed(4) : "0.0000"} MATIC</span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2">
                          <span className="text-muted-foreground">Chain ID</span>
                          <span>{chainId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-4">
                      <Shield className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <p className="text-sm font-medium">Sécurité Blockchain</p>
                        <p className="text-xs text-muted-foreground">
                          Votre clé privée n'est jamais stockée sur nos serveurs. Contractify utilise votre wallet local pour valider l'intégrité de vos documents.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-[#FFC107]/10 flex items-center justify-center mx-auto mb-6">
                      <Wallet className="w-10 h-10 text-[#FFC107]" />
                    </div>
                    <h3 className="mb-2">Aucun wallet connecté</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                      Pour utiliser les fonctionnalités blockchain, vous devez connecter un wallet comme MetaMask.
                    </p>
                    <Button
                      onClick={connect}
                      disabled={isConnecting}
                      className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-8 py-6 text-lg font-bold"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        "Connecter mon Wallet"
                      )}
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* AI Preferences Section */}
            {selectedSection === "ai" && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
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
                      <h4 className="mb-1">Vérification juridique</h4>
                      <p className="text-sm text-muted-foreground">
                        L'IA vérifie la conformité juridique des contrats
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label>Modèle IA</Label>
                    <select className="w-full p-2 rounded-lg border border-border bg-input-background">
                      <option>GPT-4o (Recommandé)</option>
                      <option>Claude 3.5 Sonnet</option>
                      <option>Llama 3 (Local)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                    Enregistrer les préférences
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
                        <Label>Nouveau mot de passe</Label>
                        <Input type="password" className="bg-input-background" placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirmer le mot de passe</Label>
                        <Input type="password" className="bg-input-background" placeholder="••••••••" />
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
                </div>
              </Card>
            )}

            {/* Notifications Section */}
            {selectedSection === "notifications" && (
              <Card className="p-6">
                <h2 className="mb-6">Notifications</h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1">Alertes de signature</h4>
                      <p className="text-sm text-muted-foreground">
                        Être prévenu quand une partie signe un contrat
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1">Newsletters et Mises à jour</h4>
                      <p className="text-sm text-muted-foreground">
                        Recevoir nos actualités et nouveaux modèles
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                    Enregistrer
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


