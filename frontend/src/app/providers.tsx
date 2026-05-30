'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';
import { AuthInitializer } from '@/components/auth/auth-initializer';

const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
};

export default function Providers({ children }: { children: ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. PrivyProvider disabled.');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: polygonAmoy as any,
        supportedChains: [polygonAmoy as any],
      }}
    >
      <AuthInitializer />
      {children}
    </PrivyProvider>
  );
}
