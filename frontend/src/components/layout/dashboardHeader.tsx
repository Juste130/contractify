"use client";
import React, { useState } from 'react';
import { Bell, User, Search } from 'lucide-react';

export interface Notification {
    id: number;
    title: string;
    type: "success" | "warning" | "info";
    message: string;
    time: string;
    unread: boolean;
}
export default function DashboardHeader() {
    const [searchTerm, setSearchTerm] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [walletConnected] = useState(true);

    const notifications: Notification[] = [
        {
          id: 1,
          type: "success",
          title: "Contrat signé",
          message: "CDI-2024-001 a été signé par toutes les parties",
          time: "5 min",
          unread: true
        },
        {
          id: 2,
          type: "warning", 
          title: "Signature en attente",
          message: "FREELANCE-2024-002 attend la signature de Bob Johnson",
          time: "2h",
          unread: true
        },
        {
          id: 3,
          type: "info",
          title: "NFT généré",
          message: "Le NFT de preuve pour LOCATION-2024-003 est disponible",
          time: "1j",
          unread: false
        }
      ];
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">

            {/* Actions */}
            <div className="flex items-center justify-between w-full">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un contrat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              <div className="flex items-center space-x-4">

                {/* Notifications */}
                <div className="relative">
                    <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Notifications"
                    >
                    <Bell className="w-6 h-6" />
                    {notifications.some(n => n.unread) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                    )}
                    </button>

                    {/* Dropdown Notifications */}
                    {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notification) => (
                            <div key={notification.id} className={`p-4 hover:bg-gray-50 ${notification.unread ? 'bg-blue-50' : ''}`}>
                            <div className="flex items-start space-x-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.type === 'success' ? 'bg-secondary-500' :
                                notification.type === 'warning' ? 'bg-accent-500' : 'bg-primary-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                <p className="text-sm text-gray-600">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    )}
                </div>

                {/* Wallet Status */}
                {walletConnected ? (
                    <div className="flex items-center space-x-2 bg-secondary-50 text-secondary-700 px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
                    <span className="text-sm font-medium">0x1234...5678</span>
                    </div>
                ) : (
                    <button className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors">
                    Connecter Wallet
                    </button>
                )}

                {/* Profile Menu */}
                <div className="relative">
                    <button 
                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    aria-label="Profil utilisateur"
                    >
                    <User className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
  );
}