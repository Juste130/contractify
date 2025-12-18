"use client"

import React, { useState } from 'react';
import { 
  Shield,
  Home,
  FileText,
  PlusCircle,
  Award,
  DollarSign,
  Users,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart3,
  HelpCircle,
  Calendar,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string | number;
  subItems?: MenuItem[];
  isNew?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeItem = 'dashboard',
  onItemClick = () => {},
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: Home,
      href: '/dashboard'
    },
    {
      id: 'contracts',
      label: 'Contrats',
      icon: FileText,
      badge: 12,
      subItems: [
        { id: 'contracts-all', label: 'Tous les contrats', icon: FileText, href: '/contracts' },
        { id: 'contracts-drafts', label: 'Brouillons', icon: FileText, badge: 3, href: '/contracts?filter=drafts' },
        { id: 'contracts-pending', label: 'En attente', icon: FileText, badge: 2 , href: '/contracts?filter=pending' },
        { id: 'contracts-active', label: 'Actifs', icon: FileText, badge: 7, href: '/contracts?filter=active' },
      ]
    },
    {
      id: 'create',
      label: 'Créer',
      icon: PlusCircle,
      subItems: [
        { id: 'create-template', label: 'Avec template', icon: FileText, href: '/contracts/template' },
        { id: 'create-custom', label: 'Personnalisé', icon: Zap, isNew: true, href: '/contracts/create' },
        { id: 'create-import', label: 'Importer', icon: FileText, href: '/contracts/create?type=import' }
      ]
    },
    {
      id: 'nfts',
      label: 'Mes NFTs',
      icon: Award,
      badge: 9
    },
    {
      id: 'payments',
      label: 'Paiements',
      icon: DollarSign,
      subItems: [
        { id: 'payments-all', label: 'Historique', icon: DollarSign },
        { id: 'payments-pending', label: 'En attente', icon: DollarSign, badge: '2.5k €' },
        { id: 'payments-scheduled', label: 'Programmés', icon: Calendar }
      ]
    }
  ];

  const secondaryItems: MenuItem[] = [
    {
      id: 'analytics',
      label: 'Analytiques',
      icon: BarChart3
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Users,
      badge: 28
    },
    {
      id: 'calendar',
      label: 'Calendrier',
      icon: Calendar
    }
  ];

  const bottomItems: MenuItem[] = [
    {
      id: 'help',
      label: 'Aide & Support',
      icon: HelpCircle
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings
    }
  ];

  const toggleGroup = (groupId: string): void => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleItemClick = (itemId: string): void => {
    onItemClick(itemId);
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isActive = activeItem === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const Icon = item.icon;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasSubItems) {
              toggleGroup(item.id);
            } else {
              handleItemClick(item.id);
                if (item.href) {
                  window.location.href = item.href;
                }
            }
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
            level > 0 ? 'ml-6 text-sm' : ''
          } ${
            isActive
              ? 'bg-primary-100 text-primary-700 border border-primary-200 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Icon className={`flex-shrink-0 ${
              level > 0 ? 'w-4 h-4' : 'w-5 h-5'
            } ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
            
            {!isCollapsed && (
              <span className={`font-medium truncate ${
                level > 0 ? 'text-sm' : ''
              }`}>
                {item.label}
              </span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              {item.isNew && (
                <span className="bg-secondary-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  New
                </span>
              )}
              
              {item.badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  typeof item.badge === 'number' && item.badge > 0
                    ? 'bg-accent-100 text-accent-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.badge}
                </span>
              )}

              {hasSubItems && (
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`} />
              )}
            </div>
          )}
        </button>

        {/* Sub Items */}
        {hasSubItems && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.subItems!.map(subItem => renderMenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${
        isCollapsed ? 'px-4' : ''
      }`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ContracTify</span>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Outils
            </h3>
          )}
          <div className="space-y-1">
            {secondaryItems.map(item => renderMenuItem(item))}
          </div>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-gray-200 p-4">
        <div className="space-y-1">
          {bottomItems.map(item => renderMenuItem(item))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleItemClick('logout')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* Notifications Badge */}
      <div className="absolute top-4 right-4 lg:hidden">
        <button className="relative p-2 text-gray-400 hover:text-gray-600">
          <Bell className="w-5 h-5" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-white border-r border-gray-200 transition-all duration-300 flex flex-col
        ${isCollapsed ? 'w-20' : 'w-72'}
        ${isMobileOpen 
          ? 'fixed inset-y-0 left-0 z-50 w-72 lg:relative lg:translate-x-0' 
          : 'hidden lg:flex fixed lg:relative inset-y-0 left-0 z-50 -translate-x-full lg:translate-x-0'
        }
        ${className}
      `}>
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;