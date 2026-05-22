"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DataTable } from "@/components/data-table";
import {
  Search,
  ShieldCheck,
  Eye,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import PODetailModal from "@/components/po-detail-modal";
import Swal from "sweetalert2";

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

// ── Due Date Zone Helper ────────────────────────────────────────────────────
// Determines which zone a PO falls into based on its due date relative to today.
//
// Timeline (example due date = 28 May):
//   14 May ──── 20 May ──── 21 May ──── 28 May ──── 4 Jun ──── 5 Jun ──── 11 Jun
//   |-- EARLY EXTENDED --|-- NORMAL --------------------------------|-- LATE EXTENDED --|
//   |  needs remarks     |  no remarks needed                       |  needs remarks    |
//
// Returns:
//   "normal"         → within 7 days before to 7 days after due date (no remarks)
//   "early_extended"  → 8-14 days before due date (needs remarks: terlambat ajukan)
//   "late_extended"   → 8-14 days after due date (needs remarks: baru ajukan)
//   "out_of_range"    → outside the 14-day window (should not be shown)
type DueDateZone = "normal" | "early_extended" | "late_extended" | "out_of_range";

function getDueDateZone(expiredTgl: string | null | undefined): DueDateZone {
  if (!expiredTgl) return "out_of_range";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(expiredTgl);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - dueDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  // diffDays: negative = today is BEFORE due date, positive = today is AFTER due date

  // Before due date: diffDays is negative
  // After due date: diffDays is positive
  if (diffDays < -14 || diffDays > 14) return "out_of_range";
  if (diffDays >= -14 && diffDays <= -8) return "early_extended";
  if (diffDays >= 8 && diffDays <= 14) return "late_extended";
  return "normal"; // diffDays >= -7 && diffDays <= 7
}

function getZoneLabel(zone: DueDateZone): string {
  switch (zone) {
    case "normal": return "Siap Ajukan";
    case "early_extended": return "Terlambat";
    case "late_extended": return "Lewat Jatuh Tempo";
    default: return "-";
  }
}

function needsRemarks(zone: DueDateZone): boolean {
  return zone === "early_extended" || zone === "late_extended";
}

// ── Tooltip Component ────────────────────────────────────────────────────────
function StandardTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  if (!content || content === "-") return <>{children}</>;
  return (
    <div className="group/tooltip relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl border border-slate-700">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}

// ── Action Button with Tooltip ───────────────────────────────────────────────
function ActionButton({
  icon: Icon,
  onClick,
  tooltip,
  variant = "indigo",
  disabled = false,
  loading = false,
}: {
  icon: any;
  onClick: (e: any) => void;
  tooltip: string;
  variant?: "indigo" | "rose" | "slate" | "emerald" | "amber";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bgColors = {
    indigo:
      "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white",
    rose: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white",
    slate:
      "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-600 hover:text-white",
    emerald:
      "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white",
    amber:
      "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white",
  };

  return (
    <StandardTooltip content={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`p-2.5 rounded-xl border transition-all duration-200 shadow-sm active:scale-90 flex items-center justify-center ${bgColors[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon size={16} strokeWidth={2.5} />
        )}
      </button>
    </StandardTooltip>
  );
}

export default function CreditLimitDataPage() {
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // -- Filter State (cards) --
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "outdate">("all");

  // -- View Detail State --
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // -- Pagination State --
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/po?group=active&summary=true&includeItems=false&limit=500&offset=0&sort=tglPo_desc",
        { cache: "no-store" },
      );
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // Filter:
      // 1. Sudah dijadwalkan (tglkirim ada)
      // 2. pcsKirimTotal >= pcsTotal (pengiriman lengkap)
      // 3. Due date (expiredTgl) dalam range 14 hari sebelum/sesudah hari ini
      const eligible = list.filter((po: any) => {
        const isScheduled = !!po.tglkirim;
        const pcsKirim = Number(po.pcsKirimTotal || 0);
        const pcsTotal = Number(po.pcsTotal || 0);
        const pcsMatch = pcsTotal > 0 && pcsKirim >= pcsTotal;
        const zone = getDueDateZone(po.expiredTgl);
        return isScheduled && pcsMatch && zone !== "out_of_range";
      });

      setPoData(eligible);
    } catch (err) {
      console.error("Failed to fetch PO data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewRow = async (po: any) => {
    setDetailData(po);
    setIsViewOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/po?noPo=${encodeURIComponent(po.noPo)}&includeItems=true&limit=1`,
        { cache: "no-store" },
      );
      const data = await res.json();
      const first = Array.isArray(data?.data)
        ? data.data[0]
        : Array.isArray(data)
          ? data[0]
          : null;
      if (first) {
        setDetailData(first);
      }
    } catch (err) {
      console.error("Failed to fetch detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAjukanCreditLimit = async (po: any) => {
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
            </div>
            <div class="space-y-1.5 mt-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">${remarksLabel} <span class="text-rose-500">*</span></label>
              <textarea id="cl-remarks" class="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none h-24" placeholder="Jelaskan alasan pengajuan..."></textarea>
            </div>
          `
              : `
            <div class="flex items-center gap-2 mt-3 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              <span class="text-xs text-indigo-600 font-semibold">Pengiriman sudah sesuai & siap diproses</span>
            </div>
          `
          }
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
        if (remarksRequired) {
          const remarks = (
            document.getElementById("cl-remarks") as HTMLTextAreaElement
          )?.value;
          if (!remarks || !remarks.trim()) {
            Swal.showValidationMessage("Mohon isi alasan pengajuan");
            return false;
          }
          return { remarks: remarks.trim() };
        }
        return { remarks: null };
      },
    });

    if (!result.isConfirmed) return;

    const { remarks } = result.value as { remarks: string | null };

    // TODO: Implement actual credit limit submission API call
    // Example payload: { poId: po.id, noPo: po.noPo, zone, remarks }
    console.log("Credit Limit submission:", {
      poId: po.id,
      noPo: po.noPo,
      zone,
      remarks,
    });

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
  };

  const filteredPo = useMemo(() => {
    // Tahap 1: Filter berdasarkan Card yang diklik
    let categoryFiltered = poData;
    if (activeFilter === "pending") {
      categoryFiltered = poData.filter(
        (po) => getDueDateZone(po.expiredTgl) === "normal",
      );
    } else if (activeFilter === "outdate") {
      categoryFiltered = poData.filter((po) =>
        needsRemarks(getDueDateZone(po.expiredTgl)),
      );
    }

    // Tahap 2: Filter berdasarkan Search Bar
    if (!search.trim()) return categoryFiltered;

    const query = search.toLowerCase();
    return categoryFiltered.filter((po) => {
      const siteArea = String(
        po.UnitProduksi?.siteArea || po.siteArea || "",
      ).toLowerCase();
      const company = String(
        po.RitelModern?.namaPt || po.company || "",
      ).toLowerCase();
      const inisial = String(po.RitelModern?.inisial || "").toLowerCase();
      const noPo = String(po.noPo || "").toLowerCase();
      const noInvoice = String(po.noInvoice || "").toLowerCase();
      return (
        siteArea.includes(query) ||
        company.includes(query) ||
        inisial.includes(query) ||
        noPo.includes(query) ||
        noInvoice.includes(query)
      );
    });
  }, [poData, activeFilter, search]);

  // Reset pagination to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter]);

  // Compute paginated slice
  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPo.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPo, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPo.length / itemsPerPage);

  // Stats for info banner
  const stats = useMemo(() => {
    const normal = poData.filter(
      (po) => getDueDateZone(po.expiredTgl) === "normal",
    ).length;
    const remarksNeeded = poData.filter((po) =>
      needsRemarks(getDueDateZone(po.expiredTgl)),
    ).length;
    return { total: poData.length, normal, remarksNeeded };
  }, [poData]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-7">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Credit Limit — Data PO
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Daftar PO yang sudah dijadwalkan dan pengiriman lengkap, siap untuk
            pengajuan credit limit.
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
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all w-full md:w-72 shadow-sm text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            id: "all" as const,
            label: "Total Credit Limit",
            value: stats.total,
            icon: <ShieldCheck size={18} className="text-blue-500" />,
            bg: "bg-blue-50",
            text: "text-blue-600",
            ring: "ring-blue-500",
          },
          {
            id: "pending" as const,
            label: "Total Pending Credit Limit",
            value: stats.normal,
            icon: <ShieldCheck size={18} className="text-indigo-500" />,
            bg: "bg-indigo-50",
            text: "text-indigo-600",
            ring: "ring-indigo-500",
          },
          {
            id: "outdate" as const,
            label: "Total Outdate Credit Limit",
            value: stats.remarksNeeded,
            icon: <AlertTriangle size={18} className="text-amber-500" />,
            bg: "bg-amber-50",
            text: "text-amber-600",
            ring: "ring-amber-500",
          },
        ].map((stat) => (
          <div
            key={stat.id}
            onClick={() => setActiveFilter(stat.id)}
            className={`cursor-pointer bg-white px-5 py-4 rounded-2xl border border-slate-100 flex items-center gap-4 transition-all duration-200 ${
              activeFilter === stat.id
                ? `ring-2 ${stat.ring} shadow-md scale-[1.02]`
                : "hover:bg-slate-50 shadow-sm"
            }`}
          >
            <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <DataTable
        columns={[
          {
            key: "noPo",
            label: "Purchase Order",
            width: "w-[260px]",
            render: (_v: any, po: any) => (
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">
                  {po.noPo}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[230px]">
                  {po.RitelModern?.namaPt || "-"}
                </p>
              </div>
            ),
          },
          {
            key: "inisial",
            label: "Inisial",
            width: "w-[90px]",
            render: (_v: any, po: any) => (
              <StandardTooltip content={po.RitelModern?.inisial || "-"}>
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] shadow-sm cursor-pointer">
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
              const site = cleanSiteArea(
                po.UnitProduksi?.siteArea || po.siteArea,
              );
              return (
                <div className="flex items-center gap-1.5">
                  {site !== "-" && (
                    <MapPin size={11} className="text-slate-300 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium ${site === "-" ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {site}
                  </span>
                </div>
              );
            },
          },
          {
            key: "tujuanDetail",
            label: "Tujuan",
            width: "w-[200px]",
            render: (_v: any, po: any) => (
              <p
                className="text-xs text-slate-600 font-medium truncate max-w-[200px]"
                title={po.tujuanDetail || "-"}
              >
                {po.tujuanDetail || "-"}
              </p>
            ),
          },
          {
            key: "tglPo",
            label: "Tgl PO",
            width: "w-[120px]",
            render: (_v: any, po: any) => (
              <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                {po.tglPo
                  ? format(new Date(po.tglPo), "dd MMM yyyy")
                  : "-"}
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
                <span
                  className={`text-xs tabular-nums whitespace-nowrap font-bold ${
                    isWarning ? "text-amber-600" : "text-slate-600"
                  }`}
                >
                  {po.expiredTgl
                    ? format(new Date(po.expiredTgl), "dd MMM yyyy")
                    : "-"}
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
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[10px] font-black uppercase tracking-tight">
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
              <span className="font-bold text-slate-600 text-xs">
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
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-black tabular-nums">
                  <CheckCircle2 size={11} className="shrink-0" />
                  {Number(po.pcsKirimTotal || 0).toLocaleString("id-ID")}
                </span>
              </div>
            ),
          },
          {
            key: "zone",
            label: "Status",
            align: "center" as const,
            width: "w-[140px]",
            render: (_v: any, po: any) => {
              const zone = getDueDateZone(po.expiredTgl);
              const label = getZoneLabel(zone);

              if (zone === "normal") {
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    <CheckCircle2 size={11} />
                    {label}
                  </span>
                );
              }

              return (
                <StandardTooltip
                  content={
                    zone === "early_extended"
                      ? "Perlu remarks: terlambat mengajukan"
                      : "Perlu remarks: baru mengajukan"
                  }
                >
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-help">
                    <AlertTriangle size={11} />
                    {label}
                  </span>
                </StandardTooltip>
              );
            },
          },
          {
            key: "actions",
            label: "Action",
            align: "center" as const,
            width: "w-[130px]",
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
                      needsRemarks(zone)
                        ? "Ajukan Credit Limit (Perlu Remarks)"
                        : "Ajukan Credit Limit"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAjukanCreditLimit(po);
                    }}
                    variant={needsRemarks(zone) ? "amber" : "indigo"}
                  />

                  <ActionButton
                    icon={Eye}
                    tooltip="Lihat Detail PO"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewRow(po);
                    }}
                    variant="slate"
                  />
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
        emptyState={
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <Truck size={28} className="text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Belum ada PO yang siap
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                PO akan muncul setelah dijadwalkan, Pcs Kirim sesuai, dan due
                date dalam range 14 hari.
              </p>
            </div>
          </div>
        }
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      />

      {/* ── View Detail Modal ────────────────────────────────────────────── */}
      <PODetailModal
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setDetailData(null);
        }}
        data={
          detailData
            ? {
                ...detailData,
                buktiKirim: detailData.buktiKirim,
                buktiFp: detailData.buktiFp,
                status: {
                  kirim: !!detailData.statusKirim,
                  sdif: !!detailData.statusSdif,
                  po: !!detailData.statusPo,
                  fp: !!detailData.statusFp,
                  kwi: !!detailData.statusKwi,
                  inv: !!detailData.statusInv,
                  tagih: !!detailData.statusTagih,
                  bayar: !!detailData.statusBayar,
                },
              }
            : null
        }
      />
    </div>
  );
}
