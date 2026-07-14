"use client";

import { Truck, ChevronLeft, ChevronRight } from "lucide-react";

import PODetailModal from "@/components/po-detail-modal";
import {
  CreditLimitSearchBar,
  CreditLimitFilters,
  BatchAccordion,
} from "@/components/credit-limit";
import { GlobalPagination } from "@/components/global-pagination";

import { useCreditLimitFilters } from "@/hooks/useCreditLimitFilters";
import { useCreditLimitApproval } from "@/hooks/useCreditLimitApproval";
import { usePODetail } from "@/hooks/usePODetail";

export default function CreditLimitApprovalPage() {
  const filters = useCreditLimitFilters();
  const detail = usePODetail();

  const data = useCreditLimitApproval({
    search: filters.search,
    selectedNamaPt: filters.selectedNamaPt,
    selectedInisial: filters.selectedInisial,
    selectedTujuan: filters.selectedTujuan,
    tglFrom: filters.tglFrom,
    tglTo: filters.tglTo,
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-7">
      {data.role !== "pusat" && !data.loading && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 font-bold text-center">
          Anda tidak memiliki akses ke halaman ini. Halaman ini khusus untuk Pusat.
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Credit Limit — Approval PO
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
            Daftar pengajuan Credit Limit yang menunggu persetujuan (Khusus Pusat).
          </p>
        </div>

        <CreditLimitSearchBar value={filters.search} onChange={filters.setSearch} placeholder="Search No PO, Site, Company..." />
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <CreditLimitFilters {...filters} />

      {/* ── Accordion List ──────────────────────────────────────────── */}
      {data.loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
                <div className="ml-auto flex gap-3">
                  <div className="h-7 w-20 bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
                  <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
                  <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
                </div>
                <div className="h-5 w-5 bg-slate-100 dark:bg-slate-800/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : data.batchGroups.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <Truck size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">
                Belum ada batch yang menunggu approval
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 text-center">
                Pengajuan Credit Limit akan muncul di sini setelah diajukan dari halaman Data.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.paginatedBatches.map((batch) => (
            <BatchAccordion
              key={batch.batchCode}
              batchCode={batch.batchCode}
              pos={batch.pos}
              isExpanded={data.expandedBatches.has(batch.batchCode)}
              isArchived={batch.isArchived}
              onUpdateKodeVendor={data.handleUpdateKodeVendor}
              isBatchOpen={batch.isBatchOpen}
              isBatchUncloseable={batch.isBatchUncloseable}
              onToggle={() => data.toggleBatch(batch.batchCode)}
              onAction={data.handleAction}
              onViewRow={detail.handleViewRow}
              onApproveAll={data.handleApproveAll}
              onExportExcel={data.handleExportExcel}
              onToggleND={data.handleToggleND}
              onChecklistAllND={data.handleChecklistAllND}
              onUpdateNDDetails={data.handleUpdateNDDetails}
              onCloseBatch={data.handleCloseBatch}
              onUncloseBatch={data.handleUncloseBatch}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      <GlobalPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        onPageChange={data.setCurrentPage}
        itemsCount={data.paginatedBatches.length}
        totalItems={data.batchGroups.length}
        itemName="batch"
      />

      {/* ── View Detail Modal ──────────────────────────────────────── */}
      <PODetailModal
        open={detail.isViewOpen}
        onClose={detail.closeDetail}
        data={
          detail.detailData
            ? {
                ...detail.detailData,
                buktiKirim: detail.detailData.buktiKirim,
                buktiFp: detail.detailData.buktiFp,
                status: {
                  kirim: !!detail.detailData.statusKirim,
                  sdif: !!detail.detailData.statusSdif,
                  po: !!detail.detailData.statusPo,
                  fp: !!detail.detailData.statusFp,
                  kwi: !!detail.detailData.statusKwi,
                  inv: !!detail.detailData.statusInv,
                  tagih: !!detail.detailData.statusTagih,
                  bayar: !!detail.detailData.statusBayar,
                },
              }
            : null
        }
      />
    </div>
  );
}
