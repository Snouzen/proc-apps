/** Fetch every authorized result, independent of the table's current page. */
export async function loadRekonExportRows(
  filters: { search: string; startDate: string; endDate: string; status: string },
  fetcher: typeof fetch = fetch,
  onProgress: (loaded: number, total: number) => void = () => {},
  signal?: AbortSignal,
) {
  const rows: any[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | undefined;
  const limit = 50; // The API enforces this maximum.
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.search) params.set("q", filters.search);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.status !== "all") params.set("status", filters.status);
    const res = await fetcher(`/api/rekon?${params}`, { cache: "no-store", signal });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Gagal mengambil halaman ${page}. Export dibatalkan.`);
    if (!Array.isArray(json.data) || !Number.isSafeInteger(json.total) || json.total < 0) throw new Error("Respons export rekonsiliasi tidak valid.");
    if (expectedTotal !== undefined && json.total !== expectedTotal) throw new Error("Data rekonsiliasi berubah saat export. Silakan ulangi.");
    expectedTotal = json.total;
    for (const row of json.data) {
      if (!row.id || ids.has(row.id)) throw new Error("Urutan data rekonsiliasi berubah saat export. Silakan ulangi.");
      ids.add(row.id); rows.push(row);
    }
    onProgress(rows.length, expectedTotal!);
    if (rows.length === expectedTotal) return rows;
    if (rows.length > expectedTotal! || json.data.length < limit) throw new Error("Data export tidak lengkap. Silakan ulangi.");
  }
}
