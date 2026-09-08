import { Spinner } from "@/components/ui/spinner";

/**
 * Next.js route-segment fallback, shown automatically while `/dashboard`'s RSC payload and
 * JS chunk are being fetched during the client-side transition from /login right after a
 * Privy sign-in. Without this file, Next.js has no Suspense boundary for this segment and
 * simply leaves the previous page's UI on screen, frozen, until the new one is fully ready —
 * on a slow chunk load that reads as a stall rather than progress. Same `Spinner` component
 * and full-screen centered layout as `ProtectedRoute`'s own session-check fallback, so the
 * two read as one continuous loading sequence instead of two different-looking screens.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner size="xl" label="Chargement de votre tableau de bord..." />
    </div>
  );
}
