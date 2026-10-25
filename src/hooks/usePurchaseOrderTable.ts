import { useState, useMemo, useRef, useCallback, useEffect } from "react";

interface Retailer { id: string; namaPt: string; inisial: string | null; tujuan: string | null }
export function usePurchaseOrderTable(_retailers: Retailer[]) {
  const [poData, setPoData] = useState<any[] | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [searchFilter, setSearchFilter] = useState("");
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any[]>([]);
  const [active, setActive] = useState({ company: "", inisial: "", tujuan: "", regional: "", siteArea: "", noPo: "" });
  const [enabled, setEnabled] = useState(false);
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const requestId = useRef(0);

  const handleFetchData = useCallback(async (company = "", inisial = "", tujuan = "", regional = "", siteArea = "") => {
    setActive({ company, inisial, tujuan, regional, siteArea, noPo: "" });
    setPagination(p => ({ ...p, pageIndex: 0 }));
    setEnabled(true); setRevision(r => r + 1);
  }, []);
  useEffect(() => { setPagination(p => ({ ...p, pageIndex: 0 })); }, [searchFilter, tglFrom, tglTo, statusFilter, sorting, columnFilters]);
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const current = ++requestId.current;
    setLoadingData(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ summary: "true", limit: String(pagination.pageSize), offset: String(pagination.pageIndex * pagination.pageSize),
          q: searchFilter, tglFrom, tglTo, boardStatus: statusFilter, sort: sortOrder === "newest" ? "tglPo_desc" : "tglPo_asc" });
        Object.entries(active).forEach(([key, value]) => { if (value) params.set(key, value); });
        if (columnFilters.length) params.set("colFilters", JSON.stringify(Object.fromEntries(columnFilters.map(f => [f.id, f.value]))));
        if (sorting[0]) params.set("sort", sorting[0].id + (sorting[0].desc ? "_desc" : "_asc"));
        const res = await fetch("/api/po?" + params, { cache: "no-store", signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat PO");
        if (current !== requestId.current || ctrl.signal.aborted) return;
        setPoData(json.data || []); setTotal(Number(json.total) || 0);
      } catch (e: any) {
        if (!ctrl.signal.aborted && current === requestId.current) { setError(e.message || "Gagal memuat PO"); setPoData([]); }
      } finally { if (!ctrl.signal.aborted && current === requestId.current) setLoadingData(false); }
    }, 250);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [enabled, active, pagination, searchFilter, tglFrom, tglTo, statusFilter, sortOrder, sorting, columnFilters, revision]);
  const handleDelete = async (noPo: string) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/po?noPo=" + encodeURIComponent(noPo), { method: "DELETE" });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error || "Gagal menghapus PO"); }
      setConfirmDelete(null); setRevision(r => r + 1);
    } catch (e: any) { setError(e.message); } finally { setDeleting(false); }
  };
  const setManualData = (data: any[] | null, company: string, inisial: string) => {
    setPoData(data); setTotal(data?.length || 0);
    setActive({ company: "", inisial: "", tujuan: "", regional: "", siteArea: "", noPo: data?.[0]?.noPo || "" });
    setEnabled(Boolean(data?.length)); setPagination(p => ({ ...p, pageIndex: 0 }));
  };
  const stats = useMemo(() => poData ? { totalPo: total, totalNominal: poData.reduce((s,p) => s + Number(p.totalNominal || 0),0), totalItems: poData.reduce((s,p) => s + Number(p.pcsTotal || 0),0) } : null, [poData,total]);
  return { poData, loadingData, error, retry: () => setRevision(r => r + 1), total, stats,
    filteredPo: poData || [], paginatedPo: poData || [], totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    currentPage: pagination.pageIndex + 1, perPage: String(pagination.pageSize),
    pagination, setPagination, sorting, setSorting, columnFilters, setColumnFilters,
    searchFilter, setSearchFilter, tglFrom, setTglFrom, tglTo, setTglTo, sortOrder, setSortOrder, statusFilter, setStatusFilter,
    handleFetchData, setManualData, setLoadingData, deleting, confirmDelete, setConfirmDelete, handleDelete,
    activeNamaPt: active.company, activeInisial: active.inisial, activeTujuan: active.tujuan, activeRegional: active.regional, activeSiteArea: active.siteArea };
}
