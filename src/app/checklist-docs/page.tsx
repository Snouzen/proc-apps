"use client";

import { useMemo } from "react";
import { Eye, Save, X, Pencil } from "lucide-react";
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
  } = useChecklistDocs();

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
      />

      <ChecklistSummaryCards
        summary={summary}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setPage={setPage}
      />

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
