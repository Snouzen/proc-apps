export const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) return "Rp 0";
  const num = typeof val === "string" ? Number(val) : val;
  if (isNaN(num)) return "Rp 0";
  const hasDecimal = num % 1 !== 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: hasDecimal ? 2 : 0,
  }).format(num);
};

export const parseVal = (v: any): number => {
  if (!v) return 0;
  if (typeof v === "number" && !isNaN(v)) return v;
  let str = String(v).trim();
  // Indonesian format: dot is thousands separator, comma is decimal
  // e.g. "2.567,65" → 2567.65 or "2567,65" → 2567.65
  if (str.includes(",")) {
    str = str.replace(/\./g, "").replace(",", ".");
  }
  str = str.replace(/[^0-9.]/g, "");
  return Number(str) || 0;
};

export const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};
