"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Vérifier l'auth au chargement si on n'est pas déjà authentifié
        if (!isAuthenticated) {
            checkAuth();
        }
    }, [isAuthenticated, checkAuth]);

    useEffect(() => {
        // Si fini de charger et pas authentifié, rediriger vers login
        if (!isLoading && !isAuthenticated && !['/login', '/signup', '/'].includes(pathname)) {
            router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        }

        // Si admin requis et utilisateur n'est pas admin
        if (isAuthenticated && requireAdmin && user?.role !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [isAuthenticated, isLoading, user, requireAdmin, router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Chargement de votre session...</p>
            </div>
        );
    }

    if (!isAuthenticated && !['/login', '/signup', '/'].includes(pathname)) {
        return null; // Évite les flashs de contenu protégé
    }

    return <>{children}</>;
}
