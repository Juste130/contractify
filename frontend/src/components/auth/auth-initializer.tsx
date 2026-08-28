"use client";

import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAuthStore } from "@/hooks/useAuth";
import { prettifyEmailPrefix } from "@/lib/utils/displayName";

/**
 * AuthInitializer — Synchronise la session Privy avec le backend au démarrage.
 *
 * Dès que Privy est authentifié mais que le backend ne l'est pas,
 * on envoie le token Privy + l'adresse du wallet au backend pour créer/retrouver
 * l'utilisateur en base de données.
 *
 * Priorité des adresses :
 *   1. Embedded Wallet Privy classique (EOA) — gas couvert par le sponsoring natif Privy
 *   2. Adresse du user.wallet (EOA via Privy user object)
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

        // Déterminer l'adresse wallet à enregistrer en base.
        // Il n'y a pas de smart wallet à prioriser ici : useWallets() ne retourne que les
        // wallets embarqués/externes (EOA) — les smart wallets natifs Privy sont un concept
        // séparé (useSmartWallets()) que cette app n'utilise pas. Le gas est couvert via le
        // sponsoring natif Privy sur cette même adresse EOA, pas via un smart wallet.
        const eoaWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];

        const walletAddress = eoaWallet?.address || user.wallet?.address;

        if (walletAddress) {
          console.log(`[AuthInitializer] Using wallet address: ${walletAddress} (EOA Privy)`);
        }

        await privyLogin(
          {
            privyId: user.id,
            email,
            walletAddress,
            profileData: {
              // Prettified so it reads as a name ("Dev Banca") rather than a raw, lowercase,
              // dotted email local-part — the user can set a real one in Paramètres > Profil.
              name: user.google?.name || prettifyEmailPrefix(email),
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
