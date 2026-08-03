"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthStore } from "@/hooks/useAuth";
import { Button } from "../ui/button";

export function AuthAwareCta() {
  const { ready, authenticated } = usePrivy();
  const { isAuthenticated } = useAuthStore();

  const isUserLoggedIn = ready && authenticated && isAuthenticated;

  if (isUserLoggedIn) {
    return (
      <Link href="/dashboard">
        <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] font-medium">
          Accéder à mon espace
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login">
        <Button variant="ghost">
          Se connecter
        </Button>
      </Link>
      <Link href="/signup">
        <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] font-medium">
          Commencer gratuitement
        </Button>
      </Link>
    </div>
  );
}
