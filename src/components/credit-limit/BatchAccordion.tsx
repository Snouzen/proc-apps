"use client";

import {
  Layers,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Truck,
  ChevronDown,
  Package,
  Download,
  Check,
  X,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { cleanSiteArea, getDueDateZone, getZoneLabel, needsRemarks } from "@/lib/credit-limit";
import { StandardTooltip } from "./StandardTooltip";
import { ActionButton } from "./ActionButton";
import { StatusBadge } from "./StatusBadge";

export function BatchAccordion({
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
  onAction: (po: any, action: "approve" | "approveDireksi" | "reject" | "reRequest") => void;
  onViewRow: (po: any) => void;
  onApproveAll: (batchCode: string, pos: any[]) => void;
  onExportExcel: (batchCode: string, pos: any[]) => void;
  onToggleND: (poId: string, currentVal: boolean) => void;
  onChecklistAllND: (batchCode: string, pos: any[], checked: boolean) => void;
}) {
  const totalPcs = pos.reduce((sum, po) => sum + Number(po.pcsTotal || 0), 0);
  const totalPcsKirim = pos.reduce((sum, po) => sum + Number(po.pcsKirimTotal || 0), 0);
  const isAllNDChecked = pos.length > 0 && pos.every(p => p.isNotaDinas);
  
  const hasRequested = pos.some((po) => po.statusCreditLimit === "REQUESTED");
  const hasApproved = pos.some((po) => po.statusCreditLimit === "APPROVED");

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
            {hasRequested ? (
              <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                Waiting Pusat
              </span>
            ) : hasApproved ? (
              <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                Waiting Direksi
              </span>
            ) : (
              <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                Completed
              </span>
            )}
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
            {!isArchived && pos.some(p => p.statusCreditLimit === "REQUESTED") && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveAll(batchCode, pos);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 dark:bg-emerald-500/20 hover:bg-emerald-700 dark:hover:bg-emerald-500/30 text-white dark:text-emerald-400 rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-200 dark:shadow-none active:scale-95"
              >
                <CheckCircle2 size={14} />
                Approve Semua (Pusat)
              </button>
            )}
            {!isArchived && !pos.some(p => p.statusCreditLimit === "REQUESTED") && pos.some(p => p.statusCreditLimit === "APPROVED") && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveAll(batchCode, pos);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500/20 hover:bg-indigo-700 dark:hover:bg-indigo-500/30 text-white dark:text-indigo-400 rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-200 dark:shadow-none active:scale-95"
              >
                <CheckCircle2 size={14} />
                Approve Semua (Direksi)
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
                        <StatusBadge status={po.statusCreditLimit} />
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
                            <>
                              <ActionButton
                                icon={CheckCircle2}
                                onClick={(e) => { e.stopPropagation(); onAction(po, "approveDireksi"); }}
                                tooltip="Setujui Credit Limit (Direksi)"
                                variant="indigo"
                              />
                              <ActionButton
                                icon={X}
                                onClick={(e) => { e.stopPropagation(); onAction(po, "reject"); }}
                                tooltip="Tolak Credit Limit"
                                variant="rose"
                              />
                            </>
                          ) : po.statusCreditLimit === "APPROVED_DIREKSI" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              <CheckCircle2 size={12} /> Approved (Direksi)
                            </span>
                          ) : po.statusCreditLimit === "REJECTED" ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                <X size={12} /> Rejected
                              </span>
                              <ActionButton
                                icon={CheckCircle2}
                                onClick={(e) => { e.stopPropagation(); onAction(po, "reRequest"); }}
                                tooltip="Ajukan Ulang"
                                variant="emerald"
                              />
                            </>
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
