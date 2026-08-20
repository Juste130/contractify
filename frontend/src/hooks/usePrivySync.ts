"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAuthStore } from "@/hooks/useAuth";

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
    const { privyLogin, isAuthenticated } = useAuthStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const syncInProgress = useRef(false);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Privy State:', { ready, authenticated, isAuthenticated });
        }
    }, [ready, authenticated, isAuthenticated]);

    // Si déjà authentifié PARTOUT, rediriger vers dashboard
    useEffect(() => {
        if (ready && authenticated && user && isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [ready, authenticated, user, isAuthenticated, router]);

    // Auto-sync si déjà authentifié via Privy mais pas backend
    useEffect(() => {
        const autoSync = async () => {
            if (ready && authenticated && user && !isAuthenticated && !syncInProgress.current) {
                syncInProgress.current = true;
                try {
                    setIsSyncing(true);

                    const token = await getAccessToken();
                    if (!token) { setIsSyncing(false); return; }

                    const email = user.email?.address || user.google?.email;
                    const smartWallet = wallets.find(w => w.walletClientType === 'smart_wallet');
                    const eoaWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
                    const walletAddress = smartWallet?.address || eoaWallet?.address || user.wallet?.address;

                    if (!email) { setIsSyncing(false); return; }

                    await privyLogin({ privyId: user.id, email, walletAddress, profileData: { name: user.google?.name || email.split('@')[0] } }, token);
                    router.replace("/dashboard");
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
    }, [ready, authenticated, user, isAuthenticated, privyLogin, router]);

    const handleLogin = () => {
        if (ready && !authenticated) {
            login();
        }
    };

    return { ready, isSyncing, handleLogin };
}
