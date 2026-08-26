/**
 * Labels for the off-chain incident system (disputes/holds) — see backend/services/incident.js
 * for why this replaces openDispute()/Disputed on-chain entirely instead of trying to fix
 * its dead end (no exit once escrow crypto isn't deposited, which is now always the case).
 *
 * IncidentReason mirrors ContractManager.sol's DisputeReason enum by name (not by numeric
 * value — this system never calls openDispute, so there's no encoding to keep in sync),
 * plus MUTUAL_TIMEOUT for holds, which has no on-chain equivalent.
 */
export type IncidentType = "DISPUTE" | "HOLD";

export type IncidentReason =
  | "NON_PAYMENT"
  | "POOR_QUALITY_WORK"
  | "DELAYS_IN_PERFORMANCE"
  | "BREACH_OF_CONFIDENTIALITY"
  | "INTELLECTUAL_PROPERTY_DISPUTE"
  | "MUTUAL_TIMEOUT"
  | "OTHER";

export type IncidentStatus = "OPEN" | "ACCEPTED_ACTIVE" | "REJECTED" | "RESOLVED" | "WITHDRAWN";

export const DISPUTE_REASON_LABELS: Record<IncidentReason, string> = {
  NON_PAYMENT: "Non-paiement",
  POOR_QUALITY_WORK: "Qualité insuffisante du travail",
  DELAYS_IN_PERFORMANCE: "Retard d'exécution",
  BREACH_OF_CONFIDENTIALITY: "Violation de confidentialité",
  INTELLECTUAL_PROPERTY_DISPUTE: "Litige de propriété intellectuelle",
  MUTUAL_TIMEOUT: "Pause négociée",
  OTHER: "Autre",
};

/** Reasons offered when raising a DISPUTE (adversarial — MUTUAL_TIMEOUT doesn't belong here). */
export const DISPUTE_REASONS: IncidentReason[] = [
  "NON_PAYMENT",
  "POOR_QUALITY_WORK",
  "DELAYS_IN_PERFORMANCE",
  "BREACH_OF_CONFIDENTIALITY",
  "INTELLECTUAL_PROPERTY_DISPUTE",
  "OTHER",
];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: "Ouvert",
  ACCEPTED_ACTIVE: "Pause active",
  REJECTED: "Refusé",
  RESOLVED: "Résolu",
  WITHDRAWN: "Retiré",
};

/**
 * Labels for ContractManager.sol's on-chain TerminationReason enum — used when actually
 * terminating a contract (terminateContract), which unlike disputes has no dead end.
 * Order matches the Solidity enum exactly: index 0 (None) is never sent by the UI.
 */
export const TERMINATION_REASON_LABELS: string[] = [
  "Aucune",
  "Accord mutuel",
  "Rupture de contrat",
  "Exécution complète des termes",
  "Fraude ou fausse déclaration",
  "Impossibilité d'exécution",
  "Changement de législation",
  "Autre",
];
