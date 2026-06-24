"use client";

import { useMemo, useState } from "react";
import { X, Search, Settings2, Pencil, Save } from "lucide-react";
import PODetailModal from "@/components/po-detail-modal";

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

import { getChecklistDocsColumns } from "./components/ChecklistDocsColumns";
import { DataTableV2 } from "@/components/data-table/DataTableV2";

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

  const columns = useMemo(() => getChecklistDocsColumns(formatDate), [formatDate]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const isSavingAll = Object.values(editingRows).some((r: any) => r.saving);

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
          onClick={handleToggleEditAll}
          disabled={isSavingAll}
          className={`h-10 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
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
            disabled={isSavingAll}
            className="h-10 px-4 rounded-xl border border-emerald-600 bg-emerald-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingAll ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={16} /> Simpan Semua
              </>
            )}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
        {error && (
          <div className="px-6 py-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-100 font-medium rounded-t-2xl">
            {error}
          </div>
        )}
        
        <DataTableV2
          columns={columns}
          data={rows}
          loading={loading}
          isFetching={isTransitioning}
          manualPagination={true}
          pageCount={totalPages}
          pagination={{ pageIndex: Math.max(0, page - 1), pageSize: rowsPerPage }}
          onPaginationChange={(updater: any) => {
            setIsTransitioning(true);
            const next = typeof updater === "function" ? updater({ pageIndex: Math.max(0, page - 1), pageSize: rowsPerPage }) : updater;
            setRowsPerPage(next.pageSize);
            setPage(next.pageIndex + 1);
          }}
          meta={{
            role,
            isEditAll,
            editingRows,
            handleFieldChange,
            handleSave,
            handleEditToggle,
            openModal
          }}
        />
      </div>

      <PODetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={detailData}
      />
    </main>
  );
}
