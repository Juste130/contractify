"use client";

import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAuthStore } from "@/hooks/useAuth";

/**
 * AuthInitializer — Synchronise la session Privy avec le backend au démarrage.
 *
 * Dès que Privy est authentifié mais que le backend ne l'est pas,
 * on envoie le token Privy + l'adresse du wallet au backend pour créer/retrouver
 * l'utilisateur en base de données.
 *
 * Priorité des adresses :
 *   1. Smart Wallet Privy natif (walletClientType === 'smart_wallet')
 *   2. Embedded Wallet Privy classique (EOA)
 *   3. Adresse du user.wallet (EOA via Privy user object)
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
        console.log("[AuthInitializer] Syncing Privy session with backend...");

        const token = await getAccessToken();
        if (!token) {
          console.error("[AuthInitializer] No Privy access token found");
          return;
        }

        const email = user.email?.address || user.google?.email;
        if (!email) {
          console.error("[AuthInitializer] No email found from Privy user");
          return;
        }

        // Déterminer l'adresse wallet à enregistrer en base
        // Priorité : Smart Wallet Privy > EOA Privy > EOA du user object
        const smartWallet = wallets.find(w => w.walletClientType === 'smart_wallet');
        const eoaWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];

        const walletAddress = smartWallet?.address
          || eoaWallet?.address
          || user.wallet?.address;

        if (walletAddress) {
          console.log(
            `[AuthInitializer] Using wallet address: ${walletAddress}`,
            smartWallet ? '(Smart Wallet Privy)' : '(EOA Privy)'
          );
        }

        await privyLogin(
          {
            privyId: user.id,
            email,
            walletAddress,
            profileData: {
              name: user.google?.name || email.split('@')[0],
            },
          },
          token
        );

        console.log("[AuthInitializer] Session synchronized successfully");
      } catch (error) {
        console.error("[AuthInitializer] Failed to sync session:", error);
        // Erreur silencieuse — l'utilisateur sera redirigé vers /login par ProtectedRoute
      }
    };

    initAuth();
  }, [ready, authenticated, user, isAuthenticated, privyLogin, wallets]);

  return null;
}
