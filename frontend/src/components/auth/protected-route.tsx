"use client";

import { useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { Spinner } from '../ui/spinner';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/how-it-works', '/reset-password'];

function isPublicPath(pathname: string) {
    return PUBLIC_PATHS.includes(pathname);
}

interface ProtectedRouteProps {
    children: ReactNode;
    requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const hasChecked = useRef(false);

    // Only verify auth once per session — avoid network call on every navigation
    useEffect(() => {
        if (!isAuthenticated && !hasChecked.current && !isPublicPath(pathname)) {
            hasChecked.current = true;
            checkAuth();
        }
    }, [isAuthenticated, checkAuth, pathname]);

    // Redirect logic
    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isPublicPath(pathname)) {
            router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        }
        if (isAuthenticated && requireAdmin && user?.role !== 'ADMIN') {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, isLoading, user, requireAdmin, router, pathname]);

    // Only block render (show spinner) on protected routes while loading
    if (isLoading && !isPublicPath(pathname)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Spinner size="xl" label="Chargement de votre session..." />
            </div>
        );
    }

    // Don't flash protected content before redirect
    if (!isAuthenticated && !isPublicPath(pathname)) {
        return null;
    }

    return <>{children}</>;
}
