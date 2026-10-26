/** Shared by lookup, save, read and client selection: zero shipment value is valid. */
type InvoiceItem = {
  rpTagih?: unknown;
  pcs?: unknown;
  pcsKirim?: unknown;
  hargaPcs?: unknown;
  discount?: unknown;
};

function nonNegativeAmount(value: unknown, field: string): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || (typeof value === "string" && !value.trim())) {
    const error = new Error(`Nilai ${field} invoice tidak tersedia.`);
    error.name = "ValidationError";
    throw error;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error(`Nilai ${field} invoice tidak valid.`);
    error.name = "ValidationError";
    throw error;
  }
  return amount;
}

export function getRekonItemAmount(item: InvoiceItem): number {
  if (item.rpTagih !== undefined && item.rpTagih !== null && item.rpTagih !== "") {
    return nonNegativeAmount(item.rpTagih, "Rp Tagih");
  }
  // Compatibility for sources without rpTagih: use actual shipment and proportional
  // discount, never the order's full nominal/quantity.
  const shipped = nonNegativeAmount(item.pcsKirim, "PCS kirim");
  if (shipped === 0) return 0;
  const price = nonNegativeAmount(item.hargaPcs, "harga PCS");
  const discount = nonNegativeAmount(item.discount ?? 0, "diskon");
  const ordered = discount > 0 ? nonNegativeAmount(item.pcs, "PCS PO") : 1;
  if (discount > 0 && ordered === 0) {
    const error = new Error("PCS PO invoice wajib lebih dari 0 untuk menghitung diskon proporsional.");
    error.name = "ValidationError";
    throw error;
  }
  return nonNegativeAmount(Math.max(0, shipped * price - (discount / ordered) * shipped), "tagihan aktual");
}

export function sumRekonInvoiceItems(items?: readonly InvoiceItem[] | null): number {
  return nonNegativeAmount((items ?? []).reduce((sum, item) => sum + getRekonItemAmount(item), 0), "total invoice");
}

export function getRekonLookupInvoiceTotal(po: { totalTagihan?: unknown; Items?: readonly InvoiceItem[] | null }): number {
  return po.totalTagihan !== undefined && po.totalTagihan !== null && po.totalTagihan !== ""
    ? nonNegativeAmount(po.totalTagihan, "total tagihan")
    : sumRekonInvoiceItems(po.Items);
}
