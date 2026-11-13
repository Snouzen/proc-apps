/** Resolve export weight without changing persisted retur quantities or amounts. */
export function getReturExportKg(item: {
  qtyReturn?: unknown;
  produk?: string | null;
  Product?: { satuanKg?: unknown } | null;
}): number | null {
  const rawWeight = item.Product?.satuanKg;
  let weight = typeof rawWeight === "number" || typeof rawWeight === "string"
    ? Number(rawWeight) : NaN;

  if (!Number.isFinite(weight) || weight <= 0) {
    const name = item.produk || "";
    // Multipacks and multiple weight tokens require clarification rather than guessing.
    if (/\d\s*[x×*]\s*\d+(?:[.,]\d+)?\s*kg\b/i.test(name) || /-\s*\d+(?:[.,]\d+)?\s*kg\b/i.test(name)) return null;
    const matches = [...name.matchAll(/(?<![\w.,])(\d+(?:[.,]\d+)?)\s*kg\b/gi)];
    if (matches.length !== 1) return null;
    weight = Number(matches[0][1].replace(",", "."));
    if (!Number.isFinite(weight) || weight <= 0) return null;
  }

  const quantity = Number(item.qtyReturn ?? 0);
  const total = quantity * weight;
  return Number.isFinite(quantity) && quantity >= 0 && Number.isFinite(total) ? total : null;
}
