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
