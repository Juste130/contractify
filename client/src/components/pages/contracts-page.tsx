import { useState } from "react";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { StatusBadge } from "../ui/status-badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  FileText,
  Download,
  Archive,
  Trash2,
} from "lucide-react";

interface ContractsPageProps {
  onNavigate: (page: string) => void;
}

export function ContractsPage({
  onNavigate,
}: ContractsPageProps) {
  const [filterStatus, setFilterStatus] =
    useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const contracts = [
    {
      id: 1,
      name: "CDI - Sophie Martin",
      parties: ["SM", "JD"],
      createdDate: "15/12/2024",
      dueDate: "20/12/2024",
      status: "pending" as const,
    },
    {
      id: 2,
      name: "Contrat Freelance - Pierre Dubois",
      parties: ["PD", "JD"],
      createdDate: "10/12/2024",
      dueDate: "18/12/2024",
      status: "signed" as const,
    },
    {
      id: 3,
      name: "NDA - TechCorp",
      parties: ["TC", "JD"],
      createdDate: "08/12/2024",
      dueDate: "12/12/2024",
      status: "expired" as const,
    },
    {
      id: 4,
      name: "Contrat Commercial - ABC Corp",
      parties: ["AC", "JD"],
      createdDate: "05/12/2024",
      dueDate: "25/12/2024",
      status: "pending" as const,
    },
    {
      id: 5,
      name: "Bail Commercial",
      parties: ["ML", "PD"],
      createdDate: "01/12/2024",
      dueDate: "15/12/2024",
      status: "signed" as const,
    },
    {
      id: 6,
      name: "Contrat de Prestation",
      parties: ["SL", "JD"],
      createdDate: "28/11/2024",
      dueDate: "10/12/2024",
      status: "archived" as const,
    },
  ];

  const filteredContracts = contracts.filter((contract) => {
    const matchesFilter =
      filterStatus === "all" ||
      contract.status === filterStatus;
    const matchesSearch = contract.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar
        currentPage="contracts"
        onNavigate={onNavigate}
      />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">Mes contrats</h1>
            <p className="text-muted-foreground">
              Gérez tous vos contrats en un seul endroit
            </p>
          </div>
          <Button
            className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
            onClick={() => onNavigate("create-contract")}
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau contrat
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={
                  filterStatus === "all" ? "default" : "outline"
                }
                onClick={() => setFilterStatus("all")}
                className={
                  filterStatus === "all"
                    ? "bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                    : ""
                }
              >
                Tous
              </Button>
              <Button
                variant={
                  filterStatus === "pending"
                    ? "default"
                    : "outline"
                }
                onClick={() => setFilterStatus("pending")}
                className={
                  filterStatus === "pending"
                    ? "bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                    : ""
                }
              >
                En attente
              </Button>
              <Button
                variant={
                  filterStatus === "signed"
                    ? "default"
                    : "outline"
                }
                onClick={() => setFilterStatus("signed")}
                className={
                  filterStatus === "signed"
                    ? "bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                    : ""
                }
              >
                Signés
              </Button>
              <Button
                variant={
                  filterStatus === "archived"
                    ? "default"
                    : "outline"
                }
                onClick={() => setFilterStatus("archived")}
                className={
                  filterStatus === "archived"
                    ? "bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                    : ""
                }
              >
                Archivés
              </Button>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un contrat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input-background"
              />
            </div>
          </div>
        </Card>

        {/* Contracts Table */}
        {filteredContracts.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du contrat</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead>Date d'échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      onNavigate("contract-details")
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FFC107]" />
                        {contract.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {contract.parties.map((party, idx) => (
                          <Avatar
                            key={idx}
                            className="w-8 h-8 border-2 border-card"
                          >
                            <AvatarFallback className="bg-[#4CAF50] text-white text-xs">
                              {party}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contract.createdDate}
                    </TableCell>
                    <TableCell>{contract.dueDate}</TableCell>
                    <TableCell>
                      <StatusBadge status={contract.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <FileText className="w-4 h-4 mr-2" />
                            Voir le contrat
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="w-4 h-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">Aucun contrat trouvé</h3>
              <p className="text-muted-foreground mb-6">
                Commencez par créer votre premier contrat avec
                l'aide de notre IA
              </p>
              <Button
                className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]"
                onClick={() => onNavigate("create-contract")}
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer un contrat
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}