import React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  PencilLine, 
  X, 
  Calendar, 
  RotateCcw, 
  Eye 
} from "lucide-react";
import { PoDateBadge } from "@/components/PoDateBadge";
import { ActionButton, StandardTooltip } from "@/components/ui/action-button";

const helper = createColumnHelper<any>();

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

export const getScheduleColumns = (formatDate: (d: any) => string) => [
  helper.accessor("noPo", {
    header: "Purchase Order",
    size: 260,
    cell: ({ row }) => (
      <div>
        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{row.original.noPo}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[230px]">{row.original.RitelModern?.namaPt || "-"}</p>
      </div>
    ),
  }),
  helper.accessor("inisial", {
    header: "Inisial",
    size: 90,
    cell: ({ row }) => (
      <StandardTooltip content={row.original.RitelModern?.inisial || "-"}>
        <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] shadow-sm cursor-pointer">
          {row.original.RitelModern?.inisial || "-"}
        </span>
      </StandardTooltip>
    ),
  }),
  helper.accessor("siteArea", {
    header: "Site Area",
    size: 160,
    cell: ({ row }) => {
      const site = cleanSiteArea(row.original.UnitProduksi?.siteArea || row.original.siteArea);
      return (
        <div className="flex items-center gap-1.5">
          {site !== "-" && <MapPin size={11} className="text-slate-300 dark:text-slate-500 shrink-0" />}
          <span className={`text-xs font-medium ${site === "-" ? "text-slate-300 dark:text-slate-600" : "text-slate-600 dark:text-slate-300"}`}>{site}</span>
        </div>
      );
    },
  }),
  helper.accessor("tujuanDetail", {
    header: "Tujuan",
    size: 200,
    cell: ({ row }) => (
      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px]" title={row.original.tujuanDetail || "-"}>{row.original.tujuanDetail || "-"}</p>
    ),
  }),
  helper.accessor("tglPo", {
    header: "Tgl PO",
    size: 120,
    cell: ({ row }) => (
      <PoDateBadge 
        dateNode={<span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{row.original.tglPo ? format(new Date(row.original.tglPo), "dd MMM yyyy") : "-"}</span>}
        type="TAGIH"
        buktiData={row.original.buktiTagih}
      />
    ),
  }),
  helper.accessor("expiredTgl", {
    header: "Due Date",
    size: 110,
    cell: ({ row }) => (
      <PoDateBadge 
        dateNode={
          <span className={`text-xs tabular-nums whitespace-nowrap font-bold ${
            row.original.expiredTgl && new Date(row.original.expiredTgl).getTime() - Date.now() <= 3 * 24 * 60 * 60 * 1000
              ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"
          }`}>
            {row.original.expiredTgl ? format(new Date(row.original.expiredTgl), "dd MMM yyyy") : "-"}
          </span>
        }
        type="PAID"
        buktiData={row.original.buktiBayar}
      />
    ),
  }),
  helper.accessor("tglkirim", {
    header: "Tgl Kirim",
    size: 130,
    meta: { align: "center" },
    cell: ({ row }) => {
      const isScheduled = !!row.original.tglkirim;
      return (
        <div className="w-full flex justify-center">
          {isScheduled ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-md text-[10px] font-black uppercase tracking-tight">
              <CalendarDays size={11} className="shrink-0" />
              {format(new Date(row.original.tglkirim), "dd MMM yy")}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 rounded-md text-[10px] font-bold uppercase tracking-tight italic">
              <Clock size={11} className="shrink-0" />
              Belum Ada
            </div>
          )}
        </div>
      );
    },
  }),
  helper.accessor("pcsTotal", {
    header: "Pcs",
    size: 60,
    meta: { align: "center" },
    cell: ({ row }) => (
      <div className="w-full flex justify-center">
        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">{Number(row.original.pcsTotal || 0).toLocaleString("id-ID")}</span>
      </div>
    ),
  }),
  helper.accessor("pcsKirim", {
    header: "Pcs Kirim",
    size: 140,
    meta: { align: "center" },
    cell: ({ row, table }) => {
      const po = row.original;
      const meta: any = table.options.meta || {};
      const { 
        expandedRows, 
        toggleRow, 
        handleUpdatePcsKirim, 
        savingPcsId, 
        setPoData 
      } = meta;

      const itemsCount = Number(po.itemsCount || 0);
      const isMulti = itemsCount > 1;
      const isExpanded = expandedRows?.has(po.id);

      return (
        <div className="w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
          {isMulti ? (
            <div className="flex items-center gap-2 justify-center">
              <span className="flex items-center justify-center w-24 h-9 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black tabular-nums shadow-sm">
                {Number(po.pcsKirimTotal || 0).toLocaleString("id-ID")}
              </span>
              <button 
                onClick={() => toggleRow?.(po.id)}
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
                  handleUpdatePcsKirim?.(po.id, val.toString());
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
                  const finalVal = numVal > max ? max.toString() : val === "" ? "" : numVal.toString();
                  setPoData?.((prev: any) => prev.map((p: any) => p.id === po.id ? { ...p, pcsKirimTotal: finalVal } : p));
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
  }),
  helper.accessor("actions", {
    header: "Action",
    size: 130,
    meta: { align: "center" },
    cell: ({ row, table }) => {
      const po = row.original;
      const isScheduled = !!po.tglkirim;
      const meta: any = table.options.meta || {};
      const { 
        setSelectedPo, 
        setSelectedDate, 
        setNamaSupir, 
        setPlatNomor, 
        setModalOpen, 
        updatingId, 
        handleRejectPo, 
        handlePreviewPdf 
      } = meta;

      return (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ActionButton
            icon={Calendar}
            tooltip={isScheduled ? "Ubah Jadwal" : "Set Jadwal"}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPo?.(po);
              setSelectedDate?.(po.tglkirim ? po.tglkirim.split("T")[0] : "");
              setNamaSupir?.(po.namaSupir || "");
              setPlatNomor?.(po.platNomor || "");
              setModalOpen?.(true);
            }}
            variant={isScheduled ? "slate" : "indigo"}
            loading={updatingId === po.id}
          />
          
          <ActionButton
            icon={RotateCcw}
            tooltip="Reject / Unassign"
            onClick={(e) => { e.stopPropagation(); handleRejectPo?.(po); }}
            variant="rose"
            loading={updatingId === po.id}
          />

          {isScheduled && (
            <ActionButton
              icon={Eye}
              tooltip="Preview & Download"
              onClick={(e) => { e.stopPropagation(); handlePreviewPdf?.(po); }}
              variant="indigo"
            />
          )}
        </div>
      );
    },
  }),
];
