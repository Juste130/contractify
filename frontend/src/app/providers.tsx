'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode, useState } from 'react';
import { AuthInitializer } from '@/components/auth/auth-initializer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3Provider } from "@/contexts/web3-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { SidebarWidthHandler } from "@/components/layout/sidebar-width-handler";
import { ProtectedRoute } from "@/components/auth/protected-route";

// Use a private RPC (e.g. Alchemy/Infura) if configured, otherwise fall back to public RPC
const POLYGON_AMOY_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: [POLYGON_AMOY_RPC] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
};

export default function Providers({ children }: { children: ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  if (!privyAppId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. PrivyProvider disabled.');
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: '/favicon.ico',
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
        // Smart Wallets natifs Privy (ERC-4337)
        // Privy gère le bundler et le paymaster directement.
        // Aucune dépendance externe (Biconomy, ZeroDev, etc.) n'est requise.
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: polygonAmoy as any,
        supportedChains: [polygonAmoy as any],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Web3Provider>
          <SidebarProvider>
            <SidebarWidthHandler>
              <ProtectedRoute>
                <AuthInitializer />
                {children}
              </ProtectedRoute>
            </SidebarWidthHandler>
          </SidebarProvider>
        </Web3Provider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
