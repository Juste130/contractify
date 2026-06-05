"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/hooks/useAuth";

export function SignupPage() {
  const { login, ready, authenticated, user, getAccessToken } = usePrivy();
  const router = useRouter();
  const { privyLogin, isAuthenticated } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with backend after Privy authentication
  useEffect(() => {
    const syncWithBackend = async () => {
      if (ready && authenticated && user && !isAuthenticated) {
        try {
          setIsSyncing(true);

          const token = await getAccessToken();
          if (!token) {
            console.error("No Privy access token found");
            return;
          }

          // Get user info from Privy
          const email = user.email?.address || user.google?.email;
          const privyId = user.id;
          const walletAddress = user.wallet?.address;

          if (!email) {
            console.error("No email found from Privy user");
            return;
          }

          // Call backend to authenticate with Privy
          await privyLogin(
            {
              privyId,
              email,
              walletAddress,
              profileData: {
                name: user.google?.name || email.split('@')[0],
              },
            },
            token
          );

          // Redirect to dashboard
          router.push("/dashboard");
        } catch (error) {
          console.error("Error syncing with backend:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncWithBackend();
  }, [ready, authenticated, user, router, privyLogin, isAuthenticated]);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-[#FFC107] mb-2 text-2xl font-bold">ContracTify</h1>
          </Link>
          <h2 className="mb-2">Créer votre compte</h2>
          <p className="text-muted-foreground">Commencez gratuitement dès aujourd'hui</p>
        </div>

        <div className="space-y-6">
          <Button
            type="button"
            disabled={!ready || isSyncing}
            onClick={login}
            className="w-full bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] py-6 text-lg"
          >
            {isSyncing ? "Synchronisation..." : "S'inscrire / Se connecter"}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            L'inscription est gérée de manière sécurisée par Privy. Aucun mot de passe n'est requis.
          </p>
        </div>
      </Card>
    </div>
  );
}