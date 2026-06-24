import React, { useMemo } from "react";
import { AlertTriangle, X, Search, ExternalLink } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";
import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { createColumnHelper } from "@tanstack/react-table";
import { PoDateBadge } from "@/components/PoDateBadge";
import { MONTH_NAMES, formatDatePremium, formatCurrencyPremium } from "../hooks/useExpiredCalendar";

const helper = createColumnHelper<any>();

export function ExpiredInlineDetail({
  selectedDateKey,
  setSelectedDateKey,
  groupedPOs,
  filteredDetailPOs,
  inlineSearch,
  setInlineSearch,
  inlineDateFrom,
  setInlineDateFrom,
  inlineDateTo,
  setInlineDateTo,
}: any) {
  if (!selectedDateKey) return null;

  const selectedDateLabel = (() => {
    const parts = selectedDateKey.split("-");
    return `${Number(parts[2])} ${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[0]}`;
  })();

  const columns = useMemo(() => [
    helper.accessor("noPo", {
      header: "NO PO",
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs font-black text-[#1e3a8a] dark:text-blue-300 whitespace-nowrap">
          {row.original.noPo}
        </span>
      ),
    }),
    helper.accessor("tglPo", {
      header: "TGL PO",
      size: 130,
      cell: ({ row }) => (
        <PoDateBadge 
          dateNode={<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDatePremium(row.original.tglPo)}</span>}
          type="TAGIH"
          buktiData={row.original.buktiTagih}
        />
      ),
    }),
    helper.accessor("expiredTgl", {
      header: "EXPIRED",
      size: 130,
      cell: ({ row }) => (
        <PoDateBadge 
          dateNode={<span className="text-[11px] font-black text-rose-500 dark:text-rose-400 whitespace-nowrap">{formatDatePremium(row.original.expiredTgl)}</span>}
          type="PAID"
          buktiData={row.original.buktiBayar}
        />
      ),
    }),
    helper.accessor("produk", {
      header: "PRODUK / PT",
      size: 200,
      cell: ({ row }) => {
        const names = (Array.isArray(row.original.Items) ? row.original.Items : [])
          .map((it: any) => it.Product?.name || "")
          .filter(Boolean)
          .join(", ");
        return (
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase whitespace-nowrap">
            {names || "-"}
          </span>
        );
      },
    }),
    helper.accessor("tglkirim", {
      header: "TGL KIRIM",
      size: 120,
      cell: ({ row }) => (
        <span
          className={`text-[11px] font-black whitespace-nowrap ${row.original.tglkirim ? "text-amber-600 dark:text-amber-400" : "text-slate-300 dark:text-slate-500"}`}
        >
          {row.original.tglkirim ? formatDatePremium(row.original.tglkirim) : "-"}
        </span>
      ),
    }),
    helper.accessor("pcs", {
      header: "PCS",
      size: 100,
      meta: { align: "center" },
      cell: ({ row }) => {
        const total = (
          Array.isArray(row.original.Items) ? row.original.Items : []
        ).reduce(
          (a: number, it: any) => a + (Number(it.pcs) || 0),
          0,
        );
        return (
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
            {total.toLocaleString("id-ID")}
          </span>
        );
      },
    }),
    helper.accessor("pcsKirim", {
      header: "PCS KIRIM",
      size: 100,
      meta: { align: "center" },
      cell: ({ row }) => {
        const total = (
          Array.isArray(row.original.Items) ? row.original.Items : []
        ).reduce(
          (a: number, it: any) => a + (Number(it.pcsKirim) || 0),
          0,
        );
        return (
          <span className="text-[11px] font-black text-amber-500 dark:text-amber-400">
            {total ? total.toLocaleString("id-ID") : "-"}
          </span>
        );
      },
    }),
    helper.accessor("namaSupir", {
      header: "NAMA SUPIR",
      size: 150,
      cell: ({ row }) => (
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
          {row.original.namaSupir || "-"}
        </span>
      ),
    }),
    helper.accessor("platNomor", {
      header: "PLAT NOMOR",
      size: 120,
      cell: ({ row }) => (
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
          {row.original.platNomor || "-"}
        </span>
      ),
    }),
    helper.accessor("totalKg", {
      header: "TOTAL KG",
      size: 120,
      meta: { align: "center" },
      cell: ({ row }) => {
        const total = (
          Array.isArray(row.original.Items) ? row.original.Items : []
        ).reduce(
          (a: number, it: any) =>
            a +
            (Number(it.pcs) || 0) * Number(it.Product?.satuanKg || 1),
          0,
        );
        return (
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
            {total.toLocaleString("id-ID")}
          </span>
        );
      },
    }),
    helper.accessor("tujuan", {
      header: "TUJUAN",
      size: 180,
      cell: ({ row }) => (
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate max-w-[150px] inline-block">
          {row.original.tujuanDetail || "-"}
        </span>
      ),
    }),
    helper.accessor("nominal", {
      header: "NOMINAL",
      size: 150,
      meta: { align: "right" },
      cell: ({ row }) => {
        const total = (row.original.Items || []).reduce(
          (a: number, b: any) => a + (Number(b.nominal) || 0),
          0,
        );
        return (
          <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
            {formatCurrencyPremium(total)}
          </span>
        );
      },
    }),
    helper.display({
      id: "actions",
      header: "AKSI",
      size: 80,
      meta: { align: "right" },
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/po?noPo=${row.original.noPo}`, "_blank");
          }}
          className="p-2 text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ExternalLink size={14} />
        </button>
      ),
    }),
  ], []);

  return (
    <div className="mt-8 border-t pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              PO Expired: {selectedDateLabel}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              {filteredDetailPOs.length} /{" "}
              {groupedPOs[selectedDateKey]?.length || 0} Purchase Orders Berakhir
            </p>
          </div>
        </div>
        <button
          onClick={() => setSelectedDateKey(null)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* TOOLBAR TABEL */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4 items-center justify-between bg-zinc-50/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={inlineSearch}
              onChange={(e) => setInlineSearch(e.target.value)}
              placeholder="Cari No PO, Ritel..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <DateInputHybrid
              value={inlineDateFrom}
              onChange={setInlineDateFrom}
              placeholder="Date From"
              className="w-36"
            />
            <span className="text-slate-300 dark:text-slate-600 font-bold">to</span>
            <DateInputHybrid
              value={inlineDateTo}
              onChange={setInlineDateTo}
              placeholder="Date To"
              className="w-36"
            />
          </div>
        </div>
      </div>

      <DataTableV2
        columns={columns}
        data={filteredDetailPOs}
        getRowId={(row: any) => row.id || row.noPo}
        loading={false}
        isFetching={false}
        manualPagination={false}
      />
    </div>
  );
}
