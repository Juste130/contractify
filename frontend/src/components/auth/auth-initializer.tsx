"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthStore } from "@/hooks/useAuth";

/**
 * Initialise l'authentification au démarrage de l'app
 * Synchronise la session Privy avec le backend si elle existe
 */
export function AuthInitializer() {
  const { ready, authenticated, user } = usePrivy();
  const { isAuthenticated, privyLogin } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (!ready) return;

      // Si Privy est authentifié mais le backend ne l'est pas
      if (authenticated && user && !isAuthenticated) {
        try {
          console.log("Auto-syncing Privy session with backend...");

          const email = user.email?.address || user.google?.email;
          const privyId = user.id;
          const walletAddress = user.wallet?.address;

          if (!email) {
            console.error("No email found from Privy user");
            return;
          }

          // Resync with backend silently (sans display de notification)
          await privyLogin({
            privyId,
            email,
            walletAddress,
            profileData: {
              name: user.google?.name || email.split('@')[0],
            },
          });

          console.log("Session synchronized successfully");
        } catch (error) {
          console.error("Failed to sync session:", error);
          // Erreur silencieuse - l'utilisateur devra se reconnecter manuellement
          // ou sera redirigé vers login par le protected-route
        }
      }
    };

    initAuth();
  }, [ready, authenticated, user, isAuthenticated, privyLogin]);

  return null;
}
