"use client";

import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAuthStore } from "@/hooks/useAuth";
import { syncPrivySession } from "@/lib/utils/privySync";

/**
 * AuthInitializer — Synchronise la session Privy avec le backend au démarrage, et à chaque
 * fois qu'on se retrouve authentifié côté Privy mais pas côté backend (ex. cookie de session
 * expiré alors que Privy est toujours connecté). Monté globalement (voir app/providers.tsx),
 * donc actif sur toutes les pages — y compris /login et /signup, où `usePrivySync` fait le
 * même travail en plus de la redirection : voir `syncPrivySession` pour le verrou partagé qui
 * empêche les deux de se déclencher en même temps sur ces pages.
 */
export function AuthInitializer() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { isAuthenticated, privyLogin } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (!ready) return;
      if (!authenticated || !user) return;
      if (isAuthenticated) return; // Déjà synchronisé

      try {
        await syncPrivySession({ user, wallets, getAccessToken, privyLogin });
      } catch (error) {
        console.error("[AuthInitializer] Failed to sync session:", error);
        // Erreur silencieuse — l'utilisateur sera redirigé vers /login par ProtectedRoute
      }
    };

    initAuth();
  }, [ready, authenticated, user, isAuthenticated, privyLogin, wallets, getAccessToken]);

  return null;
}
