export const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) return "Rp 0";
  const num = typeof val === "string" ? Number(val) : val;
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export const parseVal = (v: any): number => {
  if (!v) return 0;
  const str = String(v).replace(/[^0-9.]/g, "");
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
