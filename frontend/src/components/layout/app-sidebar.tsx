"use client";

import {
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  Settings,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  UserCog,
  Shield,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAuthStore } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { NotificationBell } from "./notification-bell";
import { cn } from "../ui/utils";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  USER: "Utilisateur",
  VIEWER: "Observateur",
};

export function AppSidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { user } = useAuthStore();
  const { logout } = useLogout();
  const isAdmin = user?.role === "ADMIN";

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "U";
  const userLabel = user?.profileData?.name || user?.email || "Mon compte";
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : "";

  // Menu items pour utilisateurs normaux
  const userMenuItems = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
    { id: "contracts", label: "Mes contrats", icon: FileText, href: "/contracts" },
    { id: "templates", label: "Modèles", icon: LayoutTemplate, href: "/templates" },
    { id: "settings", label: "Paramètres", icon: Settings, href: "/settings" },
  ];

  // Menu items admin (TODO: afficher seulement si user.role === 'admin')
  const adminMenuItems = [
    { id: "admin-users", label: "Gestion utilisateurs", icon: UserCog, href: "/admin/users" },
    { id: "admin-contracts", label: "Tous les contrats", icon: FileText, href: "/admin/contracts" },
    { id: "admin-analytics", label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
    { id: "admin-system", label: "Système", icon: Shield, href: "/admin/system" },
  ];

  const renderMenuItem = (item: typeof userMenuItems[0]) => {
    const Icon = item.icon;
    const isActive = pathname.startsWith(item.href);

    const content = (
      <Link
        href={item.href}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
          isActive
            ? 'bg-[#FFC107] text-[#212121]'
            : 'text-foreground hover:bg-muted',
          isCollapsed && "justify-center px-2"
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {isActive && <ChevronRight className="w-4 h-4" />}
          </>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.id} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <div key={item.id}>{content}</div>;
  };

  return (
    <aside
      className={cn(
        "bg-card border-r border-border h-screen flex flex-col fixed left-0 top-0 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed ? (
          <Link href="/">
            <h2 className="text-[#FFC107]">ContracTify</h2>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-[#FFC107] flex items-center justify-center">
              <span className="text-[#212121] font-bold text-lg">C</span>
            </div>
          </Link>
        )}
      </div>

      {/* Separator between the brand and the menu, framed by "<" and ">" */}
      <div className="relative px-4 pb-4 flex items-center gap-2 text-border">
        <ChevronLeft className="w-3 h-3 shrink-0 opacity-50" />
        <div className="flex-1 h-px bg-border" />
        <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />

        {/* Edge toggle handle — sits right on the sidebar's border, level with this separator */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isCollapsed ? "Développer la barre latérale" : "Réduire la barre latérale"}
                className="rounded-full border border-border bg-card shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#FFC107] transition-colors"
                style={{ position: "absolute", top: "50%", right: "-12px", transform: "translateY(-50%)", zIndex: 20, width: "24px", height: "24px" }}
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isCollapsed ? "Développer" : "Réduire"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* User Menu Items */}
        {userMenuItems.map(renderMenuItem)}

        {/* Admin Section — only rendered for admins; this is a UX convenience only,
            the actual access control lives server-side (see AdminGuard + backend middleware). */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-border">
            {!isCollapsed && (
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                Administration
              </p>
            )}
            {adminMenuItems.map(renderMenuItem)}
          </div>
        )}
      </nav>

      {/* Notifications */}
      <div className="px-4 pt-2 border-t border-border">
        <NotificationBell collapsed={isCollapsed} />
      </div>

      {/* User */}
      <div className="p-4">
        <DropdownMenu>
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Menu du compte"
                      className="w-full flex items-center justify-center cursor-pointer"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-[#FFC107] text-[#212121]">{userInitial}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{userLabel}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Menu du compte"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted cursor-pointer transition-colors text-left"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-[#FFC107] text-[#212121]">{userInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{userLabel}</p>
                  <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent align="end" side="right" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email ?? "Mon compte"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="w-4 h-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { void logout(); }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
