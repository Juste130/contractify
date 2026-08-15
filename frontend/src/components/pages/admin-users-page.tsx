"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, UserPlus, MoreVertical, Shield, Edit, Eye } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await apiClient.get('/api/users');
                const mappedUsers = response.data.users.map((u: any) => ({
                    id: u.id,
                    name: u.profileData?.name || 'Inconnu',
                    email: u.email,
                    avatar: (u.profileData?.name || u.email).substring(0, 2).toUpperCase(),
                    role: u.role === 'ADMIN' ? 'Admin' : u.role === 'USER' ? 'Éditeur' : 'Visionneur',
                    status: u.isActive ? 'active' : 'suspended',
                    contracts: u._count?.contracts || 0,
                    joinedDate: new Date(u.createdAt).toLocaleDateString('fr-FR'),
                }));
                setUsers(mappedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

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
            <AppSidebar />

            <main className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)', padding: '2rem' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="mb-2">Gestion des utilisateurs</h1>
                        <p className="text-muted-foreground">
                            Gérez tous les utilisateurs de la plateforme
                        </p>
                    </div>
                    <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]">
                        <UserPlus className="w-5 h-5 mr-2" />
                        Inviter un utilisateur
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Total utilisateurs</p>
                        <p className="text-3xl">{loading ? '…' : users.length}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Utilisateurs actifs</p>
                        <p className="text-3xl">{loading ? '…' : users.filter(u => u.status === 'active').length}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Administrateurs</p>
                        <p className="text-3xl">{loading ? '…' : users.filter(u => u.role === 'Admin').length}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Suspendus</p>
                        <p className="text-3xl">{loading ? '…' : users.filter(u => u.status === 'suspended').length}</p>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par nom ou email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-background"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full md:w-[200px] bg-background">
                                <SelectValue placeholder="Filtrer par rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les rôles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Éditeur</SelectItem>
                                <SelectItem value="viewer">Visionneur</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                {/* Users Table */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Contrats</TableHead>
                                <TableHead>Inscrit le</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarFallback className="bg-[#4CAF50] text-white">
                                                    {user.avatar}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{user.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge className={getRoleBadgeColor(user.role)}>
                                            {getRoleIcon(user.role)}
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.contracts}</TableCell>
                                    <TableCell>{user.joinedDate}</TableCell>
                                    <TableCell>
                                        {user.status === 'active' ? (
                                            <Badge className="bg-[#4CAF50] text-white">Actif</Badge>
                                        ) : (
                                            <Badge className="bg-destructive text-white">Suspendu</Badge>
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
                                                <DropdownMenuItem>Voir le profil</DropdownMenuItem>
                                                <DropdownMenuItem>Modifier le rôle</DropdownMenuItem>
                                                <DropdownMenuItem>Voir les contrats</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">
                                                    {user.status === 'active' ? 'Suspendre' : 'Activer'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </main>
        </div>
    );
}
