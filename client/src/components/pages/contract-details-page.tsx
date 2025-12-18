import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { StatusBadge } from "../ui/status-badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  FileText, 
  Bell, 
  Edit, 
  Share2, 
  Archive,
  Download,
  CheckCircle2,
  Clock,
  MessageSquare
} from "lucide-react";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";

interface ContractDetailsPageProps {
  onNavigate: (page: string) => void;
}

export function ContractDetailsPage({ onNavigate }: ContractDetailsPageProps) {
  const signatories = [
    {
      name: "Jean Dupont",
      email: "jean@exemple.com",
      avatar: "JD",
      status: "signed",
      date: "15/12/2024 14:30"
    },
    {
      name: "Sophie Martin",
      email: "sophie@exemple.com",
      avatar: "SM",
      status: "pending",
      date: null
    }
  ];

  const activities = [
    {
      id: 1,
      type: "signed",
      user: "Jean Dupont",
      action: "a signé le contrat",
      time: "Il y a 2 heures"
    },
    {
      id: 2,
      type: "sent",
      user: "Système",
      action: "Contrat envoyé à Sophie Martin",
      time: "Il y a 3 heures"
    },
    {
      id: 3,
      type: "created",
      user: "Jean Dupont",
      action: "a créé le contrat",
      time: "Il y a 4 heures"
    }
  ];

  const discussions = [
    {
      id: 1,
      user: "Jean Dupont",
      avatar: "JD",
      message: "Pouvez-vous vérifier la clause 3 ?",
      time: "Il y a 1 heure"
    },
    {
      id: 2,
      user: "Sophie Martin",
      avatar: "SM",
      message: "Oui, je regarde ça aujourd'hui.",
      time: "Il y a 30 minutes"
    }
  ];

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar currentPage="contracts" onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="mb-2">CDI - Sophie Martin</h1>
            <p className="text-muted-foreground">
              Créé le 15 décembre 2024
            </p>
          </div>
          <StatusBadge status="pending" />
        </div>

        {/* Action Bar */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline">
              <Bell className="w-4 h-4 mr-2" />
              Rappeler
            </Button>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            <Button variant="outline">
              <Archive className="w-4 h-4 mr-2" />
              Archiver
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="document" className="space-y-6">
          <TabsList>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="signatories">Signataires</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          {/* Document Tab */}
          <TabsContent value="document">
            <Card className="p-8">
              <div className="bg-muted p-8 rounded-lg space-y-4 max-w-4xl">
                <div className="text-center mb-6">
                  <h2>CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE</h2>
                </div>
                
                <div className="space-y-3 text-sm">
                  <p>Entre les soussignés :</p>
                  <p>La société TechCorp SAS, au capital de 100 000 €, immatriculée au RCS de Paris sous le numéro 123 456 789, dont le siège social est situé au 123 Avenue des Champs-Élysées, 75008 Paris, représentée par M. Jean Dupont, Directeur Général...</p>
                  <p>Ci-après dénommée "l'Employeur"</p>
                  <p>D'une part,</p>
                  <p>Et</p>
                  <p>Mme Sophie Martin, née le 15 mars 1990 à Lyon, de nationalité française, demeurant au 456 Rue de la République, 69002 Lyon...</p>
                  <p>Ci-après dénommée "le Salarié"</p>
                  <p>D'autre part,</p>
                  <p>Il a été convenu ce qui suit :</p>
                  
                  <Separator className="my-4" />
                  
                  <h4 className="pt-4">Article 1 - Engagement</h4>
                  <p>L'Employeur engage le Salarié qui accepte, aux clauses et conditions du présent contrat, en qualité de Développeur Full Stack.</p>
                  
                  <h4 className="pt-4">Article 2 - Fonctions</h4>
                  <p>Le Salarié exercera les fonctions de Développeur Full Stack. À ce titre, il sera notamment chargé de :</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Développer et maintenir les applications web de l'entreprise</li>
                    <li>Participer aux réunions techniques et à la conception des solutions</li>
                    <li>Assurer la qualité du code et le respect des bonnes pratiques</li>
                  </ul>
                  
                  <h4 className="pt-4">Article 3 - Durée du contrat</h4>
                  <p>Le présent contrat est conclu pour une durée indéterminée. Il prendra effet le 1er janvier 2025.</p>
                  
                  <h4 className="pt-4">Article 4 - Rémunération</h4>
                  <p>Le Salarié percevra une rémunération annuelle brute de 50 000 € (cinquante mille euros), payable mensuellement à terme échu, soit 4 166,67 € brut par mois.</p>
                  
                  <h4 className="pt-4">Article 5 - Période d'essai</h4>
                  <p>Le contrat débutera par une période d'essai de 3 mois, renouvelable une fois.</p>
                  
                  <h4 className="pt-4">Article 6 - Confidentialité</h4>
                  <p>Le Salarié s'engage à ne divulguer aucune information confidentielle concernant l'entreprise, pendant la durée du contrat et après sa cessation.</p>
                </div>
                
                <div className="mt-8 pt-8 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Fait à Paris, le 15 décembre 2024, en deux exemplaires originaux.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Signatories Tab */}
          <TabsContent value="signatories">
            <Card className="p-6">
              <h3 className="mb-6">Signataires du contrat</h3>
              <div className="space-y-4">
                {signatories.map((signatory, index) => (
                  <Card key={index} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-[#4CAF50] text-white">
                            {signatory.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p>{signatory.name}</p>
                          <p className="text-sm text-muted-foreground">{signatory.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {signatory.status === "signed" ? (
                          <>
                            <div className="flex items-center gap-2 text-[#4CAF50] mb-1">
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Signé</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{signatory.date}</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-[#FFC107] mb-1">
                              <Clock className="w-5 h-5" />
                              <span>En attente</span>
                            </div>
                            <Button size="sm" variant="outline" className="mt-2">
                              Relancer
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="p-6">
              <h3 className="mb-6">Activité du contrat</h3>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'signed' ? 'bg-[#4CAF50]/10' : 
                      activity.type === 'sent' ? 'bg-[#FFC107]/10' : 
                      'bg-[#9E9E9E]/10'
                    }`}>
                      {activity.type === 'signed' && <CheckCircle2 className="w-5 h-5 text-[#4CAF50]" />}
                      {activity.type === 'sent' && <Bell className="w-5 h-5 text-[#FFC107]" />}
                      {activity.type === 'created' && <FileText className="w-5 h-5 text-[#9E9E9E]" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span>{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Discussion Tab */}
          <TabsContent value="discussion">
            <Card className="p-6">
              <h3 className="mb-6">Discussion</h3>
              <div className="space-y-4 mb-6">
                {discussions.map((discussion) => (
                  <div key={discussion.id} className="flex items-start gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-[#4CAF50] text-white">
                        {discussion.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm">{discussion.user}</p>
                        <p className="text-xs text-muted-foreground">{discussion.time}</p>
                      </div>
                      <p className="text-sm">{discussion.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Input 
                  placeholder="Écrire un message..."
                  className="bg-input-background"
                />
                <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="p-6">
              <h3 className="mb-6">Historique des versions</h3>
              <div className="space-y-3">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Version 2.0</p>
                      <p className="text-sm text-muted-foreground">
                        Modification de la clause 3 - 16/12/2024 10:30
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Version 1.0</p>
                      <p className="text-sm text-muted-foreground">
                        Version initiale - 15/12/2024 14:00
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
