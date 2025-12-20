"use client";

import {
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  UserCog,
  Shield
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "../ui/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  // Menu items pour utilisateurs normaux
  const userMenuItems = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
    { id: "contracts", label: "Mes contrats", icon: FileText, href: "/contracts" },
    { id: "templates", label: "Modèles", icon: LayoutTemplate, href: "/templates" },
    { id: "team", label: "Équipe", icon: Users, href: "/team" },
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
      <div className="p-6 border-b border-border flex items-center justify-between">
        {!isCollapsed ? (
          <Link href="/">
            <h2 className="text-[#FFC107]">Contractify</h2>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-[#FFC107] flex items-center justify-center">
              <span className="text-[#212121] font-bold text-lg">C</span>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* User Menu Items */}
        {userMenuItems.map(renderMenuItem)}

        {/* Admin Section */}
        {/* TODO: Afficher seulement si user.role === 'admin' */}
        <div className="pt-4 mt-4 border-t border-border">
          {!isCollapsed && (
            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Administration
            </p>
          )}
          {adminMenuItems.map(renderMenuItem)}
        </div>
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "w-full flex items-center gap-2",
            isCollapsed && "justify-center px-2"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Réduire</span>
            </>
          )}
        </Button>
      </div>

      {/* User */}
      <div className="p-4 border-t border-border">
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[#FFC107] text-[#212121]">JD</AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Jean Dupont</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-[#FFC107] text-[#212121]">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm">Jean Dupont</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
