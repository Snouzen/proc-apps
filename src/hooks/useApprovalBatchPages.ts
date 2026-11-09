"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getMe } from "@/lib/me";
import type { ApprovalBatchSummary } from "@/lib/creditApprovalBatch";

export function useApprovalBatchPages(filters: { search: string; selectedNamaPt: string; selectedInisial: string; selectedTujuan: string; tglFrom: string; tglTo: string }) {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<ApprovalBatchSummary[]>([]);
  const [poData, setPoData] = useState<any[]>([]);
  const [totalBatches, setTotalBatches] = useState(0);
  const [matchingPoCount, setMatchingPoCount] = useState(0);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(filters.search);
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ q: search.trim(), company: filters.selectedNamaPt, inisial: filters.selectedInisial, tujuan: filters.selectedTujuan, tglFrom: filters.tglFrom, tglTo: filters.tglTo })) if (value) params.set(key, value);
  const filterKey = params.toString();
  const currentPage = pagination.key === filterKey ? pagination.page : 1;
  params.set("page", String(currentPage));
  const query = params.toString();
  const queryRef = useRef(query);
  const summariesRef = useRef(summaries);
  const expandedRef = useRef(expandedBatches);
  useLayoutEffect(() => { queryRef.current = query; summariesRef.current = summaries; expandedRef.current = expandedBatches; }, [query, summaries, expandedBatches]);
  const cache = useRef(new Map<string, { rows: any[]; at: number }>());
  const poBatches = useRef(new Map<string, string>());
  const detailFlights = useRef(new Map<string, { controller: AbortController; promise: Promise<any[]> }>());
  const versions = useRef(new Map<string, number>());
  const listController = useRef<AbortController | null>(null);
  const listVersion = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; listController.current?.abort(); detailFlights.current.forEach(flight => flight.controller.abort()); };
  }, []);
  useEffect(() => { const timer = setTimeout(() => setSearch(filters.search), 300); return () => clearTimeout(timer); }, [filters.search]);
  useEffect(() => { let active = true; getMe().then(me => { if (active) { setRole(me.role || ""); if (me.role !== "pusat") setLoading(false); } }).catch(() => { if (active) { setLoading(false); setFetchError("Sesi belum dapat diverifikasi. Silakan muat ulang halaman."); } }); return () => { active = false; }; }, []);

  const fetchData = useCallback(async () => {
    const requestedQuery = queryRef.current, version = ++listVersion.current;
    listController.current?.abort();
    const controller = new AbortController(); listController.current = controller;
    setLoading(true); setFetchError(null);
    try {
      const response = await fetch("/api/po/credit-limit/approval?" + requestedQuery, { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memuat daftar batch.");
      if (!alive.current || version !== listVersion.current || requestedQuery !== queryRef.current) return;
      if (!Array.isArray(result.data) || result.data.length > 10 || !Number.isFinite(result.total)) throw new Error("Respons daftar batch tidak valid.");
      result.data.forEach((batch: ApprovalBatchSummary) => {
        const saved = cache.current.get(batch.batchCode);
        if (saved && (saved.rows.length !== batch.poCount || saved.rows.filter(po => po.statusCreditLimit === "REQUESTED").length !== batch.requestedCount || saved.rows.filter(po => po.statusCreditLimit === "APPROVED").length !== batch.approvedCount || saved.rows.filter(po => po.isNotaDinas).length !== batch.ndCount)) cache.current.delete(batch.batchCode);
      });
      setSummaries(result.data); setTotalBatches(result.total); setMatchingPoCount(result.matchingPoCount);
      const last = Math.max(1, Math.ceil(result.total / 10));
      if (Number(new URLSearchParams(requestedQuery).get("page")) > last) setPagination(prev => ({ ...prev, page: last }));
    } catch (error) {
      if (controller.signal.aborted || !alive.current || version !== listVersion.current || requestedQuery !== queryRef.current) return;
      setFetchError(error instanceof Error ? error.message : "Gagal memuat daftar batch."); setSummaries([]);
    } finally { if (alive.current && version === listVersion.current) setLoading(false); }
  }, []);
  useEffect(() => { if (role === "pusat") void fetchData(); return () => listController.current?.abort(); }, [role, query, fetchData]);

  const loadBatch = useCallback((code: string, force = false): Promise<any[]> => {
    const cached = cache.current.get(code);
    if (!force && cached && Date.now() - cached.at < 30000) return Promise.resolve(cached.rows);
    const existing = detailFlights.current.get(code);
    if (existing && !force) return existing.promise;
    existing?.controller.abort();
    const batch = summariesRef.current.find(item => item.batchCode === code);
    if (!batch) return Promise.reject(new Error("Batch tidak tersedia di halaman aktif. Muat ulang daftar."));
    const controller = new AbortController(), version = (versions.current.get(code) || 0) + 1;
    versions.current.set(code, version);
    setDetailLoading(prev => ({ ...prev, [code]: true })); setDetailErrors(prev => ({ ...prev, [code]: "" }));
    const promise = (async () => {
      try {
        const response = await fetch("/api/po/credit-limit/approval?" + new URLSearchParams({ batchId: batch.id }), { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat detail batch.");
        if (controller.signal.aborted || !alive.current || versions.current.get(code) !== version) throw new Error("Pemuatan detail digantikan permintaan terbaru.");
        if (result.batchId !== batch.id || result.batchCode !== code || !Array.isArray(result.data) || result.total !== result.data.length || result.total > 50 || result.data.some((po: any) => po.creditLimitBatchId !== batch.id)) throw new Error("Detail batch belum lengkap. Muat ulang sebelum melakukan proses.");
        cache.current.delete(code); cache.current.set(code, { rows: result.data, at: Date.now() });
        result.data.forEach((po: any) => poBatches.current.set(po.id, code));
        const evicted = new Set<string>();
        for (const key of cache.current.keys()) { if (cache.current.size <= 20) break; if (!summariesRef.current.some(item => item.batchCode === key)) { cache.current.delete(key); evicted.add(key); } }
        for (const [id, owner] of poBatches.current) if (evicted.has(owner)) poBatches.current.delete(id);
        setPoData(prev => [...prev.filter(po => po.CreditLimitBatch?.batchCode !== code && !evicted.has(po.CreditLimitBatch?.batchCode)), ...result.data]);
        return result.data;
      } catch (error) {
        if (!controller.signal.aborted && alive.current && versions.current.get(code) === version) setDetailErrors(prev => ({ ...prev, [code]: error instanceof Error ? error.message : "Gagal memuat detail batch." }));
        throw error;
      } finally {
        if (versions.current.get(code) === version) { detailFlights.current.delete(code); if (alive.current) setDetailLoading(prev => ({ ...prev, [code]: false })); }
      }
    })();
    detailFlights.current.set(code, { controller, promise });
    return promise;
  }, []);

  const refreshBatches = useCallback((codes: string[]) => {
    const targets = [...new Set(codes)];
    targets.forEach(code => { cache.current.delete(code); detailFlights.current.get(code)?.controller.abort(); versions.current.set(code, (versions.current.get(code) || 0) + 1); detailFlights.current.delete(code); });
    setDetailLoading(prev => ({ ...prev, ...Object.fromEntries(targets.map(code => [code, false])) }));
    void fetchData();
    targets.forEach(code => { if (expandedRef.current.has(code) && summariesRef.current.some(batch => batch.batchCode === code)) void loadBatch(code, true).catch(() => {}); });
  }, [fetchData, loadBatch]);
  const refreshForPoIds = useCallback((ids: string[]) => {
    const codes = ids.map(id => poBatches.current.get(id)).filter((code): code is string => !!code);
    refreshBatches(codes);
  }, [refreshBatches]);
  // Returning to an already-open batch on another page must refresh expired detail too.
  useEffect(() => { summaries.forEach(batch => { if (expandedBatches.has(batch.batchCode)) void loadBatch(batch.batchCode).catch(() => {}); }); }, [summaries, expandedBatches, loadBatch]);
  const toggleBatch = (code: string) => { setExpandedBatches(prev => { const next = new Set(prev); if (next.has(code)) next.delete(code); else next.add(code); return next; }); };
  const groups = summaries.map(batch => ({ ...batch, pos: poData.filter(po => po.creditLimitBatchId === batch.id) }));
  return { poData, setPoData, loading, role, fetchError, fetchData, matchingPoCount, totalBatches,
    currentPage, setCurrentPage: (value: number | ((prev: number) => number)) => setPagination(prev => ({ key: filterKey, page: typeof value === "function" ? value(prev.key === filterKey ? prev.page : 1) : value })), totalPages: Math.max(1, Math.ceil(totalBatches / 10)),
    batchGroups: groups, paginatedBatches: groups, expandedBatches, toggleBatch, loadBatch, detailLoading, detailErrors, refreshBatches, refreshForPoIds };
}
