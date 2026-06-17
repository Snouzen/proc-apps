import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getMe } from "@/lib/me";

type Row = {
  id: string;
  noPo: string;
  company: string;
  inisial?: string;
  regional: string | null;
  tglPo: string | null;
  expiredTgl: string | null;
  noInvoice: string | null;
  statusTagih: boolean;
  buktiTagih: string | null;
  
  tglkirim?: string | null;
  linkPo?: string | null;
  statusKirim?: boolean;
  statusSdif?: boolean;
  statusPo?: boolean;
  statusFp?: boolean;
  statusKwi?: boolean;
  statusInv?: boolean;
  statusBayar?: boolean;
  remarks?: string | null;
  namaSupir?: string | null;
  platNomor?: string | null;
  tujuanDetail?: string | null;
  buktiBayar?: string | null;

  RitelModern?: any;
  UnitProduksi?: any;
};

export function useChecklistDocs() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalPo: 0, pendingTagih: 0, completedTagih: 0, pendingBayar: 0, completedBayar: 0 });
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("pending");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const lastCtrlRef = useRef<AbortController | null>(null);

  const [showColumns, setShowColumns] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    index: true,
    company: true,
    noPo: true,
    noInvoice: true,
    tglPo: true,
    expiredTgl: true,
    regional: true,
    statusTagih: true,
    buktiTagih: true,
    actions: true,
    tglkirim: false,
    statusKirim: false,
    statusSdif: false,
    statusPo: false,
    statusFp: false,
    statusKwi: false,
    statusInv: false,
    statusBayar: false,
    buktiBayar: false,
    remarks: false,
    namaSupir: false,
    platNomor: false,
    tujuanDetail: false,
    linkPo: false,
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);

  const [isEditAll, setIsEditAll] = useState(false);
  const [editingRows, setEditingRows] = useState<Record<string, { statusTagih: boolean; buktiTagih: string; statusBayar: boolean; buktiBayar: string; saving?: boolean; error?: string }>>({});

  useEffect(() => {
    (async () => {
      const me = await getMe();
      setRole(me?.role || null);
    })();
  }, []);

  useEffect(() => {
    setVisibleCols(prev => {
      const next = { ...prev };
      if (activeFilter === "pending_bayar" || activeFilter === "completed_bayar") {
        next.statusTagih = false;
        next.buktiTagih = false;
        next.statusBayar = true;
        next.buktiBayar = true;
      } else if (activeFilter === "pending" || activeFilter === "completed") {
        next.statusTagih = true;
        next.buktiTagih = true;
        next.statusBayar = false;
        next.buktiBayar = false;
      } else if (activeFilter === "total") {
        next.statusTagih = true;
        next.buktiTagih = true;
        next.statusBayar = true;
        next.buktiBayar = true;
      }
      return next;
    });
  }, [activeFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      const newSearch = String(search || "").trim();
      if (newSearch !== debouncedSearch) {
        setDebouncedSearch(newSearch);
        if (page !== 1) {
          setIsTransitioning(true);
          setPage(1);
        }
      }
    }, 500);
    return () => clearTimeout(t);
  }, [search, debouncedSearch, page]);

  const fetchData = useCallback(async () => {
    if (!role) return;
    
    setLoading(true);
    setIsTransitioning(true);
    
    if (lastCtrlRef.current) {
      try {
        lastCtrlRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    lastCtrlRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 10000);
    
    try {
      const params = new URLSearchParams();
      params.set("limit", String(rowsPerPage));
      params.set("offset", String(Math.max(0, (page - 1) * rowsPerPage)));
      params.set("filter", activeFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      
      const res = await fetch(`/api/po/checklist?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || res.statusText || "Gagal mengambil data PO");
      }
      
      const list = Array.isArray(json?.data) ? json.data : [];
      setRows(list);
      setTotal(Number(json?.total) || list.length);
      if (json?.summary) {
        setSummary({
          totalPo: Number(json.summary.totalPo) || 0,
          pendingTagih: Number(json.summary.pendingTagih) || 0,
          completedTagih: Number(json.summary.completedTagih) || 0,
          pendingBayar: Number(json.summary.pendingBayar) || 0,
          completedBayar: Number(json.summary.completedBayar) || 0,
        });
      }
      setError(null);
      
      if (!isEditAll) {
        setEditingRows({});
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal mengambil data PO");
    } finally {
      clearTimeout(timer);
      setLoading(false);
      setIsTransitioning(false);
    }
  }, [debouncedSearch, page, role, rowsPerPage, isEditAll, activeFilter]);

  useEffect(() => {
    if (!role) return;
    fetchData();
  }, [fetchData, role, debouncedSearch, page, rowsPerPage, activeFilter]);

  const formatDate = (d: any) => {
    const date = d ? new Date(d) : null;
    if (!date || isNaN(date.getTime())) return "-";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleDateString("id-ID", { month: "short" });
    const year = date.getFullYear().toString();
    return `${day} ${month} ${year}`;
  };

  const openModal = async (po: Row) => {
    const nopo = String(po?.noPo || "").trim();
    let fullPo: any = po;
    if (nopo) {
      try {
        const params = new URLSearchParams();
        params.set("noPo", nopo);
        params.set("includeItems", "true");
        params.set("limit", "1");
        const res = await fetch(`/api/po?${params.toString()}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const first = Array.isArray(json?.data) ? json.data[0] : Array.isArray(json) ? json[0] : null;
        if (first) fullPo = first;
      } catch {}
    }

    setDetailData({
      id: fullPo?.id || "",
      noPo: fullPo?.noPo || "-",
      company: fullPo?.RitelModern?.namaPt || fullPo?.company || "Unknown",
      tglPo: fullPo?.tglPo || null,
      expiredTgl: fullPo?.expiredTgl || null,
      noInvoice: fullPo?.noInvoice || null,
      regional: fullPo?.regional || fullPo?.UnitProduksi?.namaRegional || null,
      siteArea: fullPo?.UnitProduksi?.siteArea || "-",
      Items: Array.isArray(fullPo?.Items) ? fullPo.Items : [],
      status: {
        tagih: !!fullPo?.statusTagih,
        bayar: !!fullPo?.statusBayar,
      },
      buktiTagih: fullPo?.buktiTagih || null,
      buktiBayar: fullPo?.buktiBayar || null,
      remarks: fullPo?.remarks || null,
    });
    setOpenDetail(true);
  };

  const handleEditToggle = (row: Row) => {
    setEditingRows(prev => {
      if (prev[row.id]) {
        const next = { ...prev };
        delete next[row.id];
        return next;
      }
      return {
        ...prev,
        [row.id]: {
          statusTagih: !!row.statusTagih,
          buktiTagih: row.buktiTagih || "",
          statusBayar: !!row.statusBayar,
          buktiBayar: row.buktiBayar || "",
        }
      };
    });
  };

  const handleToggleEditAll = () => {
    if (isEditAll) {
      setIsEditAll(false);
      setEditingRows({});
    } else {
      setIsEditAll(true);
      const allDrafts: Record<string, any> = {};
      rows.forEach(r => {
        allDrafts[r.id] = {
          statusTagih: !!r.statusTagih,
          buktiTagih: r.buktiTagih || "",
          statusBayar: !!r.statusBayar,
          buktiBayar: r.buktiBayar || "",
        };
      });
      setEditingRows(allDrafts);
    }
  };

  const handleFieldChange = (id: string, field: "statusTagih" | "buktiTagih" | "statusBayar" | "buktiBayar", value: any) => {
    setEditingRows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSave = async (idToSave?: string) => {
    const ids = idToSave ? [idToSave] : Object.keys(editingRows).filter(id => !editingRows[id]?.saving);
    
    if (ids.length === 0) return;

    setEditingRows(prev => {
      const next = { ...prev };
      ids.forEach(id => {
        if (next[id]) next[id].saving = true;
      });
      return next;
    });

    try {
      const updates = ids.map(id => ({
        id,
        statusTagih: editingRows[id].statusTagih,
        buktiTagih: editingRows[id].buktiTagih,
        statusBayar: editingRows[id].statusBayar,
        buktiBayar: editingRows[id].buktiBayar,
      }));

      const res = await fetch("/api/po/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan data");

      await fetchData();

    } catch (e: any) {
      setEditingRows(prev => {
        const next = { ...prev };
        ids.forEach(id => {
          if (next[id]) {
            next[id].saving = false;
            next[id].error = e.message || "Gagal simpan";
          }
        });
        return next;
      });
    }
  };

  const filteredRows = useMemo(() => rows, [rows]);

  return {
    loading,
    role,
    rows,
    filteredRows,
    error,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    total,
    summary,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    showColumns,
    setShowColumns,
    visibleCols,
    setVisibleCols,
    isTransitioning,
    setIsTransitioning,
    openDetail,
    setOpenDetail,
    detailData,
    setDetailData,
    isEditAll,
    editingRows,
    formatDate,
    openModal,
    handleEditToggle,
    handleToggleEditAll,
    handleFieldChange,
    handleSave,
  };
}
