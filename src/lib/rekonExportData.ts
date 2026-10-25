/** Shared contract for PDF and Excel: never turn missing source records into valid amounts. */
export function prepareRekonExport(items: any[]) {
  return items.map(item => {
    const invoices = item.detailedInvoices ?? item.invoices ?? [];
    const rtvs = item.detailedRtvs ?? item.rtvs ?? [];
    const normalized = rtvs.map((rtv: any) => {
      if (rtv?.sourceRitelMismatch) {
        throw new Error(`Rekon ${item.noRekonsiliasi}: RTV ${rtv.noRtv} ditemukan, tetapi ritel/inisialnya berbeda dari rekonsiliasi. Periksa keterikatan data sebelum export.`);
      }
      if (!rtv || typeof rtv !== "object" || rtv.sourceMissing || rtv.sourceAmbiguous) {
        throw new Error(`Rekon ${item.noRekonsiliasi}: RTV ${rtv?.noRtv || rtv || "-"} tidak ditemukan atau ambigu. Periksa ID retur sebelum export.`);
      }
      if (!rtv.lokasiBarang || rtv.lokasiBarang === "-") {
        throw new Error(`Rekon ${item.noRekonsiliasi}: lokasi barang RTV ${rtv.noRtv} belum tersedia.`);
      }
      const rawNominal = rtv.nominal ?? rtv.total;
      const rawQty = rtv.qty ?? rtv.qtyReturn;
      if (rawNominal == null || rawQty == null || rawNominal === "" || rawQty === "") throw new Error(`Nilai RTV ${rtv.noRtv} belum tersedia`);
      const nominal = Number(rawNominal);
      const qty = Number(rawQty);
      if (!Number.isFinite(nominal) || !Number.isFinite(qty)) throw new Error(`Nilai RTV ${rtv.noRtv} tidak valid`);
      return { ...rtv, nominal, qty };
    });
    const total = normalized.reduce((sum: number, r: any) => sum + r.nominal, 0);
    const expectedTotal = Number(item.totalRtvs ?? 0);
    if (!Number.isFinite(expectedTotal) || Math.abs(total - expectedTotal) > 0.01) {
      throw new Error(`Rekon ${item.noRekonsiliasi}: total detail RTV berbeda dari total tersimpan. Periksa data sebelum closing.`);
    }
    const invoiceRows = invoices.map((i: any) => {
      if (!i || typeof i !== "object" || i.sourceMissing || i.sourceRitelMismatch || (i.nominal == null && i.total == null)) {
        throw new Error(`Rekon ${item.noRekonsiliasi}: invoice ${i?.noInvoice || i || "-"} tidak tersedia untuk ritel/inisial ini. Periksa keterikatan data sebelum export.`);
      }
      const nominal = Number(i.nominal ?? i.total);
      if (!Number.isFinite(nominal)) throw new Error(`Nominal invoice ${i.noInvoice} tidak valid`);
      return { ...i, nominal };
    });
    return { ...item, invoices: invoiceRows, rtvs: normalized, promos: item.detailedPromos ?? item.promos ?? [] };
  });
}
