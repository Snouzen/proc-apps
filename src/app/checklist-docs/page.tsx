"use client";

import { useMemo, useState } from "react";
import { Eye, Save, X, Pencil, Building2, FileText, CheckCircle2, ChevronRight, MapPin, Search, Settings2 } from "lucide-react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { PoDateBadge } from "@/components/PoDateBadge";
import PODetailModal from "@/components/po-detail-modal";
import CustomSelect from "@/components/select";
import { GlobalPagination } from "@/components/global-pagination";
import { LoaderThree } from "@/components/ui/loader";

import { useChecklistDocs } from "./hooks/useChecklistDocs";
import ChecklistSummaryCards from "./components/ChecklistSummaryCards";
import ChecklistFilters from "./components/ChecklistFilters";
import { useRetailerFilters } from "@/hooks/useRetailerFilters";

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
  buktiKirim?: string | null;

  RitelModern?: any;
  UnitProduksi?: any;
};

export default function ChecklistDocsPage() {
  const ritelFilters = useRetailerFilters();
  const [tglFrom, setTglFrom] = useState<string>("");
  const [tglTo, setTglTo] = useState<string>("");

  const {
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
    isEditAll,
    editingRows,
    formatDate,
    openModal,
    handleEditToggle,
    handleToggleEditAll,
    handleFieldChange,
    handleSave,
  } = useChecklistDocs({
    ritel: ritelFilters.selectedNamaPt,
    inisial: ritelFilters.selectedInisial,
    tujuan: ritelFilters.selectedTujuan,
    tglFrom,
    tglTo,
  });

  const columns = useMemo<ColumnDef<Row>[]>(() => [
    { header: "NO", id: "index", cell: ({ row }) => <div className="text-slate-600 dark:text-slate-400 font-bold w-10 flex items-center justify-center">{(page - 1) * rowsPerPage + row.index + 1}</div> },
    { header: "COMPANY", id: "company", accessorKey: "company", cell: ({ row }) => <div className="w-[250px] truncate font-bold text-slate-800 dark:text-slate-200" title={row.original.company || row.original?.RitelModern?.namaPt || "-"}>{row.original.company || row.original?.RitelModern?.namaPt || "-"}</div> },
    { header: "NO PO", id: "noPo", accessorKey: "noPo", cell: ({ row }) => <div className="w-[200px] truncate font-semibold text-slate-700 dark:text-slate-300" title={row.original.noPo || "-"}>{row.original.noPo || "-"}</div> },
    { header: "NO INVOICE", id: "noInvoice", accessorKey: "noInvoice", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-200 font-semibold w-[150px] block truncate">{row.original.noInvoice || "-"}</span> },
    { header: "TGL PO", id: "tglPo", accessorKey: "tglPo", cell: ({ row }) => <div className="w-[120px]"><PoDateBadge dateNode={<span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{formatDate(row.original.tglPo)}</span>} type="TAGIH" buktiData={row.original.buktiTagih} /></div> },
    { header: "EXPIRED", id: "expiredTgl", accessorKey: "expiredTgl", cell: ({ row }) => <div className="w-[120px]"><PoDateBadge dateNode={<span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{formatDate(row.original.expiredTgl)}</span>} type="PAID" buktiData={row.original.buktiBayar} /></div> },
    { header: "REGIONAL", id: "regional", accessorKey: "regional", cell: ({ row }) => { const reg = row.original.regional || row.original?.UnitProduksi?.namaRegional || "-"; return <div className="flex items-center whitespace-nowrap"><span className="text-slate-700 dark:text-slate-300 font-semibold">{reg}</span></div>; } },
    { header: "SITE AREA", id: "siteArea", accessorKey: "siteArea", cell: ({ row }) => { const siteArea = row.original?.UnitProduksi?.siteArea || "-"; return <div className="flex items-center whitespace-nowrap"><span className="text-slate-700 dark:text-slate-300 font-semibold">{siteArea}</span></div>; } },
    { header: "STATUS TAGIH", id: "statusTagih", accessorKey: "statusTagih", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <div className="w-[120px] flex justify-center"><label className="flex items-center justify-center cursor-pointer p-2"><input type="checkbox" checked={editingRows[id]?.statusTagih ?? false} onChange={(e) => handleFieldChange(id, "statusTagih", e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></label></div>; } return <div className="w-[120px] flex justify-center">{row.original.statusTagih ? <CheckCircle2 size={24} className="text-emerald-500 drop-shadow-sm" /> : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>}</div>; } },
    { header: "BUKTI TAGIH", id: "buktiTagih", accessorKey: "buktiTagih", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <div className="w-[200px]"><input type="text" placeholder="Ref Tagih..." value={editingRows[id]?.buktiTagih ?? ""} onChange={(e) => handleFieldChange(id, "buktiTagih", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-inner" /></div>; } return <div className="text-slate-800 dark:text-slate-200 font-medium truncate w-[200px]" title={row.original.buktiTagih || "-"}>{row.original.buktiTagih || "-"}</div>; } },
    { header: "TGL KIRIM", id: "tglkirim", accessorKey: "tglkirim", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[13px] font-semibold w-[120px] block">{formatDate(row.original.tglkirim)}</span> },
    { header: "STATUS KIRIM", id: "statusKirim", accessorKey: "statusKirim", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <div className="w-[120px] flex justify-center"><label className="flex items-center justify-center cursor-pointer p-2"><input type="checkbox" checked={editingRows[id]?.statusKirim ?? false} onChange={(e) => handleFieldChange(id, "statusKirim", e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></label></div>; } return <div className="w-[120px] flex justify-center">{row.original.statusKirim ? <CheckCircle2 size={24} className="text-emerald-500 drop-shadow-sm" /> : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>}</div>; } },
    { header: "BUKTI KIRIM", id: "buktiKirim", accessorKey: "buktiKirim", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <div className="w-[200px]"><input type="text" placeholder="Ref Kirim..." value={editingRows[id]?.buktiKirim ?? ""} onChange={(e) => handleFieldChange(id, "buktiKirim", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-inner" /></div>; } return <div className="text-slate-800 dark:text-slate-200 font-medium truncate w-[200px]" title={row.original.buktiKirim || "-"}>{row.original.buktiKirim || "-"}</div>; } },
    { header: "SDIF", id: "statusSdif", accessorKey: "statusSdif", cell: ({ row }) => <div className="w-[60px] flex justify-center">{row.original.statusSdif ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}</div> },
    { header: "PO", id: "statusPo", accessorKey: "statusPo", cell: ({ row }) => <div className="w-[60px] flex justify-center">{row.original.statusPo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}</div> },
    { header: "FP", id: "statusFp", accessorKey: "statusFp", cell: ({ row }) => <div className="w-[60px] flex justify-center">{row.original.statusFp ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}</div> },
    { header: "KWI", id: "statusKwi", accessorKey: "statusKwi", cell: ({ row }) => <div className="w-[60px] flex justify-center">{row.original.statusKwi ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}</div> },
    { header: "INV", id: "statusInv", accessorKey: "statusInv", cell: ({ row }) => <div className="w-[60px] flex justify-center">{row.original.statusInv ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}</div> },
    { header: "STATUS BAYAR", id: "statusBayar", accessorKey: "statusBayar", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <div className="w-[120px] flex justify-center"><label className="flex items-center justify-center cursor-pointer p-2"><input type="checkbox" checked={editingRows[id]?.statusBayar ?? false} onChange={(e) => handleFieldChange(id, "statusBayar", e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></label></div>; } return <div className="w-[120px] flex justify-center">{row.original.statusBayar ? <CheckCircle2 size={24} className="text-emerald-500 drop-shadow-sm" /> : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>}</div>; } },
    { header: "BUKTI BAYAR", id: "buktiBayar", accessorKey: "buktiBayar", cell: ({ row, table }) => { const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any; const id = row.original.id; const isEditing = isEditAll || !!editingRows[id]; if (isEditing) { return <div className="w-[200px]"><input type="text" placeholder="Ref Bayar..." value={editingRows[id]?.buktiBayar ?? ""} onChange={(e) => handleFieldChange(id, "buktiBayar", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-inner" /></div>; } return <div className="text-slate-800 dark:text-slate-200 font-medium truncate w-[200px]" title={row.original.buktiBayar || "-"}>{row.original.buktiBayar || "-"}</div>; } },
    { header: "REMARKS", id: "remarks", accessorKey: "remarks", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm w-[200px] block truncate" title={row.original.remarks || "-"}>{row.original.remarks || "-"}</span> },
    { header: "NAMA SUPIR", id: "namaSupir", accessorKey: "namaSupir", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm w-[150px] block truncate" title={row.original.namaSupir || "-"}>{row.original.namaSupir || "-"}</span> },
    { header: "PLAT NOMOR", id: "platNomor", accessorKey: "platNomor", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm w-[120px] block truncate" title={row.original.platNomor || "-"}>{row.original.platNomor || "-"}</span> },
    { header: "TUJUAN", id: "tujuanDetail", accessorKey: "tujuanDetail", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm w-[180px] block truncate" title={row.original.tujuanDetail || "-"}>{row.original.tujuanDetail || "-"}</span> },
    { header: "LINK PO", id: "linkPo", accessorKey: "linkPo", cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-sm w-[150px] block truncate" title={row.original.linkPo || "-"}>{row.original.linkPo || "-"}</span> },
    { header: "ACTIONS", id: "actions", cell: ({ row, table }) => { const { isEditAll, editingRows, handleSave, handleEditToggle, openModal } = table.options.meta as any; const id = row.original.id; const isEditing = !!editingRows[id] && !isEditAll; const saving = editingRows[id]?.saving; const error = editingRows[id]?.error; return <div className="flex flex-col items-center justify-center gap-1 w-[100px]"><div className="flex items-center gap-2">{!isEditAll && (isEditing ? <><button onClick={() => handleSave(id)} disabled={saving} className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-all shadow-sm" title="Save"><Save size={18} /></button><button onClick={() => handleEditToggle(row.original)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm" title="Cancel"><X size={18} /></button></> : <button onClick={() => handleEditToggle(row.original)} className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all shadow-sm" title="Edit"><Pencil size={18} /></button>)}<button className="p-2 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm group" onClick={() => openModal(row.original)} title="View Details"><ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></button></div>{error && <span className="text-[10px] text-rose-500 font-semibold text-center w-full">{error}</span>}</div>; } },
  ], [page, rowsPerPage, formatDate]);

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Checklist Docs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan PO yang belum memiliki bukti tagih atau belum di-checklist.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full md:w-auto">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No PO / Company / Invoice..."
            className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          />
        </div>
        </div>
      </div>

      <ChecklistSummaryCards
        summary={summary}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setPage={setPage}
      />

      <div className="mt-6 mb-4">
        <ChecklistFilters
          search={search}
          setSearch={setSearch}
          showColumns={showColumns}
          setShowColumns={setShowColumns}
          columns={columns}
          visibleCols={visibleCols}
          setVisibleCols={setVisibleCols}
          isEditAll={isEditAll}
          handleToggleEditAll={handleToggleEditAll}
          handleSave={handleSave}
          ritelFilters={ritelFilters}
          tglFrom={tglFrom}
          setTglFrom={setTglFrom}
          tglTo={tglTo}
          setTglTo={setTglTo}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 relative">
        <button
          onClick={() => setShowColumns(!showColumns)}
          className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold shadow-sm"
        >
          <Settings2 size={16} /> Customize Column
        </button>
        {showColumns && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 z-50 top-12">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Kolom Tersedia</span>
              <button onClick={() => setShowColumns(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16}/></button>
            </div>
            <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
              {columns.map((c: any) => (
                  <label key={c.id as string} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleCols[c.id as string] ?? false} 
                      onChange={(e) => setVisibleCols((prev: any) => ({...prev, [c.id as string]: e.target.checked}))}
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
          className={`h-10 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-sm ${
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col max-h-[calc(100vh-160px)]">
        {error && (
          <div className="px-6 py-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-100 font-medium rounded-t-2xl">
            {error}
          </div>
        )}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative premium-scrollbar">
          <table className="w-full text-left border-collapse min-w-[2000px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className={`px-4 py-4 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md whitespace-nowrap border-b border-slate-200 dark:border-slate-700
                        ${h.column.id === 'index' ? 'sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}
                        ${h.column.id === 'actions' ? 'sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}
                      `}
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
              className={`divide-y divide-slate-100 dark:divide-slate-800/50 text-sm text-black dark:text-slate-200 transition-opacity duration-300 ${isTransitioning ? "opacity-50" : "opacity-100"}`}
            >
              {table.getRowModel().rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} 
                      className={`px-4 py-3 align-middle
                        ${c.column.id === 'index' ? 'sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] transition-colors' : ''}
                        ${c.column.id === 'actions' ? 'sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.5)] transition-colors' : ''}
                      `}
                    >
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
                    className="px-6 py-10 text-center"
                    colSpan={columns.length}
                  >
                    <LoaderThree label="Loading data..." />
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
