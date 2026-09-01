/**
 * Shared SHA-256 helpers — used both when a contract is created (create-contract-page.tsx,
 * to fingerprint the text or the uploaded file before it's pinned to IPFS) and when it's
 * signed (kyc-signature-modal.tsx, to verify the displayed content still matches that
 * fingerprint). Kept in one place so the two call sites can't silently drift apart.
 */

async function digestToHex(data: BufferSource): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  return digestToHex(encoder.encode(text));
}

export async function computeFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return digestToHex(buffer);
}

/**
 * Re-fetches a file already pinned on IPFS and hashes its actual bytes — used at signature
 * time to verify what the gateway serves right now still matches the fingerprint computed
 * at import. Returns null on any failure (network, CORS, gateway hiccup) instead of
 * throwing: a failed fetch is not proof of tampering, so it must never be treated the same
 * as an actual mismatch by the caller.
 */
export async function computeRemoteFileSHA256(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return await digestToHex(buffer);
  } catch {
    return null;
  }
}
