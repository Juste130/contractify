/**
 * ContractManager.sol has no "Expired" status — past expiresAt, signContract/cancelContract/
 * terminateContract/openDispute simply start reverting, but the on-chain (and cached)
 * status stays exactly where it was, forever. A PENDING_SIGNATURES or DISPUTED contract
 * whose signature/resolution window has irreversibly closed would otherwise keep showing
 * as "en attente" indefinitely — this computes a display-only "expired" override, without
 * writing anything to the database or the chain.
 */
const STUCK_STATUSES = ["PENDING_SIGNATURES", "DISPUTED"];

export function isEffectivelyExpired(contract: { status?: string; metadata?: { expiresAt?: number } }): boolean {
  const expiresAt = contract.metadata?.expiresAt;
  if (!expiresAt || !contract.status) return false;
  if (!STUCK_STATUSES.includes(contract.status)) return false;
  return Date.now() / 1000 > expiresAt;
}

/** Status string to actually render — "EXPIRED" is not a real backend status, display-only. */
export function getEffectiveStatus(contract: { status?: string; metadata?: { expiresAt?: number } }): string {
  return isEffectivelyExpired(contract) ? "EXPIRED" : (contract.status || "");
}

/**
 * Single mapping from a raw ContractStatus (or the display-only "EXPIRED") to the small set
 * of StatusBadge variants — shared by every page that lists contracts (contracts-page,
 * dashboard-page) so they can't silently drift into showing the same contract two different
 * ways depending on which screen you're looking at.
 */
export type StatusBadgeVariant = "draft" | "pending" | "signed" | "completed" | "cancelled" | "disputed" | "terminated" | "resigned" | "expired";

export function getStatusBadgeVariant(status: string): StatusBadgeVariant {
  switch (status.toUpperCase()) {
    case 'DRAFT_WAITING_SIGNERS': return 'draft';
    case 'READY_TO_DEPLOY': return 'draft';
    case 'PENDING_SIGNATURES': return 'pending';
    case 'ACTIVE': return 'signed';
    case 'COMPLETED': return 'completed';
    case 'CANCELLED': return 'cancelled';
    case 'DISPUTED': return 'disputed';
    case 'TERMINATED': return 'terminated';
    case 'RESIGNED': return 'resigned';
    case 'EXPIRED': return 'expired';
    default: return 'pending';
  }
}
