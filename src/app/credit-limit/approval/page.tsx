"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  ShieldCheck,
  Layers,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Truck,
  AlertTriangle,
  AlertCircle,
  ChevronsUpDown,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DateInputHybrid from "@/components/DateInputHybrid";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList as CommandListUI,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";

type Retailer = {
  id: string;
  namaPt: string;
  inisial: string | null;
  tujuan: string | null;
};

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
type DueDateZone = "normal" | "early_extended" | "late_extended" | "out_of_range";

function getDueDateZone(expiredTgl: string | null | undefined): DueDateZone {
  if (!expiredTgl) return "out_of_range";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(expiredTgl);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - dueDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -14 || diffDays > 14) return "out_of_range";
  if (diffDays >= -14 && diffDays <= -8) return "early_extended";
  if (diffDays >= 8 && diffDays <= 14) return "late_extended";
  return "normal";
}

function getZoneLabel(zone: DueDateZone): string {
  switch (zone) {
    case "normal": return "Completed";
    case "early_extended": return "Pending";
    case "late_extended": return "Overdue";
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
      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white",
    rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 hover:bg-rose-600 dark:hover:bg-rose-500 hover:text-white dark:hover:text-white",
    slate:
      "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-600 dark:hover:bg-slate-700 hover:text-white dark:hover:text-white",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white",
    amber:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white dark:hover:text-white",
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

// ── Batch Accordion Component ────────────────────────────────────────────────
function BatchAccordion({
  batchCode,
  pos,
  isExpanded,
  isArchived,
  onToggle,
  onAction,
  onViewRow,
  onApproveAll,
  onExportExcel,
  onToggleND,
  onChecklistAllND,
}: {
  batchCode: string;
  pos: any[];
  isExpanded: boolean;
  isArchived: boolean;
  onToggle: () => void;
  onAction: (po: any, action: "approve" | "reject") => void;
  onViewRow: (po: any) => void;
  onApproveAll: (batchCode: string, pos: any[]) => void;
  onExportExcel: (batchCode: string, pos: any[]) => void;
  onToggleND: (poId: string, currentVal: boolean) => void;
  onChecklistAllND: (batchCode: string, pos: any[], checked: boolean) => void;
}) {
  const totalPcs = pos.reduce((sum, po) => sum + Number(po.pcsTotal || 0), 0);
  const totalPcsKirim = pos.reduce((sum, po) => sum + Number(po.pcsKirimTotal || 0), 0);
  const isAllNDChecked = pos.length > 0 && pos.every(p => p.isNotaDinas);

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden transition-all duration-300">
      {/* Accordion Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200 group cursor-pointer focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/30"
      >
        {/* Batch Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight whitespace-nowrap shadow-sm dark:shadow-none ${
            isArchived
              ? "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              : "bg-violet-50 text-violet-600 border border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20"
          }`}>
            <Layers size={14} className="shrink-0" />
            {batchCode}
            {isArchived && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">Completed</span>}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 ml-auto mr-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <Package size={12} className="text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
              {pos.length}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">PO</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
            <Truck size={12} className="text-indigo-400 dark:text-indigo-500" />
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {totalPcs.toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] text-indigo-400 dark:text-indigo-500 font-medium">PCS</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
            <CheckCircle2 size={12} className="text-emerald-400 dark:text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalPcsKirim.toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] text-emerald-400 dark:text-emerald-500 font-medium">Kirim</span>
          </div>

          <div className="pl-2 border-l border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChecklistAllND(batchCode, pos, !isAllNDChecked);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-200 dark:shadow-none active:scale-95"
            >
              <Check size={14} />
              {isAllNDChecked ? "Uncheck All ND" : "Check All ND"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExportExcel(batchCode, pos);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-200 dark:shadow-none active:scale-95"
            >
              <Download size={14} />
              Export
            </button>
            {!isArchived && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveAll(batchCode, pos);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 dark:bg-emerald-500/20 hover:bg-emerald-700 dark:hover:bg-emerald-500/30 text-white dark:text-emerald-400 rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-200 dark:shadow-none active:scale-95"
              >
                <CheckCircle2 size={14} />
                Approve All
              </button>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={18}
          className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 shrink-0 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Accordion Body */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-slate-100 dark:border-slate-800/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[1000px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-[50px] text-center">#</th>
                  <th className="px-4 py-3 w-[220px]">Purchase Order</th>
                  <th className="px-4 py-3 w-[140px]">Inisial</th>
                  <th className="px-4 py-3 w-[120px]">Site Area</th>
                  <th className="px-4 py-3 w-[120px]">Tujuan</th>
                  <th className="px-4 py-3 w-[110px]">Tgl PO</th>
                  <th className="px-4 py-3 w-[110px]">Due Date</th>
                  <th className="px-4 py-3 w-[120px] text-center">Tgl Kirim</th>
                  <th className="px-4 py-3 w-[60px] text-center">Pcs</th>
                  <th className="px-4 py-3 w-[90px] text-center">Pcs Kirim</th>
                  <th className="px-4 py-3 w-[130px] text-center">Kode Vendor</th>
                  <th className="px-4 py-3 w-[180px]">Remarks</th>
                  <th className="px-4 py-3 w-[50px] text-center">ND</th>
                  <th className="px-4 py-3 w-[80px] text-center">Status</th>
                  <th className="px-4 py-3 w-[90px] text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po, idx) => {
                  const zone = getDueDateZone(po.expiredTgl);
                  const isWarning = needsRemarks(zone);
                  const site = cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea);
                  const zoneLabel = getZoneLabel(zone);

                  return (
                    <tr
                      key={po.id}
                      onClick={() => onViewRow(po)}
                      className="border-t border-slate-50 dark:border-slate-800/50 hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 cursor-pointer transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">
                          {po.noPo}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                          {po.RitelModern?.namaPt || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[130px] shadow-sm dark:shadow-none">
                          {po.RitelModern?.inisial || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {site !== "-" && (
                            <MapPin size={11} className="text-slate-300 dark:text-slate-500 shrink-0" />
                          )}
                          <span className={`text-xs font-medium ${site === "-" ? "text-slate-300 dark:text-slate-600" : "text-slate-600 dark:text-slate-300"}`}>
                            {site}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[110px]" title={po.tujuanDetail || "-"}>
                          {po.tujuanDetail || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {po.tglPo ? format(new Date(po.tglPo), "dd MMM yyyy") : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs tabular-nums whitespace-nowrap font-bold ${isWarning ? "text-amber-600 dark:text-amber-500" : "text-slate-600 dark:text-slate-300"}`}>
                          {po.expiredTgl ? format(new Date(po.expiredTgl), "dd MMM yyyy") : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {po.tglkirim ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md text-[10px] font-black uppercase tracking-tight whitespace-nowrap">
                            <CalendarDays size={11} className="shrink-0" />
                            {format(new Date(po.tglkirim), "dd MMM yy")}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">
                          {Number(po.pcsTotal || 0).toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-xs font-black tabular-nums">
                          <CheckCircle2 size={11} className="shrink-0" />
                          {Number(po.pcsKirimTotal || 0).toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                          {po.kodeVendor || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic truncate max-w-[170px]" title={po.remarksCreditLimit || "-"}>
                          {po.remarksCreditLimit ? `"${po.remarksCreditLimit}"` : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={po.isNotaDinas || false}
                            onChange={() => onToggleND(po.id, po.isNotaDinas || false)}
                            className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {zone === "normal" && (
                          <StandardTooltip content={zoneLabel}>
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-full cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                              <CheckCircle2 size={16} strokeWidth={2.5} />
                            </span>
                          </StandardTooltip>
                        )}
                        {zone === "early_extended" && (
                          <StandardTooltip content={zoneLabel}>
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                              <AlertTriangle size={16} strokeWidth={2.5} />
                            </span>
                          </StandardTooltip>
                        )}
                        {zone === "late_extended" && (
                          <StandardTooltip content={zoneLabel}>
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-full cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                              <AlertCircle size={16} strokeWidth={2.5} />
                            </span>
                          </StandardTooltip>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {po.statusCreditLimit === "REQUESTED" ? (
                            <>
                              <ActionButton
                                icon={CheckCircle2}
                                onClick={(e) => { e.stopPropagation(); onAction(po, "approve"); }}
                                tooltip="Setujui Credit Limit"
                                variant="emerald"
                              />
                              <ActionButton
                                icon={X}
                                onClick={(e) => { e.stopPropagation(); onAction(po, "reject"); }}
                                tooltip="Tolak Credit Limit"
                                variant="rose"
                              />
                            </>
                          ) : po.statusCreditLimit === "APPROVED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              <CheckCircle2 size={12} /> Approved
                            </span>
                          ) : po.statusCreditLimit === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              <X size={12} /> Rejected
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CreditLimitApprovalPage() {
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [search, setSearch] = useState("");

  // -- Filter State (dropdowns) --
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedNamaPt, setSelectedNamaPt] = useState<string>("");
  const [selectedInisial, setSelectedInisial] = useState<string>("");
  const [selectedTujuan, setSelectedTujuan] = useState<string>("");

  const [openRitel, setOpenRitel] = useState(false);
  const [openInisial, setOpenInisial] = useState(false);
  const [openTujuan, setOpenTujuan] = useState(false);

  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");

  // -- Accordion State --
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const batchesPerPage = 10;

  // -- View Detail State --
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // Fetch Master Ritel (Hanya 1x saat mount)
  useEffect(() => {
    fetch("/api/ritel")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json?.data || [];
        setRetailers(list);
      })
      .catch((err) => console.error("Failed to fetch ritel:", err));
  }, []);

  // Filter inisial unik dari Nama PT yang dipilih
  const availableInisials = useMemo(() => {
    if (!selectedNamaPt) return [];
    const samePtRetailers = retailers.filter((r) => r.namaPt === selectedNamaPt);
    const inisials = samePtRetailers.map((r) => r.inisial).filter(Boolean) as string[];
    return Array.from(new Set(inisials)).sort();
  }, [selectedNamaPt, retailers]);

  // Filter tujuan unik dari Nama PT dan Inisial yang dipilih
  const availableTujuans = useMemo(() => {
    if (!selectedNamaPt) return [];
    
    const validRetailers = retailers.filter((r) => {
      if (r.namaPt !== selectedNamaPt) return false;
      if (selectedInisial && r.inisial !== selectedInisial) return false;
      return true;
    });

    const tujuans = validRetailers.map((r) => r.tujuan).filter(Boolean) as string[];
    return Array.from(new Set(tujuans)).sort();
  }, [selectedNamaPt, selectedInisial, retailers]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/po?group=credit_approval&summary=true&includeItems=false&limit=500&offset=0&sort=tglPo_desc",
        { cache: "no-store" },
      );
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // No client-side filtering needed — API already returns only REQUESTED POs.
      // This ensures POs always appear on approval page once submitted,
      // regardless of expiredTgl or other date conditions.
      setPoData(list);
    } catch (err) {
      console.error("Failed to fetch PO data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAction = async (po: any, action: "approve" | "reject") => {
    const isApprove = action === "approve";
    const result = await Swal.fire({
      title: isApprove ? "Setujui Credit Limit?" : "Tolak Credit Limit?",
      text: `PO #${po.noPo} akan di-${isApprove ? 'setujui' : 'tolak'} untuk Credit Limit.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isApprove ? "#10b981" : "#f43f5e",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: isApprove ? "Ya, Setujui!" : "Ya, Tolak!",
      cancelButtonText: "Batal",
      reverseButtons: true,
      customClass: {
        popup: "rounded-[32px] border border-slate-100 shadow-2xl p-8",
        confirmButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 shadow-lg transition-all active:scale-95",
        cancelButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 transition-all active:scale-95",
      }
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId: po.id, action, remarks: "" }),
      });

      if (!res.ok) {
        throw new Error("Gagal memproses credit limit");
      }

      Swal.fire({
        icon: "success",
        title: isApprove ? "Berhasil Disetujui!" : "Berhasil Ditolak!",
        timer: 1500,
        showConfirmButton: false,
      });

      setPoData((prev) =>
        prev.map((item) =>
          item.id === po.id
            ? { ...item, statusCreditLimit: action === "approve" ? "APPROVED" : "REJECTED" }
            : item
        )
      );
    } catch (err) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Terjadi kesalahan sistem" });
    }
  };

  const handleToggleND = async (poId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Optimistic UI update
    setPoData((prev) =>
      prev.map((item) =>
        item.id === poId ? { ...item, isNotaDinas: newVal } : item
      )
    );

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, action: "toggleND", isNotaDinas: newVal }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan status ND");
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan status ND. Silakan coba lagi.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000
      });
      // Revert optimistic update
      setPoData((prev) =>
        prev.map((item) =>
          item.id === poId ? { ...item, isNotaDinas: currentVal } : item
        )
      );
    }
  };

  const handleApproveAll = async (batchCode: string, pos: any[]) => {
    const result = await Swal.fire({
      title: "Approve Semua PO?",
      text: `Anda akan menyetujui ${pos.length} PO dalam batch ${batchCode}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Setujui Semua!",
      cancelButtonText: "Batal",
      reverseButtons: true,
      customClass: {
        popup: "rounded-[32px] border border-slate-100 shadow-2xl p-8",
        confirmButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 shadow-lg transition-all active:scale-95",
        cancelButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 transition-all active:scale-95",
      }
    });

    if (!result.isConfirmed) return;

    try {
      const poIds = pos.map((po) => po.id);
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poIds, action: "approveAll" }),
      });

      if (!res.ok) {
        throw new Error("Gagal memproses credit limit");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil Disetujui!",
        text: `${pos.length} PO telah disetujui.`,
        timer: 1500,
        showConfirmButton: false,
      });

      setPoData((prev) =>
        prev.map((item) =>
          poIds.includes(item.id)
            ? { ...item, statusCreditLimit: "APPROVED" }
            : item
        )
      );
    } catch (err) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Terjadi kesalahan sistem" });
    }
  };

  useEffect(() => {
    import("@/lib/me").then(({ getMe }) => {
      getMe().then((me) => {
        setRole(me?.role || "");
        if (me?.role === "pusat") {
          fetchData();
        } else {
          setLoading(false);
        }
      });
    });
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

  // ── Filtered PO (same filters as before, minus card filter) ──
  const filteredPo = useMemo(() => {
    let result = poData;

    // Filter berdasarkan Combobox (Ritel, Inisial, Tujuan)
    if (selectedNamaPt) {
      result = result.filter((po) => po.RitelModern?.namaPt === selectedNamaPt);
    }
    if (selectedInisial) {
      result = result.filter((po) => po.RitelModern?.inisial === selectedInisial);
    }
    if (selectedTujuan) {
      result = result.filter((po) => po.tujuanDetail === selectedTujuan);
    }

    // Filter berdasarkan Periode (tglPo)
    if (tglFrom) {
      const fromDate = new Date(tglFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((po) => new Date(po.tglPo) >= fromDate);
    }
    if (tglTo) {
      const toDate = new Date(tglTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((po) => new Date(po.tglPo) <= toDate);
    }

    // Filter berdasarkan Search Bar
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((po) => {
        const siteArea = String(po.UnitProduksi?.siteArea || po.siteArea || "").toLowerCase();
        const company = String(po.RitelModern?.namaPt || po.company || "").toLowerCase();
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
    }

    return result;
  }, [poData, search, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);

  // ── Group PO by Batch ──
  const batchGroups = useMemo(() => {
    const map = new Map<string, { batchCode: string; pos: any[]; isArchived: boolean }>();
    filteredPo.forEach((po) => {
      const code = po.CreditLimitBatch?.batchCode || "Tanpa Batch";
      if (!map.has(code)) map.set(code, { batchCode: code, pos: [], isArchived: true });
      const group = map.get(code)!;
      group.pos.push(po);
      if (po.statusCreditLimit === "REQUESTED") {
        group.isArchived = false;
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.isArchived && !b.isArchived) return 1;
      if (!a.isArchived && b.isArchived) return -1;
      return b.batchCode.localeCompare(a.batchCode);
    });
  }, [filteredPo]);

  // ── Paginate Batches ──
  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * batchesPerPage;
    return batchGroups.slice(startIndex, startIndex + batchesPerPage);
  }, [batchGroups, currentPage]);

  const totalPages = Math.ceil(batchGroups.length / batchesPerPage);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);

  // Toggle accordion
  const toggleBatch = (batchCode: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchCode)) {
        next.delete(batchCode);
      } else {
        next.add(batchCode);
      }
      return next;
    });
  };

  const handleChecklistAllND = async (batchCode: string, posToToggle: any[], checked: boolean) => {
    const poIds = posToToggle.map((po) => po.id);
    
    // Optimistic UI update
    setPoData((prev) =>
      prev.map((item) =>
        poIds.includes(item.id) ? { ...item, isNotaDinas: checked } : item
      )
    );

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poIds, action: "toggleAllND", isNotaDinas: checked }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan status ND massal");
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan status ND. Silakan coba lagi.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000
      });
      // Revert optimistic update
      setPoData((prev) =>
        prev.map((item) => {
          if (poIds.includes(item.id)) {
            return { ...item, isNotaDinas: !checked };
          }
          return item;
        })
      );
    }
  };

  const handleExportExcel = (batchCode: string, posToExport: any[]) => {
    if (!posToExport || posToExport.length === 0) {
      Swal.fire({
        title: "Info",
        text: "Tidak ada data untuk diexport",
        icon: "info"
      });
      return;
    }

    const dataToExport = posToExport.map((po, index) => {
      const company = po.RitelModern?.namaPt || po.company || "-";
      return {
        "No": index + 1,
        "Batch": po.CreditLimitBatch?.batchCode || "Tanpa Batch",
        "No PO": po.noPo || "-",
        "Company": company,
        "Inisial": po.RitelModern?.inisial || "-",
        "Site Area": cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea),
        "Tujuan": po.tujuanDetail || po.RitelModern?.tujuan || "-",
        "Tgl PO": po.tglPo ? format(new Date(po.tglPo), "dd/MM/yyyy") : "-",
        "Due Date": po.expiredTgl ? format(new Date(po.expiredTgl), "dd/MM/yyyy") : "-",
        "Tgl Kirim": po.tglkirim ? format(new Date(po.tglkirim), "dd/MM/yyyy") : "-",
        "Pcs Total": Number(po.pcsTotal || 0),
        "Pcs Kirim": Number(po.pcsKirimTotal || 0),
        "Nominal": Number(po.totalNominal || 0),
        "Kode Vendor": po.kodeVendor || "-",
        "Remarks": po.remarksCreditLimit || "-",
        "ND": po.isNotaDinas ? "true" : "false",
        "Status": po.statusCreditLimit || "-",
      };
    });

    // Sub Total row
    const totalPcsSum = dataToExport.reduce((sum, r) => sum + (Number(r["Pcs Total"]) || 0), 0);
    const totalPcsKirimSum = dataToExport.reduce((sum, r) => sum + (Number(r["Pcs Kirim"]) || 0), 0);
    const totalNominalSum = dataToExport.reduce((sum, r) => sum + (Number(r["Nominal"]) || 0), 0);

    dataToExport.push({
      "No": "" as any,
      "Batch": "",
      "No PO": "",
      "Company": "",
      "Inisial": "",
      "Site Area": "",
      "Tujuan": "",
      "Tgl PO": "",
      "Due Date": "",
      "Tgl Kirim": "SUB TOTAL",
      "Pcs Total": totalPcsSum,
      "Pcs Kirim": totalPcsKirimSum,
      "Nominal": totalNominalSum,
      "Kode Vendor": "",
      "Remarks": "",
      "ND": "",
      "Status": "",
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 4 },   // No
      { wch: 16 },  // Batch
      { wch: 18 },  // No PO
      { wch: 25 },  // Company
      { wch: 12 },  // Inisial
      { wch: 18 },  // Site Area
      { wch: 18 },  // Tujuan
      { wch: 12 },  // Tgl PO
      { wch: 12 },  // Due Date
      { wch: 12 },  // Tgl Kirim
      { wch: 10 },  // Pcs Total
      { wch: 10 },  // Pcs Kirim
      { wch: 16 },  // Nominal
      { wch: 14 },  // Kode Vendor
      { wch: 25 },  // Remarks
      { wch: 12 },  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Approval PO");
    
    const safeBatchCode = batchCode.replace(/[^a-zA-Z0-9-]/g, "_");
    XLSX.writeFile(workbook, `Export_${safeBatchCode}_${format(new Date(), "dd-MMM-yyyy")}.xlsx`);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-7">
      {role !== "pusat" && !loading && (
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

        {/* Search bar */}
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Search No PO, Site, Company..."
            className="pl-9 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500/40 transition-all w-full md:w-72 shadow-sm dark:shadow-none text-slate-700 dark:text-slate-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Dropdown 1: Ritel */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ritel Modern</label>
          <Popover open={openRitel} onOpenChange={setOpenRitel}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openRitel}
                className="w-full justify-between bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 h-12 rounded-xl shadow-sm dark:shadow-none transition-all"
              >
                <span className={!selectedNamaPt ? "text-slate-400 dark:text-slate-500 font-normal truncate" : "font-bold truncate"}>
                  {selectedNamaPt || "Semua Ritel..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverPrimitive.Portal>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white dark:bg-slate-800" align="start">
                <Command className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CommandInput placeholder="Cari ritel..." className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium bg-white dark:bg-slate-800" />
                  <CommandListUI className="max-h-64 scrollbar-hide">
                    <CommandEmpty className="text-slate-500 py-4 text-center">Ritel tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedNamaPt("");
                          setSelectedInisial("");
                          setSelectedTujuan("");
                          setOpenRitel(false);
                        }}
                        className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedNamaPt === "" ? "opacity-100" : "opacity-0")} />
                        Semua Ritel
                      </CommandItem>
                      {Array.from(new Set(retailers.map((r) => r.namaPt))).sort((a, b) => a.localeCompare(b)).map((namaPt) => (
                        <CommandItem
                          key={namaPt}
                          value={namaPt}
                          className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                          onSelect={() => {
                            setSelectedNamaPt(namaPt);
                            setSelectedInisial("");
                            setSelectedTujuan("");
                            setOpenRitel(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedNamaPt === namaPt ? "opacity-100" : "opacity-0")} />
                          {namaPt}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandListUI>
                </Command>
              </PopoverContent>
            </PopoverPrimitive.Portal>
          </Popover>
        </div>

        {/* Dropdown 2: Inisial */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inisial</label>
          <Popover open={openInisial} onOpenChange={setOpenInisial}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                disabled={!selectedNamaPt}
                aria-expanded={openInisial}
                className="w-full justify-between bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 h-12 rounded-xl shadow-sm dark:shadow-none transition-all disabled:opacity-50"
              >
                <span className={!selectedInisial ? "text-slate-400 dark:text-slate-500 font-normal truncate" : "font-bold truncate"}>
                  {selectedInisial || "Semua Inisial..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverPrimitive.Portal>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white dark:bg-slate-800" align="start">
                <Command className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CommandInput placeholder="Cari inisial..." className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium bg-white dark:bg-slate-800" />
                  <CommandListUI className="max-h-64 scrollbar-hide">
                    <CommandEmpty className="text-slate-500 py-4 text-center">Inisial tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedInisial("");
                          setSelectedTujuan("");
                          setOpenInisial(false);
                        }}
                        className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedInisial === "" ? "opacity-100" : "opacity-0")} />
                        Semua Inisial
                      </CommandItem>
                      {availableInisials.map((ini) => (
                        <CommandItem
                          key={ini}
                          value={ini}
                          onSelect={() => {
                            setSelectedInisial(ini);
                            setSelectedTujuan("");
                            setOpenInisial(false);
                          }}
                          className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedInisial === ini ? "opacity-100" : "opacity-0")} />
                          {ini}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandListUI>
                </Command>
              </PopoverContent>
            </PopoverPrimitive.Portal>
          </Popover>
        </div>

        {/* Dropdown 3: Tujuan Detail */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tujuan Detail</label>
          <Popover open={openTujuan} onOpenChange={setOpenTujuan}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                disabled={!selectedNamaPt}
                aria-expanded={openTujuan}
                className="w-full justify-between bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 h-12 rounded-xl shadow-sm dark:shadow-none transition-all disabled:opacity-50"
              >
                <span className={!selectedTujuan ? "text-slate-400 dark:text-slate-500 font-normal truncate" : "font-bold truncate"}>
                  {selectedTujuan || "Semua Tujuan..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverPrimitive.Portal>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-white dark:bg-slate-800" align="start">
                <Command className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CommandInput placeholder="Cari tujuan..." className="!text-slate-900 dark:!text-slate-100 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 font-medium bg-white dark:bg-slate-800" />
                  <CommandListUI className="max-h-64 scrollbar-hide">
                    <CommandEmpty className="text-slate-500 py-4 text-center">Tujuan tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedTujuan("");
                          setOpenTujuan(false);
                        }}
                        className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedTujuan === "" ? "opacity-100" : "opacity-0")} />
                        Semua Tujuan
                      </CommandItem>
                      {availableTujuans.map((tujuan) => (
                        <CommandItem
                          key={tujuan}
                          value={tujuan}
                          onSelect={() => {
                            setSelectedTujuan(tujuan);
                            setOpenTujuan(false);
                          }}
                          className="!text-slate-900 dark:!text-slate-100 font-medium cursor-pointer aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700 aria-selected:!text-slate-900 dark:aria-selected:!text-slate-100 flex items-center px-4 py-2"
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedTujuan === tujuan ? "opacity-100" : "opacity-0")} />
                          {tujuan}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandListUI>
                </Command>
              </PopoverContent>
            </PopoverPrimitive.Portal>
          </Popover>
        </div>

        {/* Date Filters */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Periode Tgl PO
          </label>
          <div className="flex flex-col xl:flex-row xl:items-center gap-2">
            <DateInputHybrid value={tglFrom} onChange={setTglFrom} placeholder="Dari..." />
            <span className="hidden xl:inline text-slate-300 dark:text-slate-600">-</span>
            <DateInputHybrid value={tglTo} onChange={setTglTo} placeholder="Sampai..." />
          </div>
        </div>
      </div>

      {/* ── Accordion List ──────────────────────────────────────────── */}
      {loading ? (
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
      ) : batchGroups.length === 0 ? (
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
          {paginatedBatches.map((batch) => (
            <BatchAccordion
              key={batch.batchCode}
              batchCode={batch.batchCode}
              pos={batch.pos}
              isExpanded={expandedBatches.has(batch.batchCode)}
              isArchived={batch.isArchived}
              onToggle={() => toggleBatch(batch.batchCode)}
              onAction={handleAction}
              onViewRow={handleViewRow}
              onApproveAll={handleApproveAll}
              onExportExcel={handleExportExcel}
              onToggleND={handleToggleND}
              onChecklistAllND={handleChecklistAllND}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none px-6 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan <span className="font-bold text-slate-700 dark:text-slate-200">{paginatedBatches.length}</span> dari{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{batchGroups.length}</span> batch
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  page === currentPage
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/50"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ──────────────────────────────────────── */}
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
