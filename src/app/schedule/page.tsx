"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { getScheduleColumns } from "./components/ScheduleColumns";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarCheck,
  Clock,
  Search,
  Truck,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  MapPin,
  X,
  FileDown,
  Eye,
  RotateCcw,
  ChevronDown,
  PencilLine,
} from "lucide-react";
import { getMe } from "@/lib/me";
import { format } from "date-fns";
import { PoDateBadge } from "@/components/PoDateBadge";
import DateInputHybrid from "@/components/DateInputHybrid";
import PODetailModal from "@/components/po-detail-modal";
// Lazy-loaded: jsPDF is ~100KB, only needed when user clicks download/preview
const lazyGenerateInvoicePdf = (
  ...args: Parameters<typeof import("@/lib/generateInvoice").generateInvoicePdf>
) => import("@/lib/generateInvoice").then((m) => m.generateInvoicePdf(...args));
import Swal from "sweetalert2";

import { LoaderThree } from "@/components/ui/loader";
import { useSchedule } from "./hooks/useSchedule";
import ScheduleSummaryCards from "./components/ScheduleSummaryCards";
import ScheduleFilters from "./components/ScheduleFilters";

import { ActionButton, StandardTooltip } from "@/components/ui/action-button";
import ScheduleModals from "./components/ScheduleModals";

// SkeletonRow removed as DataTableV2 has its own skeleton

export default function SchedulePage() {
  const hook = useSchedule();
  const {
    poData, setPoData,
    loading,
    search, setSearch,
    updatingId, setUpdatingId,
    selectedDate, setSelectedDate,
    modalOpen, setModalOpen,
    selectedPo, setSelectedPo,
    namaSupir, setNamaSupir,
    platNomor, setPlatNomor,
    savingPcsId, setSavingPcsId,
    expandedRows, setExpandedRows,
    isViewOpen, setIsViewOpen,
    loadingDetail, setLoadingDetail,
    detailData, setDetailData,
    pdfPreviewUrl, setPdfPreviewUrl,
    activeFilter, setActiveFilter,
    currentPage, setCurrentPage,
    itemsPerPage,
    fetchData,
    handleUpdateSchedule,
    toggleRow,
    handleUpdateItemPcsKirim,
    handleUpdatePcsKirim,
    handleRejectPo,
    handleDownloadInvoice,
    handlePreviewPdf,
    handleViewRow,
    filteredPo,
    paginatedPOs,
    stats,
    totalPages
  } = hook;

  const columns = useMemo(() => getScheduleColumns((d: any) => d ? format(new Date(d), "dd MMM yyyy") : "-"), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderThree label="Loading schedule data..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-7">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Delivery Scheduling
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage delivery schedules for your purchase orders.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Search No PO, Site, Company..."
            className="pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all w-full md:w-72 shadow-sm text-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScheduleSummaryCards 
        stats={hook.stats} 
        activeFilter={hook.activeFilter} 
        setActiveFilter={hook.setActiveFilter} 
      />

      <ScheduleFilters hook={hook} />

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <DataTableV2
          columns={columns}
          data={paginatedPOs}
          getRowId={(row: any) => row.id}
          loading={loading}
          isFetching={false}
          manualPagination={true}
          pageCount={totalPages}
          pagination={{ pageIndex: Math.max(0, currentPage - 1), pageSize: itemsPerPage }}
          onPaginationChange={(updater: any) => {
            const next = typeof updater === "function" ? updater({ pageIndex: Math.max(0, currentPage - 1), pageSize: itemsPerPage }) : updater;
            setCurrentPage(next.pageIndex + 1);
          }}
          meta={{
            expandedRows,
            toggleRow,
            handleUpdateItemPcsKirim,
            handleUpdatePcsKirim,
            savingPcsId,
            setPoData,
            setSelectedPo,
            setSelectedDate,
            setNamaSupir,
            setPlatNomor,
            setModalOpen,
            updatingId,
            handleRejectPo,
            handlePreviewPdf,
          }}
          expandedKeys={expandedRows}
          onRowClick={(po: any) => handleViewRow(po)}
          renderExpandedRow={(po: any) => {
            if (!po.Items) return null;
            return (
              <tr className="bg-slate-50/10 dark:bg-slate-900/10" onClick={(e) => e.stopPropagation()}>
                <td colSpan={14} className="px-5 py-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-[32px] overflow-x-auto overflow-y-hidden shadow-2xl shadow-indigo-200/10 dark:shadow-none mx-4">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                          <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-12">Product Breakdown</th>
                          <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Order</th>
                          <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kirim</th>
                          <th className="px-12 py-4 text-right text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {po.Items.map((item: any, idx: number) => (
                          <tr key={item.id} className={idx !== po.Items.length - 1 ? "border-b border-slate-50 dark:border-slate-700" : ""}>
                            <td className="px-8 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 pl-12">{item.namaProduk}</td>
                            <td className="px-6 py-4 text-center text-xs font-black text-slate-300 dark:text-slate-500">{item.pcs}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="relative inline-block">
                                <input
                                  type="number"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  min={0}
                                  max={item.pcs}
                                  value={item.pcsKirim ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const numVal = Number(val);
                                    const finalVal = numVal > item.pcs ? item.pcs.toString() : val === "" ? "" : numVal.toString();
                                    setPoData((prev: any) => prev.map((p: any) => 
                                      p.id === po.id 
                                      ? { ...p, Items: p.Items.map((it: any) => it.id === item.id ? { ...it, pcsKirim: finalVal } : it) } 
                                      : p
                                    ));
                                  }}
                                  onBlur={(e) => handleUpdateItemPcsKirim(po.id, item.id, e.target.value)}
                                  className="w-24 px-3 py-1.5 text-center text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 transition-all tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </td>
                            <td className="px-12 py-4 text-right">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${item.pcsKirim >= item.pcs ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500"}`}>
                                {item.pcsKirim >= item.pcs ? "Full" : "Partial"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            );
          }}
      />

      <ScheduleModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        selectedPo={selectedPo}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        namaSupir={namaSupir}
        setNamaSupir={setNamaSupir}
        platNomor={platNomor}
        setPlatNomor={setPlatNomor}
        updatingId={updatingId}
        handleUpdateSchedule={handleUpdateSchedule}
        isViewOpen={isViewOpen}
        setIsViewOpen={setIsViewOpen}
        detailData={detailData}
        setDetailData={setDetailData}
        pdfPreviewUrl={pdfPreviewUrl}
        setPdfPreviewUrl={setPdfPreviewUrl}
      />
    </div>
  );
}
