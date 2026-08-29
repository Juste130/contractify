"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAuthStore } from "@/hooks/useAuth";
import { syncPrivySession } from "@/lib/utils/privySync";

// Only ever send people to a path inside our own app — a redirect/callbackUrl value
// come from a URL query string, so treating it as trustworthy without this check would
// let a crafted invitation-style link send a just-authenticated user to an external site.
function safeInternalPath(path: string | null): string | null {
    if (!path) return null;
    return path.startsWith("/") && !path.startsWith("//") ? path : null;
}

/**
 * Logique partagée entre /login et /signup : les deux pages ne sont que des
 * variantes de texte autour du même flux "connexion Privy -> sync backend".
 *
 * syncInProgress empêche des appels privyLogin() concurrents/en rafale pendant
 * la création du wallet embarqué Privy (le tableau `wallets` change plusieurs
 * fois juste après la connexion, ce qui peut redéclencher l'effet de sync en
 * boucle si on ne s'en protège pas).
 */
export function usePrivySync() {
    const { ready, authenticated, login, user, getAccessToken } = usePrivy();
    const { wallets } = useWallets();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { privyLogin, isAuthenticated } = useAuthStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const syncInProgress = useRef(false);

    // /signup links use "redirect" (see sendDraftInvitationEmail), /login uses
    // "callbackUrl" (see ProtectedRoute/AdminGuard) — both are honored here so an
    // invited signatory lands back on the contract they were invited to instead of
    // a generic dashboard, no matter which of the two page ever forwarded them.
    const destination = safeInternalPath(searchParams.get("redirect") || searchParams.get("callbackUrl")) || "/dashboard";

    // Si déjà authentifié PARTOUT, rediriger vers la destination demandée (ou dashboard)
    useEffect(() => {
        if (ready && authenticated && user && isAuthenticated) {
            router.replace(destination);
        }
    }, [ready, authenticated, user, isAuthenticated, router, destination]);

    // Auto-sync si déjà authentifié via Privy mais pas backend. Le verrou anti-concurrence
    // vit dans syncPrivySession() (partagé avec AuthInitializer, monté globalement et donc
    // actif en même temps que ce hook sur /login et /signup) — syncInProgress ici n'évite
    // que les ré-entrées de CETTE instance pendant l'attente, pas les deux mécanismes entre eux.
    useEffect(() => {
        const autoSync = async () => {
            if (ready && authenticated && user && !isAuthenticated && !syncInProgress.current) {
                syncInProgress.current = true;
                setIsSyncing(true);
                try {
                    const synced = await syncPrivySession({ user, wallets, getAccessToken, privyLogin });
                    if (synced) {
                        router.replace(destination);
                    } else {
                        setIsSyncing(false);
                    }
                } catch (error) {
                    console.error("Error syncing with backend:", error);
                    setIsSyncing(false);
                } finally {
                    syncInProgress.current = false;
                }
            }
        };

        autoSync();
        // `wallets` retiré des dépendances : ce tableau change plusieurs fois pendant
        // la création du wallet embarqué et redéclenchait cet effet en rafale.
        // `wallets` est lu depuis la closure au moment de l'exécution, ce qui suffit ici.
    }, [ready, authenticated, user, isAuthenticated, privyLogin, router, destination, getAccessToken]);

    const handleLogin = () => {
        if (ready && !authenticated) {
            login();
        }
    };

    return { ready, isSyncing, handleLogin };
}
