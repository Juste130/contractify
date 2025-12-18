import { useState } from "react";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Plus, MoreVertical, Mail, Trash2, Shield, Edit, Eye } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface TeamPageProps {
  onNavigate: (page: string) => void;
}

export function TeamPage({ onNavigate }: TeamPageProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const members = [
    {
      id: 1,
      name: "Jean Dupont",
      email: "jean@exemple.com",
      avatar: "JD",
      role: "Admin",
      joinedDate: "01/01/2024",
      status: "active"
    },
    {
      id: 2,
      name: "Sophie Martin",
      email: "sophie@exemple.com",
      avatar: "SM",
      role: "Éditeur",
      joinedDate: "15/02/2024",
      status: "active"
    },
    {
      id: 3,
      name: "Pierre Dubois",
      email: "pierre@exemple.com",
      avatar: "PD",
      role: "Visionneur",
      joinedDate: "01/03/2024",
      status: "active"
    },
    {
      id: 4,
      name: "Marie Laurent",
      email: "marie@exemple.com",
      avatar: "ML",
      role: "Éditeur",
      joinedDate: "Invitation envoyée",
      status: "pending"
    },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-[#9C27B0] text-white";
      case "Éditeur":
        return "bg-[#FFC107] text-[#212121]";
      case "Visionneur":
        return "bg-[#9E9E9E] text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Admin":
        return <Shield className="w-3 h-3 mr-1" />;
      case "Éditeur":
        return <Edit className="w-3 h-3 mr-1" />;
      case "Visionneur":
        return <Eye className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar currentPage="team" onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">Équipe</h1>
            <p className="text-muted-foreground">
              Gérez les membres de votre équipe et leurs accès
            </p>
          </div>
          
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                <Plus className="w-5 h-5 mr-2" />
                Inviter un membre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
                <DialogDescription>
                  Envoyez une invitation par email pour rejoindre votre équipe
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemple.com"
                    className="bg-input-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select defaultValue="editor">
                    <SelectTrigger className="bg-input-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Tous les droits</SelectItem>
                      <SelectItem value="editor">Éditeur - Créer et modifier</SelectItem>
                      <SelectItem value="viewer">Visionneur - Lecture seule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer l'invitation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total membres</p>
            <p className="text-3xl">{members.filter(m => m.status === 'active').length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Invitations en attente</p>
            <p className="text-3xl">{members.filter(m => m.status === 'pending').length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Administrateurs</p>
            <p className="text-3xl">{members.filter(m => m.role === 'Admin').length}</p>
          </Card>
        </div>

        {/* Members Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Depuis</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-[#4CAF50] text-white">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {getRoleIcon(member.role)}
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.joinedDate}</TableCell>
                  <TableCell>
                    {member.status === 'active' ? (
                      <Badge className="bg-[#4CAF50] text-white">Actif</Badge>
                    ) : (
                      <Badge className="bg-[#FFC107] text-[#212121]">En attente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier le rôle
                        </DropdownMenuItem>
                        {member.status === 'pending' && (
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" />
                            Renvoyer l'invitation
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Retirer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Permissions Info */}
        <Card className="p-6 mt-8">
          <h3 className="mb-4">Permissions des rôles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-[#9C27B0]" />
                <h4>Admin</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Tous les droits</li>
                <li>• Gérer l'équipe</li>
                <li>• Gérer l'abonnement</li>
                <li>• Supprimer des contrats</li>
              </ul>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Edit className="w-5 h-5 text-[#FFC107]" />
                <h4>Éditeur</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Créer des contrats</li>
                <li>• Modifier des contrats</li>
                <li>• Envoyer pour signature</li>
                <li>• Télécharger</li>
              </ul>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-[#9E9E9E]" />
                <h4>Visionneur</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Voir les contrats</li>
                <li>• Télécharger</li>
                <li>• Commenter</li>
                <li>• Recevoir notifications</li>
              </ul>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
