"use client";

import { useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { Spinner } from '../ui/spinner';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/how-it-works'];
// Prefix-matched rather than exact: /verify/[id] is a dynamic route, and every id under it
// must be reachable without an account — that's the entire point of the QR code printed on
// a downloaded certificate (a third party scanning it has no ContracTify login).
const PUBLIC_PATH_PREFIXES = ['/verify/'];

function isPublicPath(pathname: string) {
    return PUBLIC_PATHS.includes(pathname) || PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

interface ProtectedRouteProps {
    children: ReactNode;
    requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { user, isAuthenticated, isLoading, checkAuth, sessionVerified } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const hasChecked = useRef(false);

    // Vérifie TOUJOURS la session une fois par chargement d'app sur une route
    // protégée — peu importe ce que dit l'état persisté (localStorage). Ce dernier
    // n'est qu'un indice d'affichage optimiste, jamais une preuve de session valide.
    // (Le retrait de "!isAuthenticated" de cette condition est LE correctif qui
    // empêche la boucle login <-> dashboard : sans lui, un flag "isAuthenticated:true"
    // périmé en localStorage empêchait toute revérification côté serveur.)
    //
    // `sessionVerified` (jamais persisté — voir useAuth.ts) distingue ce cas d'un autre :
    // arriver ici juste après un login Privy réussi sur /login, qui vient TOUT JUSTE de
    // vérifier la session en direct auprès du backend (privyLogin) une fraction de seconde
    // plus tôt. Comme /login est un chemin public, cet effet ne s'était encore jamais
    // déclenché — sans ce garde-fou, il rappelait checkAuth() une deuxième fois pour rien
    // (même utilisateur, même réponse), remettant isLoading à true et réaffichant un plein
    // écran de chargement juste après celui du login. Sur un chargement d'app à froid,
    // sessionVerified redémarre toujours à false, donc la revérification a bien lieu comme
    // avant.
    useEffect(() => {
        if (!hasChecked.current && !isPublicPath(pathname)) {
            hasChecked.current = true;
            if (!sessionVerified) checkAuth();
        }
    }, [checkAuth, pathname, sessionVerified]);

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