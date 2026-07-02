"use client";

import { useState, useMemo } from "react";
import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { createColumnHelper } from "@tanstack/react-table";

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
  ExternalLink,
  Edit3,
  Lock,
  Unlock,
} from "lucide-react";
import { format } from "date-fns";
import { cleanSiteArea, getDueDateZone, getZoneLabel, needsRemarks } from "@/lib/credit-limit";
import { StandardTooltip } from "./StandardTooltip";
import { ActionButton } from "./ActionButton";
import { StatusBadge } from "./StatusBadge";

const helper = createColumnHelper<any>();

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
  onUpdateNDDetails,
  isBatchOpen,
  onCloseBatch,
  isBatchUncloseable,
  onUncloseBatch,
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
  onUpdateNDDetails: (poId: string, noNd: string, linkNd: string) => void;
  isBatchOpen?: boolean;
  onCloseBatch?: (batchCode: string) => void;
  isBatchUncloseable?: boolean;
  onUncloseBatch?: (batchCode: string) => void;
}) {
  const [editNdId, setEditNdId] = useState<string | null>(null);
  const [tempNoNd, setTempNoNd] = useState("");
  const [tempLinkNd, setTempLinkNd] = useState("");

  const totalPcs = pos.reduce((sum, po) => sum + Number(po.pcsTotal || 0), 0);
  const totalPcsKirim = pos.reduce((sum, po) => sum + Number(po.pcsKirimTotal || 0), 0);
  const isAllNDChecked = pos.length > 0 && pos.every(p => p.isNotaDinas);
  
  const hasRequested = pos.some((po) => po.statusCreditLimit === "REQUESTED");
  const hasApproved = pos.some((po) => po.statusCreditLimit === "APPROVED");

  // eslint-disable-next-line react-compiler/react-compiler
  const columns = useMemo(() => [
    helper.display({
      id: "no",
      header: "NO",
      size: 50,
      meta: { align: "center" },
      cell: ({ row }) => (
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {row.index + 1}
        </span>
      ),
    }),
    helper.accessor("noPo", {
      header: "PURCHASE ORDER",
      size: 220,
      cell: ({ row }) => {
        const po = row.original;
        return (
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">
              {po.noPo}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
              {po.RitelModern?.namaPt || "-"}
            </p>
          </div>
        );
      },
    }),
    helper.accessor((row) => row.RitelModern?.inisial, {
      id: "inisial",
      header: "INISIAL",
      size: 140,
      cell: ({ row }) => (
        <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[130px] shadow-sm dark:shadow-none">
          {row.original.RitelModern?.inisial || "-"}
        </span>
      ),
    }),
    helper.accessor("siteArea", {
      header: "SITE AREA",
      size: 120,
      cell: ({ row }) => {
        const po = row.original;
        const site = cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea);
        return (
          <div className="flex items-center gap-1.5">
            {site !== "-" && (
              <MapPin size={11} className="text-slate-300 dark:text-slate-500 shrink-0" />
            )}
            <span className={`text-xs font-medium ${site === "-" ? "text-slate-300 dark:text-slate-600" : "text-slate-600 dark:text-slate-300"}`}>
              {site}
            </span>
          </div>
        );
      },
    }),
    helper.accessor("tujuanDetail", {
      header: "TUJUAN",
      size: 120,
      cell: ({ row }) => (
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[110px]" title={row.original.tujuanDetail || "-"}>
          {row.original.tujuanDetail || "-"}
        </p>
      ),
    }),
    helper.accessor("tglPo", {
      header: "TGL PO",
      size: 110,
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
          {row.original.tglPo ? format(new Date(row.original.tglPo), "dd MMM yyyy") : "-"}
        </span>
      ),
    }),
    helper.accessor("expiredTgl", {
      header: "DUE DATE",
      size: 110,
      cell: ({ row }) => {
        const po = row.original;
        const zone = getDueDateZone(po.expiredTgl);
        const isWarning = needsRemarks(zone);
        return (
          <span className={`text-xs tabular-nums whitespace-nowrap font-bold ${isWarning ? "text-amber-600 dark:text-amber-500" : "text-slate-600 dark:text-slate-300"}`}>
            {po.expiredTgl ? format(new Date(po.expiredTgl), "dd MMM yyyy") : "-"}
          </span>
        );
      },
    }),
    helper.accessor("tglkirim", {
      header: "TGL KIRIM",
      size: 120,
      meta: { align: "center" },
      cell: ({ row }) => {
        const po = row.original;
        return po.tglkirim ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md text-[10px] font-black uppercase tracking-tight whitespace-nowrap">
            <CalendarDays size={11} className="shrink-0" />
            {format(new Date(po.tglkirim), "dd MMM yy")}
          </div>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">-</span>
        );
      },
    }),
    helper.accessor("pcsTotal", {
      header: "PCS",
      size: 60,
      meta: { align: "center" },
      cell: ({ row }) => (
        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">
          {Number(row.original.pcsTotal || 0).toLocaleString("id-ID")}
        </span>
      ),
    }),
    helper.accessor("pcsKirimTotal", {
      header: "PCS KIRIM",
      size: 90,
      meta: { align: "center" },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-xs font-black tabular-nums">
          <CheckCircle2 size={11} className="shrink-0" />
          {Number(row.original.pcsKirimTotal || 0).toLocaleString("id-ID")}
        </span>
      ),
    }),
    helper.accessor("kodeVendor", {
      header: "KODE VENDOR",
      size: 130,
      meta: { align: "center" },
      cell: ({ row }) => (
        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
          {row.original.kodeVendor || "-"}
        </span>
      ),
    }),
    helper.accessor("remarksCreditLimit", {
      header: "REMARKS",
      size: 180,
      cell: ({ row }) => (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic truncate max-w-[170px]" title={row.original.remarksCreditLimit || "-"}>
          {row.original.remarksCreditLimit ? `"${row.original.remarksCreditLimit}"` : "-"}
        </p>
      ),
    }),
    helper.accessor("isNotaDinas", {
      header: "ND",
      size: 50,
      meta: { align: "center" },
      cell: ({ row, table }) => {
        const meta = table.options.meta as any;
        const po = row.original;
        return (
          <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={po.isNotaDinas || false}
              onChange={() => meta?.onToggleND(po.id, po.isNotaDinas || false)}
              className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
            />
          </div>
        );
      },
    }),
    helper.accessor("noNd", {
      header: "NO ND",
      size: 150,
      meta: { align: "center" },
      cell: ({ row, table }) => {
        const meta = table.options.meta as any;
        const po = row.original;
        return meta?.editNdId === po.id ? (
          <input
            type="text"
            value={meta?.tempNoNd}
            onChange={(e) => meta?.setTempNoNd(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="min-w-[130px] w-full text-xs px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
            placeholder="Input No ND"
          />
        ) : (
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {po.noNd || "-"}
          </span>
        );
      },
    }),
    helper.accessor("linkNd", {
      header: "LINK ND",
      size: 150,
      meta: { align: "center" },
      cell: ({ row, table }) => {
        const meta = table.options.meta as any;
        const po = row.original;
        return (
          <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
            {meta?.editNdId === po.id ? (
              <input
                type="text"
                value={meta?.tempLinkNd}
                onChange={(e) => meta?.setTempLinkNd(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="min-w-[130px] w-full text-xs px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Input Link"
              />
            ) : po.linkNd ? (
              <a
                href={po.linkNd.startsWith("http") ? po.linkNd : `https://${po.linkNd}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg transition-colors shadow-sm"
                title="Buka Dokumen ND"
              >
                <ExternalLink size={14} />
              </a>
            ) : (
              <span className="text-slate-300 dark:text-slate-600 font-medium">-</span>
            )}
          </div>
        );
      },
    }),
    helper.accessor("statusCreditLimit", {
      id: "zone",
      header: "STATUS",
      size: 120,
      meta: { align: "center" },
      cell: ({ row }) => (
        <StatusBadge status={row.original.statusCreditLimit} />
      ),
    }),
    helper.display({
      id: "action",
      header: "ACTION",
      size: 140,
      meta: { align: "center" },
      cell: ({ row, table }) => {
        const meta = table.options.meta as any;
        const po = row.original;
        return (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {meta?.editNdId === po.id ? (
              <ActionButton
                icon={Check}
                onClick={(e) => {
                  e.stopPropagation();
                  meta?.onUpdateNDDetails(po.id, meta?.tempNoNd, meta?.tempLinkNd);
                  meta?.setEditNdId(null);
                }}
                tooltip="Simpan ND"
                variant="indigo"
              />
            ) : (
              <ActionButton
                icon={Edit3}
                onClick={(e) => {
                  e.stopPropagation();
                  meta?.setTempNoNd(po.noNd || "");
                  meta?.setTempLinkNd(po.linkNd || "");
                  meta?.setEditNdId(po.id);
                }}
                tooltip="Edit ND"
                variant="slate"
              />
            )}
            {po.statusCreditLimit === "REQUESTED" ? (
              <>
                <ActionButton
                  icon={CheckCircle2}
                  onClick={(e) => { e.stopPropagation(); meta?.onAction(po, "approve"); }}
                  tooltip="Setujui Credit Limit"
                  variant="emerald"
                />
                <ActionButton
                  icon={X}
                  onClick={(e) => { e.stopPropagation(); meta?.onAction(po, "reject"); }}
                  tooltip="Tolak Credit Limit"
                  variant="rose"
                />
              </>
            ) : po.statusCreditLimit === "APPROVED" ? (
              <>
                <ActionButton
                  icon={CheckCircle2}
                  onClick={(e) => { e.stopPropagation(); meta?.onAction(po, "approveDireksi"); }}
                  tooltip="Setujui Credit Limit (Direksi)"
                  variant="indigo"
                />
                <ActionButton
                  icon={X}
                  onClick={(e) => { e.stopPropagation(); meta?.onAction(po, "reject"); }}
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
                  onClick={(e) => { e.stopPropagation(); meta?.onAction(po, "reRequest"); }}
                  tooltip="Ajukan Ulang"
                  variant="emerald"
                />
              </>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>
        );
      },
    }),
  ], []);


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
            {isBatchOpen && onCloseBatch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseBatch(batchCode);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-lg text-xs font-bold transition-all shadow-sm shadow-amber-200 dark:shadow-none active:scale-95"
              >
                <Lock size={14} />
                Close Batch
              </button>
            )}
            {isBatchUncloseable && onUncloseBatch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUncloseBatch(batchCode);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg text-xs font-bold transition-all shadow-sm shadow-blue-200 dark:shadow-none active:scale-95"
              >
                <Unlock size={14} />
                Unclose Batch
              </button>
            )}
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
          <DataTableV2
            columns={columns}
            data={pos}
            getRowId={(row: any) => row.id}
            hidePagination={true}
            onRowClick={onViewRow}
            meta={{
              editNdId,
              tempNoNd,
              tempLinkNd,
              setTempNoNd,
              setTempLinkNd,
              setEditNdId,
              onToggleND,
              onUpdateNDDetails,
              onAction,
            }}
          />
        </div>
      </div>
    </div>
  );
}
