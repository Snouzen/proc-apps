"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { DataTable } from "@/components/data-table";
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

// ── Helper: strip junk site area text ──────────────────────────────────────
function cleanSiteArea(val?: string | null): string {
  if (!val) return "-";
  const lower = val.trim().toLowerCase();
  if (
    lower === "unknown" ||
    lower === "" ||
    lower.includes("unit produksi") ||
    lower.includes("belum ada")
  )
    return "-";
  return val.trim();
}

// ── Skeleton row ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-50">
      {["w-8", "w-48", "w-16", "w-24", "w-24", "w-24", "w-28", "w-24"].map(
        (w, i) => (
          <td key={i} className="px-5 py-3.5">
            <div className={`h-3.5 bg-slate-100 rounded-md ${w}`} />
          </td>
        ),
      )}
    </tr>
  );
}

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
      <DataTable
          columns={[
            {
              key: "noPo",
              label: "Purchase Order",
              width: "w-[260px]",
              render: (_v: any, po: any) => (
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{po.noPo}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[230px]">{po.RitelModern?.namaPt || "-"}</p>
                </div>
              ),
            },
            {
              key: "inisial",
              label: "Inisial",
              width: "w-[90px]",
              render: (_v: any, po: any) => (
                <StandardTooltip content={po.RitelModern?.inisial || "-"}>
                  <span 
                    className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] shadow-sm cursor-pointer"
                  >
                    {po.RitelModern?.inisial || "-"}
                  </span>
                </StandardTooltip>
              ),
            },
            {
              key: "siteArea",
              label: "Site Area",
              width: "w-[160px]",
              render: (_v: any, po: any) => {
                const site = cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea);
                return (
                  <div className="flex items-center gap-1.5">
                    {site !== "-" && <MapPin size={11} className="text-slate-300 dark:text-slate-500 shrink-0" />}
                    <span className={`text-xs font-medium ${site === "-" ? "text-slate-300 dark:text-slate-600" : "text-slate-600 dark:text-slate-300"}`}>{site}</span>
                  </div>
                );
              },
            },
            {
              key: "tujuanDetail",
              label: "Tujuan",
              width: "w-[200px]",
              render: (_v: any, po: any) => (
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px]" title={po.tujuanDetail || "-"}>{po.tujuanDetail || "-"}</p>
              ),
            },
            {
              key: "tglPo",
              label: "Tgl PO",
              width: "w-[120px]",
              render: (_v: any, po: any) => (
                <PoDateBadge 
                  dateNode={<span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{po.tglPo ? format(new Date(po.tglPo), "dd MMM yyyy") : "-"}</span>}
                  type="TAGIH"
                  buktiData={po.buktiTagih}
                />
              ),
            },
            {
              key: "expiredTgl",
              label: "Due Date",
              width: "w-[110px]",
              render: (_v: any, po: any) => (
                <PoDateBadge 
                  dateNode={
                    <span className={`text-xs tabular-nums whitespace-nowrap font-bold ${
                      po.expiredTgl && new Date(po.expiredTgl).getTime() - Date.now() <= 3 * 24 * 60 * 60 * 1000
                        ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"
                    }`}>
                      {po.expiredTgl ? format(new Date(po.expiredTgl), "dd MMM yyyy") : "-"}
                    </span>
                  }
                  type="PAID"
                  buktiData={po.buktiBayar}
                />
              ),
            },
            {
              key: "tglkirim",
              label: "Tgl Kirim",
              width: "w-[130px]",
              align: "center" as const,
              render: (_v: any, po: any) => {
                const isScheduled = !!po.tglkirim;
                return isScheduled ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-md text-[10px] font-black uppercase tracking-tight">
                    <CalendarDays size={11} className="shrink-0" />
                    {format(new Date(po.tglkirim), "dd MMM yy")}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 rounded-md text-[10px] font-bold uppercase tracking-tight italic">
                    <Clock size={11} className="shrink-0" />
                    Belum Ada
                  </div>
                );
              },
            },
            {
              key: "pcsTotal",
              label: "Pcs",
              align: "center" as const,
              width: "w-[60px]",
              render: (_v: any, po: any) => (
                <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">{Number(po.pcsTotal || 0).toLocaleString("id-ID")}</span>
              ),
            },
            {
              key: "pcsKirim",
              label: "Pcs Kirim",
              align: "center" as const,
              width: "w-[140px]",
              render: (_v: any, po: any) => {
                const itemsCount = Number(po.itemsCount || 0);
                const isMulti = itemsCount > 1;
                const isExpanded = expandedRows.has(po.id);
                return (
                  <div onClick={(e) => e.stopPropagation()}>
                    {isMulti ? (
                      <div className="flex items-center gap-2 justify-center">
                        <span className="flex items-center justify-center w-24 h-9 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black tabular-nums shadow-sm">
                          {Number(po.pcsKirimTotal || 0).toLocaleString("id-ID")}
                        </span>
                        <button 
                          onClick={() => toggleRow(po.id)}
                          className={`p-1.5 rounded-lg transition-all active:scale-95 shadow-sm border ${
                            isExpanded 
                            ? "bg-rose-500 text-white border-rose-600 shadow-rose-100" 
                            : "bg-white dark:bg-slate-800 text-indigo-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600 shadow-slate-100"
                          }`}
                          title={isExpanded ? "Tutup" : "Breakdown PO"}
                        >
                          {isExpanded ? <X size={10} strokeWidth={4} /> : <PencilLine size={10} strokeWidth={3} />}
                        </button>
                      </div>
                    ) : (
                      <div className="relative inline-block group/input">
                        <input
                          type="number"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          min="0"
                          max={po.pcsTotal || 0}
                          value={po.pcsKirimTotal ?? 0}
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value.toString()) || 0;
                            handleUpdatePcsKirim(po.id, val.toString());
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          disabled={savingPcsId === po.id}
                          className={`w-24 h-9 px-2 text-xs font-black text-center bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-all tabular-nums shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            Number(po.pcsKirimTotal) > Number(po.pcsTotal)
                              ? "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-900/20 shadow-[0_0_8px_rgba(225,29,72,0.2)]"
                              : savingPcsId === po.id
                              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 animate-pulse"
                              : "border-slate-200 dark:border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-slate-900 text-slate-700 dark:text-slate-200 font-black"
                          }`}
                          onChange={(e) => {
                            const val = e.target.value;
                            const numVal = Number(val);
                            const max = Number(po.pcsTotal || 0);
                            const finalVal = numVal > max ? max.toString() : val;
                            setPoData((prev) => prev.map((p) => p.id === po.id ? { ...p, pcsKirimTotal: finalVal } : p));
                          }}
                        />
                        {savingPcsId !== po.id && Number(po.pcsKirimTotal) > 0 && (
                          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Tersimpan" />
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              key: "actions",
              label: "Action",
              align: "center" as const,
              width: "w-[130px]",
              render: (_v: any, po: any) => {
                const isScheduled = !!po.tglkirim;
                return (
                  <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <ActionButton
                      icon={Calendar}
                      tooltip={isScheduled ? "Ubah Jadwal" : "Set Jadwal"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPo(po);
                        setSelectedDate(po.tglkirim ? po.tglkirim.split("T")[0] : "");
                        setNamaSupir(po.namaSupir || "");
                        setPlatNomor(po.platNomor || "");
                        setModalOpen(true);
                      }}
                      variant={isScheduled ? "slate" : "indigo"}
                      loading={updatingId === po.id}
                    />
                    
                    <ActionButton
                      icon={RotateCcw}
                      tooltip="Reject / Unassign"
                      onClick={(e) => { e.stopPropagation(); handleRejectPo(po); }}
                      variant="rose"
                      loading={updatingId === po.id}
                    />

                    {isScheduled && (
                      <ActionButton
                        icon={Eye}
                        tooltip="Preview & Download"
                        onClick={(e) => { e.stopPropagation(); handlePreviewPdf(po); }}
                        variant="indigo"
                      />
                    )}
                  </div>
                );
              },
            },
          ]}
          data={paginatedPOs}
          rowKey={(po: any) => po.id}
          loading={loading}
          skeletonRows={6}
          total={filteredPo.length}
          page={currentPage}
          rowsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          hidePagination={totalPages <= 1}
          variant="default"
          rowNumber
          onRowClick={(po: any) => handleViewRow(po)}
          expandedKeys={expandedRows}
          onToggleExpand={toggleRow}
          renderExpandedRow={(po: any) => {
            if (!po.Items) return null;
            return (
              <tr className="bg-slate-50/10 dark:bg-slate-900/10" onClick={(e) => e.stopPropagation()}>
                <td colSpan={14} className="px-5 py-6">
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
                                  value={item.pcsKirim}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const numVal = Number(val);
                                    const finalVal = numVal > item.pcs ? item.pcs : numVal;
                                    setPoData(prev => prev.map(p => 
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
          emptyState={
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <CalendarDays size={28} className="text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Tidak ada data</p>
                <p className="text-xs text-slate-400 mt-0.5">Semua PO sudah dijadwalkan atau tidak ada yang cocok.</p>
              </div>
            </div>
          }
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"
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
