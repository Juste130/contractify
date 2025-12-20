"use client";

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3Provider } from "@/contexts/web3-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { SidebarWidthHandler } from "@/components/layout/sidebar-width-handler";
import { ProtectedRoute } from "@/components/auth/protected-route";

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <Web3Provider>
                <SidebarProvider>
                    <SidebarWidthHandler>
                        <ProtectedRoute>
                            {children}
                        </ProtectedRoute>
                    </SidebarWidthHandler>
                </SidebarProvider>
            </Web3Provider>
        </QueryClientProvider>
    );
}
