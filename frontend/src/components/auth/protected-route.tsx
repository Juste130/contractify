"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { Spinner } from '../ui/spinner';

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
        if (!isLoading && !isAuthenticated && !['/login', '/signup', '/', '/how-it-works', '/reset-password'].includes(pathname)) {
            router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        }

        // Si admin requis et utilisateur n'est pas admin
        if (isAuthenticated && requireAdmin && user?.role !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [isAuthenticated, isLoading, user, requireAdmin, router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Spinner size="xl" label="Chargement de votre session..." />
            </div>
        );
    }

    if (!isAuthenticated && !['/login', '/signup', '/', '/how-it-works', '/reset-password'].includes(pathname)) {
        return null; // Évite les flashs de contenu protégé
    }

    return <>{children}</>;
}
