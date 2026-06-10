// ── Credit Limit Shared Helpers & Types ─────────────────────────────────────

export type Retailer = {
  id: string;
  namaPt: string;
  inisial: string | null;
  tujuan: string | null;
};

export type DueDateZone = "normal" | "early_extended" | "late_extended" | "out_of_range";

export function cleanSiteArea(val?: string | null): string {
  if (!val) return "-";
  const lower = val.trim().toLowerCase();
  if (
    lower === "unknown" ||
    lower === "" ||
    lower.includes("unit produksi") ||
    lower.includes("belum ada")
  )
    return "-";
  return val.trim();
}

export function getDueDateZone(expiredTgl: string | null | undefined): DueDateZone {
  if (!expiredTgl) return "out_of_range";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(expiredTgl);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - dueDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -30 || diffDays > 14) return "out_of_range";
  if (diffDays >= -30 && diffDays <= -8) return "early_extended";
  if (diffDays >= 8 && diffDays <= 14) return "late_extended";
  return "normal";
}

export function getZoneLabel(zone: DueDateZone): string {
  switch (zone) {
    case "normal": return "Completed";
    case "early_extended": return "Pending";
    case "late_extended": return "Overdue";
    default: return "-";
  }
}

export function needsRemarks(zone: DueDateZone): boolean {
  return zone === "early_extended" || zone === "late_extended";
}
