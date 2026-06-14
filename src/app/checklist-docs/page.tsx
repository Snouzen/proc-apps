"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMe } from "@/lib/me";
import { Search, Pencil, Save, X, Eye, Settings2, Check } from "lucide-react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { PoDateBadge } from "@/components/PoDateBadge";
import PODetailModal from "@/components/po-detail-modal";
import CustomSelect from "@/components/select"; // We need to check if this exists or just use standard select
import { GlobalPagination } from "@/components/global-pagination";

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

export default function ChecklistDocsPage() {
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

  // Customize columns
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
    // Default hidden columns:
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

  // Edit states
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

  const columns = useMemo<ColumnDef<Row>[]>(() => [
    { header: "No", id: "index", cell: ({ row }) => <span className="text-black dark:text-slate-100 font-bold">{(page - 1) * rowsPerPage + row.index + 1}</span> },
    { header: "Company", id: "company", accessorKey: "company", cell: ({ row }) => <div className="text-slate-800 dark:text-slate-200 font-medium max-w-[150px] truncate" title={row.original.company || row.original?.RitelModern?.namaPt || "-"}>{row.original.company || row.original?.RitelModern?.namaPt || "-"}</div> },
    { header: "No PO", id: "noPo", accessorKey: "noPo", cell: ({ row }) => <div className="font-semibold text-black dark:text-slate-100 max-w-[150px] truncate" title={row.original.noPo || "-"}>{row.original.noPo || "-"}</div> },
    { header: "No Invoice", id: "noInvoice", accessorKey: "noInvoice", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-200 font-medium">{row.original.noInvoice || "-"}</span> },
    { header: "Tgl PO", id: "tglPo", accessorKey: "tglPo", cell: ({ row }) => <PoDateBadge dateNode={<span className="text-slate-800 dark:text-slate-300 text-[12px]">{formatDate(row.original.tglPo)}</span>} type="TAGIH" buktiData={row.original.buktiTagih} /> },
    { header: "Expired", id: "expiredTgl", accessorKey: "expiredTgl", cell: ({ row }) => <PoDateBadge dateNode={<span className="text-slate-800 dark:text-slate-300 text-[12px]">{formatDate(row.original.expiredTgl)}</span>} type="PAID" buktiData={row.original.buktiBayar} /> },
    { header: "Regional", id: "regional", accessorKey: "regional", cell: ({ row }) => { const reg = row.original.regional || row.original?.UnitProduksi?.namaRegional || "-"; return <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">{reg}</span>; } },
    { header: "Status Tagih", id: "statusTagih", accessorKey: "statusTagih", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <label className="flex items-center justify-center cursor-pointer p-2"><input type="checkbox" checked={editingRows[id]?.statusTagih ?? false} onChange={(e) => handleFieldChange(id, "statusTagih", e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></label>; } return <div className="flex justify-center">{row.original.statusTagih ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">✓</span> : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>}</div>; } },
    { header: "Bukti Tagih", id: "buktiTagih", accessorKey: "buktiTagih", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <input type="text" placeholder="Ref Tagih..." value={editingRows[id]?.buktiTagih ?? ""} onChange={(e) => handleFieldChange(id, "buktiTagih", e.target.value)} className="w-full min-w-[150px] px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100" />; } return <div className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[150px]" title={row.original.buktiTagih || "-"}>{row.original.buktiTagih || "-"}</div>; } },
    { header: "Tgl Kirim", id: "tglkirim", accessorKey: "tglkirim", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{formatDate(row.original.tglkirim)}</span> },
    { header: "Kirim", id: "statusKirim", accessorKey: "statusKirim", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{row.original.statusKirim ? "✓" : "-"}</span> },
    { header: "SDIF", id: "statusSdif", accessorKey: "statusSdif", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{row.original.statusSdif ? "✓" : "-"}</span> },
    { header: "PO", id: "statusPo", accessorKey: "statusPo", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{row.original.statusPo ? "✓" : "-"}</span> },
    { header: "FP", id: "statusFp", accessorKey: "statusFp", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{row.original.statusFp ? "✓" : "-"}</span> },
    { header: "Kwi", id: "statusKwi", accessorKey: "statusKwi", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{row.original.statusKwi ? "✓" : "-"}</span> },
    { header: "Inv", id: "statusInv", accessorKey: "statusInv", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{row.original.statusInv ? "✓" : "-"}</span> },
    { header: "Bayar", id: "statusBayar", accessorKey: "statusBayar", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <label className="flex items-center justify-center cursor-pointer p-2"><input type="checkbox" checked={editingRows[id]?.statusBayar ?? false} onChange={(e) => handleFieldChange(id, "statusBayar", e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></label>; } return <div className="flex justify-center">{row.original.statusBayar ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">✓</span> : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>}</div>; } },
    { header: "Bukti Bayar", id: "buktiBayar", accessorKey: "buktiBayar", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <input type="text" placeholder="Ref Bayar..." value={editingRows[id]?.buktiBayar ?? ""} onChange={(e) => handleFieldChange(id, "buktiBayar", e.target.value)} className="w-full min-w-[150px] px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100" />; } return <div className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[150px]" title={row.original.buktiBayar || "-"}>{row.original.buktiBayar || "-"}</div>; } },
    { header: "Remarks", id: "remarks", accessorKey: "remarks", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm max-w-[150px] truncate" title={row.original.remarks || "-"}>{row.original.remarks || "-"}</span> },
    { header: "Nama Supir", id: "namaSupir", accessorKey: "namaSupir", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm max-w-[150px] truncate" title={row.original.namaSupir || "-"}>{row.original.namaSupir || "-"}</span> },
    { header: "Plat Nomor", id: "platNomor", accessorKey: "platNomor", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm max-w-[150px] truncate" title={row.original.platNomor || "-"}>{row.original.platNomor || "-"}</span> },
    { header: "Tujuan Detail", id: "tujuanDetail", accessorKey: "tujuanDetail", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm max-w-[150px] truncate" title={row.original.tujuanDetail || "-"}>{row.original.tujuanDetail || "-"}</span> },
    { header: "Link PO", id: "linkPo", accessorKey: "linkPo", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm max-w-[150px] truncate" title={row.original.linkPo || "-"}>{row.original.linkPo || "-"}</span> },
    { header: "Actions", id: "actions", cell: ({ row, table }) => { const { isEditAll, editingRows, handleSave, handleEditToggle, openModal } = table.options.meta as any; const id = row.original.id; const isEditing = !!editingRows[id] && !isEditAll; const saving = editingRows[id]?.saving; const error = editingRows[id]?.error; return <div className="flex flex-col items-end gap-1"><div className="flex items-center gap-2">{!isEditAll && (isEditing ? <><button onClick={() => handleSave(id)} disabled={saving} className="p-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors" title="Save"><Save size={16} /></button><button onClick={() => handleEditToggle(row.original)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Cancel"><X size={16} /></button></> : <button onClick={() => handleEditToggle(row.original)} className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors" title="Edit"><Pencil size={16} /></button>)}<button className="p-1.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors" onClick={() => openModal(row.original)} title="View Details"><Eye size={16} /></button></div>{error && <span className="text-[10px] text-rose-500 font-semibold">{error}</span>}</div>; } },
  ], [page, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const filteredColumns = useMemo(() => columns.filter(c => visibleCols[c.id as string] !== false), [columns, visibleCols]);

  const table = useReactTable({
    data: rows,
    columns: filteredColumns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      isEditAll,
      editingRows,
      handleFieldChange,
      handleSave,
      handleEditToggle,
      openModal
    },
    state: {
      pagination: {
        pageIndex: Math.max(0, page - 1),
        pageSize: rowsPerPage,
      },
    },
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / rowsPerPage)),
    onPaginationChange: (updater) => {
      setIsTransitioning(true);
      const next = typeof updater === "function" ? updater({ pageIndex: Math.max(0, page - 1), pageSize: rowsPerPage }) : updater;
      setRowsPerPage(next.pageSize);
      setPage(next.pageIndex + 1);
    },
  });

  return (
    <main className="px-5 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Checklist Docs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan PO yang belum memiliki bukti tagih atau belum di-checklist.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No PO / Company / Invoice..."
              className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 relative">
            <button
              onClick={() => setShowColumns(!showColumns)}
              className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold"
            >
              <Settings2 size={16} /> Customize Column
            </button>
            {showColumns && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 z-50">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Kolom Tersedia</span>
                  <button onClick={() => setShowColumns(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16}/></button>
                </div>
                <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                  {columns.map(c => (
                     <label key={c.id as string} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={visibleCols[c.id as string] ?? false} 
                          onChange={(e) => setVisibleCols(prev => ({...prev, [c.id as string]: e.target.checked}))}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.header as string}</span>
                     </label>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={handleToggleEditAll}
              className={`h-10 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                isEditAll 
                  ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50' 
                  : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
              }`}
            >
              {isEditAll ? (
                <>
                  <X size={16} /> Batal Edit Semua
                </>
              ) : (
                <>
                  <Pencil size={16} /> Edit Semua
                </>
              )}
            </button>
            
            {isEditAll && (
              <button
                onClick={() => handleSave()}
                className="h-10 px-4 rounded-xl border border-emerald-600 bg-emerald-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm whitespace-nowrap"
              >
                <Save size={16} /> Simpan Semua
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => { setActiveFilter("total"); setPage(1); }}
          className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "total" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Total PO</span>
          <span className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">{summary.totalPo}</span>
        </div>
        <div 
          onClick={() => { setActiveFilter("pending"); setPage(1); }}
          className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "pending" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Pending Tagih</span>
          <span className="text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-500">{summary.pendingTagih}</span>
        </div>
        <div 
          onClick={() => { setActiveFilter("completed"); setPage(1); }}
          className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "completed" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Completed Tagih</span>
          <span className="text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-500">{summary.completedTagih}</span>
        </div>
        <div 
          onClick={() => { setActiveFilter("pending_bayar"); setPage(1); }}
          className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "pending_bayar" ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Pending Payment</span>
          <span className="text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-500">{summary.pendingBayar}</span>
        </div>
        <div 
          onClick={() => { setActiveFilter("completed_bayar"); setPage(1); }}
          className={`cursor-pointer rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-all ${activeFilter === "completed_bayar" ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}
        >
          <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Completed Payment</span>
          <span className="text-2xl lg:text-3xl font-bold text-teal-600 dark:text-teal-500">{summary.completedBayar}</span>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col max-h-[calc(100vh-160px)]">
        {error && (
          <div className="px-6 py-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-100 font-medium rounded-t-2xl">
            {error}
          </div>
        )}
        <div className="overflow-auto flex-1 relative">
          <table className="min-w-[1000px] w-full text-left relative">
            <thead className="text-[11px] text-slate-800 dark:text-slate-300 uppercase tracking-wide sticky top-0 z-10 shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50 bg-slate-50 dark:bg-slate-900 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-slate-200 dark:after:bg-slate-700">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-4 py-3 font-bold bg-slate-50 dark:bg-slate-900 whitespace-nowrap"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-700 text-sm text-black dark:text-slate-200 transition-opacity duration-300 ${isTransitioning ? "opacity-50" : "opacity-100"}`}
            >
              {table.getRowModel().rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-4 py-3">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredRows.length === 0 && !loading && !isTransitioning && (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-slate-500 dark:text-slate-400 font-medium"
                    colSpan={columns.length}
                  >
                    Tidak ada data Checklist Docs.
                  </td>
                </tr>
              )}
              {(loading || isTransitioning) && (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-slate-800 dark:text-slate-300 font-medium"
                    colSpan={columns.length}
                  >
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
            Total Data: <span className="text-slate-900 dark:text-slate-100 font-bold">{total.toLocaleString("id-ID")}</span> baris
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Rows per page
            </span>
            <CustomSelect
              value={String(rowsPerPage)}
              onChange={(val) => {
                setIsTransitioning(true);
                setRowsPerPage(Number(val));
                setPage(1);
              }}
              options={[
                { value: "10", label: "10" },
                { value: "25", label: "25" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
              className="w-20 shadow-sm dark:shadow-none"
            />
          </div>

          <GlobalPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              setIsTransitioning(true);
              setPage(p);
            }}
            itemsCount={filteredRows.length}
            totalItems={total}
            itemName="PO"
          />
        </div>
      </div>

      <PODetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={detailData}
      />
    </main>
  );
}
