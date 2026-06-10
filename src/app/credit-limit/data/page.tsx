"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import {
  ShieldCheck,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import PODetailModal from "@/components/po-detail-modal";

import { cleanSiteArea, getDueDateZone, needsRemarks } from "@/lib/credit-limit";
import {
  StandardTooltip,
  ActionButton,
  StatusBadge,
  InlineVendorInput,
  CreditLimitSearchBar,
  CreditLimitFilters,
  StatsCard,
} from "@/components/credit-limit";
import { useCreditLimitFilters } from "@/hooks/useCreditLimitFilters";
import { useCreditLimitData } from "@/hooks/useCreditLimitData";
import { usePODetail } from "@/hooks/usePODetail";

export default function CreditLimitDataPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "outdate" | "submitted">("all");
  
  const filters = useCreditLimitFilters();
  const detail = usePODetail();

  const data = useCreditLimitData({
    search: filters.search,
    activeFilter,
    selectedNamaPt: filters.selectedNamaPt,
    selectedInisial: filters.selectedInisial,
    selectedTujuan: filters.selectedTujuan,
    tglFrom: filters.tglFrom,
    tglTo: filters.tglTo,
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-7">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Credit Limit — Data PO
            </h1>
            {data.userRole === "sitearea" && data.userSiteArea && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm dark:shadow-none">
                <MapPin size={12} />
                {data.userSiteArea}
              </span>
            )}
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
            {data.userRole === "sitearea"
              ? `Menampilkan data PO untuk site area ${data.userSiteArea || "Anda"}, siap untuk pengajuan credit limit.`
              : "Daftar PO yang sudah dijadwalkan dan pengiriman lengkap, siap untuk pengajuan credit limit."}
          </p>
        </div>

        <CreditLimitSearchBar value={filters.search} onChange={filters.setSearch} />
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: "all" as const,
            label: "Total Credit Limit",
            value: data.stats.total,
            icon: <ShieldCheck size={18} className="text-blue-500" />,
            bg: "bg-blue-50 dark:bg-blue-500/10",
            text: "text-blue-600 dark:text-blue-400",
            ring: "ring-blue-500 dark:ring-blue-500/50",
          },
          {
            id: "pending" as const,
            label: "Total Pending Credit Limit",
            value: data.stats.normal,
            icon: <ShieldCheck size={18} className="text-indigo-500" />,
            bg: "bg-indigo-50 dark:bg-indigo-500/10",
            text: "text-indigo-600 dark:text-indigo-400",
            ring: "ring-indigo-500 dark:ring-indigo-500/50",
          },
          {
            id: "outdate" as const,
            label: "Total Outdate Credit Limit",
            value: data.stats.remarksNeeded,
            icon: <AlertTriangle size={18} className="text-amber-500" />,
            bg: "bg-amber-50 dark:bg-amber-500/10",
            text: "text-amber-600 dark:text-amber-400",
            ring: "ring-rose-500 dark:ring-rose-500/50",
          },
          {
            id: "submitted" as const,
            label: "Sudah Diajukan",
            value: data.stats.submitted,
            icon: <CheckCircle2 size={18} className="text-emerald-500" />,
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
            text: "text-emerald-600 dark:text-emerald-400",
            ring: "ring-emerald-500 dark:ring-emerald-500/50",
          },
        ].map((stat) => (
          <StatsCard
            key={stat.id}
            stat={stat}
            isActive={activeFilter === stat.id}
            onClick={() => setActiveFilter(stat.id)}
          />
        ))}
      </div>

      {/* ── Additional Filters ───────────────────────────────────────────── */}
      <CreditLimitFilters {...filters} />

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <DataTable
        columns={[
          {
            key: "batchCode",
            label: "Kode Credit Limit",
            width: "w-[180px]",
            hidden: activeFilter !== "submitted",
            render: (_v: any, po: any) => (
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                {po.CreditLimitBatch?.batchCode || "-"}
              </span>
            ),
          },
          {
            key: "noPo",
            label: "Purchase Order",
            width: "w-[230px]",
            render: (_v: any, po: any) => (
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">
                  {po.noPo}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                  {po.RitelModern?.namaPt || "-"}
                </p>
              </div>
            ),
          },
          {
            key: "inisial",
            label: "Inisial",
            width: "w-[160px]",
            render: (_v: any, po: any) => (
              <StandardTooltip content={po.RitelModern?.inisial || "-"}>
                <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[140px] shadow-sm dark:shadow-none cursor-pointer">
                  {po.RitelModern?.inisial || "-"}
                </span>
              </StandardTooltip>
            ),
          },
          {
            key: "siteArea",
            label: "Site Area",
            width: "w-[130px]",
            render: (_v: any, po: any) => {
              const site = cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea);
              return (
                <div className="flex items-center gap-1.5">
                  {site !== "-" && <MapPin size={11} className="text-slate-300 dark:text-slate-500 shrink-0" />}
                  <span className={`text-xs font-medium ${site === "-" ? "text-slate-300 dark:text-slate-600" : "text-slate-600 dark:text-slate-300"}`}>
                    {site}
                  </span>
                </div>
              );
            },
          },
          {
            key: "tujuanDetail",
            label: "Tujuan",
            width: "w-[140px]",
            render: (_v: any, po: any) => (
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[130px]" title={po.tujuanDetail || "-"}>
                {po.tujuanDetail || "-"}
              </p>
            ),
          },
          {
            key: "tglPo",
            label: "Tgl PO",
            width: "w-[120px]",
            render: (_v: any, po: any) => (
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                {po.tglPo ? format(new Date(po.tglPo), "dd MMM yyyy") : "-"}
              </span>
            ),
          },
          {
            key: "expiredTgl",
            label: "Due Date",
            width: "w-[110px]",
            render: (_v: any, po: any) => {
              const zone = getDueDateZone(po.expiredTgl);
              const isWarning = needsRemarks(zone);
              return (
                <span className={`text-xs tabular-nums whitespace-nowrap font-bold ${isWarning ? "text-amber-600 dark:text-amber-500" : "text-slate-600 dark:text-slate-300"}`}>
                  {po.expiredTgl ? format(new Date(po.expiredTgl), "dd MMM yyyy") : "-"}
                </span>
              );
            },
          },
          {
            key: "tglkirim",
            label: "Tgl Kirim",
            width: "w-[130px]",
            align: "center" as const,
            render: (_v: any, po: any) => (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md text-[10px] font-black uppercase tracking-tight whitespace-nowrap">
                <CalendarDays size={11} className="shrink-0" />
                {format(new Date(po.tglkirim), "dd MMM yy")}
              </div>
            ),
          },
          {
            key: "pcsTotal",
            label: "Pcs",
            align: "center" as const,
            width: "w-[60px]",
            render: (_v: any, po: any) => (
              <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">
                {Number(po.pcsTotal || 0).toLocaleString("id-ID")}
              </span>
            ),
          },
          {
            key: "pcsKirim",
            label: "Pcs Kirim",
            align: "center" as const,
            width: "w-[100px]",
            render: (_v: any, po: any) => (
              <div className="flex items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-xs font-black tabular-nums">
                  <CheckCircle2 size={11} className="shrink-0" />
                  {Number(po.pcsKirimTotal || 0).toLocaleString("id-ID")}
                </span>
              </div>
            ),
          },
          {
            key: "kodeVendor",
            label: "Kode Vendor",
            align: "center" as const,
            width: "w-[130px]",
            render: (_v: any, po: any) => (
              <div onClick={(e) => e.stopPropagation()}>
                <InlineVendorInput 
                  po={po} 
                  onUpdate={data.handleUpdateKodeVendor}
                  disabled={!!(po.statusCreditLimit && po.statusCreditLimit !== "REJECTED")} 
                />
              </div>
            ),
          },
          {
            key: "zone",
            label: "Status",
            align: "center" as const,
            width: "w-[140px]",
            render: (_v: any, po: any) => <StatusBadge status={po.statusCreditLimit} />,
          },
          {
            key: "action",
            label: "Action",
            align: "center" as const,
            width: "w-[140px]",
            hidden: activeFilter === "submitted",
            render: (_v: any, po: any) => {
              const zone = getDueDateZone(po.expiredTgl);
              return (
                <div
                  className="flex items-center justify-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionButton
                    icon={ShieldCheck}
                    tooltip={
                      po.statusCreditLimit === "REJECTED"
                        ? "Ajukan Ulang Credit Limit"
                        : needsRemarks(zone)
                        ? "Ajukan Credit Limit (Perlu Remarks)"
                        : "Ajukan Credit Limit"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      data.handleAjukanCreditLimit(po);
                    }}
                    variant={po.statusCreditLimit === "REJECTED" || needsRemarks(zone) ? "amber" : "indigo"}
                  />
                </div>
              );
            },
          },
          {
            key: "spacer",
            label: "",
            width: "w-full min-w-[20px]",
            render: () => null,
          },
        ]}
        data={data.paginatedPOs}
        rowKey={(po: any) => po.id}
        loading={data.loading}
        skeletonRows={6}
        total={data.filteredPo.length}
        page={data.currentPage}
        rowsPerPage={data.itemsPerPage}
        onPageChange={data.setCurrentPage}
        hidePagination={data.totalPages <= 1}
        variant="default"
        stickyLastCol={true}
        rowNumber
        onRowClick={(po: any) => detail.handleViewRow(po)}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <Truck size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Belum ada PO yang siap
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                PO akan muncul setelah dijadwalkan, Pcs Kirim sesuai, dan due
                date dalam range 14 hari.
              </p>
            </div>
          </div>
        }
        className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden"
      />

      {/* ── View Detail Modal ────────────────────────────────────────────── */}
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
