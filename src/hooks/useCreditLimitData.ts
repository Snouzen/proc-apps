"use client";

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import Swal from "sweetalert2";
import { getDueDateZone, needsRemarks } from "@/lib/credit-limit";
import { isInvoiceEmpty } from "@/lib/utils/invoice";

export function useCreditLimitData({
  search,
  activeFilter,
  selectedNamaPt,
  selectedInisial,
  selectedTujuan,
  selectedStatus,
  tglFrom,
  tglTo,
}: {
  search: string;
  activeFilter: "all" | "pending" | "outdate";
  selectedNamaPt: string;
  selectedInisial: string;
  selectedTujuan: string;
  selectedStatus?: string;
  tglFrom: string;
  tglTo: string;
}) {
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSiteArea, setUserSiteArea] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [stats, setStats] = useState({ total: 0, normal: 0, remarksNeeded: 0 });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([]);
  const [columnFilters, setColumnFilters] = useState<Array<{ id: string; value: unknown }>>([]);
  const [pageState, setPageState] = useState({ key: "", page: 1, size: 10 });
  const params = new URLSearchParams({ tab: activeFilter, sort: sorting[0] ? (sorting[0].id === "zone" ? "statusCreditLimit" : sorting[0].id) + (sorting[0].desc ? "_desc" : "_asc") : "tglPo_desc" });
  for (const [key, value] of Object.entries({ q: debouncedSearch.trim(), company: selectedNamaPt, inisial: selectedInisial, tujuan: selectedTujuan, status: selectedStatus, tglFrom, tglTo })) {
    if (value) params.set(key, value);
  }
  if (columnFilters.length) params.set("colFilters", JSON.stringify(Object.fromEntries(columnFilters.map(filter => [filter.id, filter.value]))));
  const filterKey = params.toString();
  const currentPage = pageState.key === filterKey ? pageState.page : 1;
  const itemsPerPage = pageState.size;
  const setCurrentPage = (page: number) => setPageState(prev => ({ ...prev, key: filterKey, page }));
  const setItemsPerPage = (size: number) => setPageState({ key: filterKey, page: 1, size });
  params.set("page", String(currentPage));
  params.set("pageSize", String(itemsPerPage));
  const queryString = params.toString();
  const queryRef = useRef(queryString);
  useLayoutEffect(() => { queryRef.current = queryString; }, [queryString]);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const vendorRevision = useRef(0);
  const savedVendors = useRef(new Map<string, { value: string; revision: number }>());
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Detect user role & siteArea
  useEffect(() => {
    import("@/lib/me").then(({ getMe }) => {
      getMe().then((me) => {
        setUserRole(me?.role || null);
        setUserSiteArea(me?.siteArea || null);
      }).catch(() => { setUserRole(null); setUserSiteArea(null); });
    }).catch(() => { setUserRole(null); setUserSiteArea(null); });
  }, []);

  const fetchData = useCallback(async () => {
    const requestId = ++latestRequest.current;
    const requestedQuery = queryRef.current;
    const revision = vendorRevision.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(
        "/api/po/credit-limit/data?" + requestedQuery,
        { cache: "no-store", signal: controller.signal },
      );
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || `Gagal memuat Credit Limit (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (requestId !== latestRequest.current || requestedQuery !== queryRef.current) return;
      if (!Array.isArray(data.data) || !Number.isFinite(data.total) || !data.stats) throw new Error("Respons Data Credit Limit tidak valid.");
      const list = data.data;

      // Filter: Hanya yang sudah dijadwalkan (tglkirim ada) dan belum memiliki nomor invoice (menggunakan helper kanonisasi bersama)
      const eligible = list.filter(
        (po: any) => !!po.tglkirim && isInvoiceEmpty(po.noInvoice),
      );

      setPoData(eligible.map((po: any) => {
        const saved = savedVendors.current.get(po.id);
        return saved && saved.revision > revision ? { ...po, kodeVendor: saved.value } : po;
      }));
      for (const [id, saved] of savedVendors.current) if (saved.revision <= revision) savedVendors.current.delete(id);
      setTotalRows(data.total);
      setStats(data.stats);
      setLoadedQuery(requestedQuery);
      const requestParams = new URLSearchParams(requestedQuery);
      const lastPage = Math.max(1, Math.ceil(data.total / Number(requestParams.get("pageSize"))));
      if (Number(requestParams.get("page")) > lastPage) setPageState(prev => ({ ...prev, page: lastPage }));
    } catch (err) {
      if (controller.signal.aborted || requestId !== latestRequest.current || requestedQuery !== queryRef.current) return;
      console.error("Failed to fetch PO data:", err);
      setFetchError(err instanceof Error ? err.message : "Gagal memuat Data Credit Limit.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    return () => controllerRef.current?.abort();
  }, [fetchData, queryString]);

  const handleUpdateKodeVendor = useCallback((id: string, val: string) => {
    savedVendors.current.set(id, { value: val, revision: ++vendorRevision.current });
    setPoData((prev) =>
      prev.map((po) => (po.id === id ? { ...po, kodeVendor: val } : po)),
    );
  }, []);

  const handleAjukanCreditLimit = async (po: any) => {
    if (!po.kodeVendor || !po.kodeVendor.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Kode Vendor Kosong",
        text: "Silakan isi Kode Vendor terlebih dahulu sebelum mengajukan Credit Limit.",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    const zone = getDueDateZone(po.expiredTgl);
    const remarksRequired = needsRemarks(zone);

    const remarksLabel =
      zone === "early_extended"
        ? "Alasan terlambat mengajukan Credit Limit"
        : "Alasan baru mengajukan Credit Limit";

    const remarksHint =
      zone === "early_extended"
        ? "Pengajuan lebih awal dari jadwal normal (8–14 hari sebelum due date)."
        : "Pengajuan melewati batas normal (8–14 hari setelah due date).";

    const result = await Swal.fire({
      title: "Ajukan Credit Limit?",
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-slate-500">PO <b class="text-slate-700">#${po.noPo}</b> akan diajukan untuk proses Credit Limit.</p>
          
          ${
            remarksRequired
              ? `
            <div class="flex items-start gap-2 mt-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500 shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span class="text-xs text-amber-700 font-medium">${remarksHint}</span>
            </div>`
              : ''
          }
          <div class="space-y-1.5 mt-3">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan / Remarks <span class="text-rose-500">*</span></label>
            <textarea id="cl-remarks" class="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none h-24" placeholder="Ketik alasan / catatan pengajuan di sini..."></textarea>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Ajukan!",
      cancelButtonText: "Batal",
      reverseButtons: true,
      background: "#ffffff",
      customClass: {
        popup: "rounded-[32px] border border-slate-100 shadow-2xl p-8",
        title:
          "text-slate-900 font-black uppercase tracking-tight text-xl mb-4",
        confirmButton:
          "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 shadow-lg shadow-indigo-200 transition-all active:scale-95",
        cancelButton:
          "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 transition-all active:scale-95",
      },
      preConfirm: () => {
        const remarks = (
          document.getElementById("cl-remarks") as HTMLTextAreaElement
        )?.value;
        if (!remarks || !remarks.trim()) {
          Swal.showValidationMessage("Mohon isi catatan / remarks pengajuan");
          return false;
        }
        return { remarks: remarks.trim() };
      },
    });

    if (!result.isConfirmed) return;

    const { remarks } = result.value as { remarks: string | null };

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId: po.id, action: "request", remarks }),
      });

      if (!res.ok) {
        throw new Error("Gagal mengajukan credit limit");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil Diajukan!",
        text: "PO telah dikirim ke halaman Approval Credit Limit.",
        timer: 2000,
        showConfirmButton: false,
        background: "#ffffff",
        customClass: {
          popup: "rounded-[32px] border border-slate-100 shadow-2xl",
        },
      });

      // Hapus PO yang barusan diajukan dari list state
      setPoData((prev) => prev.filter((item) => item.id !== po.id));
      void fetchData();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Terjadi kesalahan sistem",
      });
    }
  };

  // Server applies all predicates before take/skip; never filter/slice just this page.
  const filteredPo = loadedQuery === queryString ? poData : [];
  const paginatedPOs = filteredPo;
  const totalPages = Math.max(1, Math.ceil(totalRows / itemsPerPage));

  return {
    loading, fetchError, fetchData, totalRows,
    sorting, setSorting, columnFilters, setColumnFilters,
    userRole,
    userSiteArea,
    currentPage,
    setCurrentPage,
    itemsPerPage, setItemsPerPage,
    totalPages,
    paginatedPOs,
    filteredPo,
    stats,
    handleUpdateKodeVendor,
    handleAjukanCreditLimit,
  };
}
