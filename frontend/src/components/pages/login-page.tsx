"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/hooks/useAuth";
import { Spinner } from "../ui/spinner";

export function LoginPage() {
  const { login, ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { privyLogin, isAuthenticated } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);

  // Debug Privy state
  useEffect(() => {
    console.log('🔐 Privy State:', { ready, authenticated, email: user?.email?.address, isAuthenticated });
  }, [ready, authenticated, user, isAuthenticated]);

  // Si déjà authentifié PARTOUT, rediriger vers dashboard
  useEffect(() => {
    if (ready && authenticated && user && isAuthenticated) {
      console.log('✅ User already authenticated everywhere, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [ready, authenticated, user, isAuthenticated, router]);

  // Auto-sync if already authenticated via Privy but not backend
  useEffect(() => {
    const autoSync = async () => {
      if (ready && authenticated && user && !isAuthenticated) {
        console.log('⚡ Auto-syncing with backend...');
        try {
          setIsSyncing(true);
          const email = user.email?.address || user.google?.email;
          const privyId = user.id;
          const walletAddress = user.wallet?.address;

          if (!email) {
            console.error("No email found from Privy user");
            return;
          }

          await privyLogin({
            privyId,
            email,
            walletAddress,
            profileData: {
              name: user.google?.name || email.split('@')[0],
            },
          });

          console.log('✅ Sync successful, redirecting to dashboard...');
          router.push("/dashboard");
        } catch (error) {
          console.error("Error auto-syncing with backend:", error);
          setIsSyncing(false);
        }
      }
    };

    autoSync();
  }, [ready, authenticated, user, isAuthenticated, privyLogin, router]);

  const handleLogin = () => {
    console.log('🔓 Manual login clicked', { ready, authenticated });
    if (ready && !authenticated) {
      login();
    }
  };

  // Si déjà authentifié via Privy mais pas backend, montrer loader
  if (ready && authenticated && user && !isAuthenticated && isSyncing) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <Link href="/" className="inline-block mb-8">
              <h1 className="text-[#FFC107] mb-2 text-2xl font-bold">ContracTify</h1>
            </Link>
            <Spinner size="lg" label="Synchronisation de votre compte..." />
          </div>
        </Card>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-[#FFC107] mb-2 text-2xl font-bold">ContracTify</h1>
          </Link>
          <h2 className="mb-2">Bon retour !</h2>
          <p className="text-muted-foreground">Connectez-vous à votre compte de manière sécurisée</p>
        </div>

        <div className="space-y-6">
          {!ready && (
            <div className="text-center text-sm text-amber-500 mb-4">
              ⏳ Chargement de Privy...
            </div>
          )}
          <Button
            type="button"
            disabled={!ready}
            onClick={handleLogin}
            className="w-full bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Se connecter / S'inscrire
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            L'authentification est gérée de manière sécurisée par Privy. Aucun mot de passe n'est requis.
          </p>
        </div>
      </Card>
    </div>
  );
}

