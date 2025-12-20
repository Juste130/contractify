import { Badge } from "./badge";

interface StatusBadgeProps {
  status: "pending" | "signed" | "archived" | "expired" | "draft";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    pending: "bg-[#FFC107] text-[#212121]",
    signed: "bg-[#4CAF50] text-white",
    archived: "bg-[#9E9E9E] text-white",
    expired: "bg-[#d4183d] text-white",
    draft: "bg-[#E3F2FD] text-[#212121]",
  };

  const labels = {
    pending: "En attente",
    signed: "Signé",
    archived: "Archivé",
    expired: "Expiré",
    draft: "Brouillon",
  };

  return (
    <Badge className={`${variants[status]} hover:opacity-90 ${className || ''}`}>
      {labels[status]}
    </Badge>
  );
}
