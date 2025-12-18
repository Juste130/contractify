import { LayoutDashboard, FileText, LayoutTemplate, Users, Settings, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "contracts", label: "Mes contrats", icon: FileText },
    { id: "templates", label: "Modèles", icon: LayoutTemplate },
    { id: "team", label: "Équipe", icon: Users },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border h-screen flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h2 className="text-[#FFC107]">Contractify</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#FFC107] text-[#212121]'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#FFC107] text-[#212121]">JD</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm">Jean Dupont</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
