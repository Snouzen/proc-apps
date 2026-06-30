import React, { useMemo } from "react";
import { Truck, X, Search } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";
import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { createColumnHelper } from "@tanstack/react-table";
import { PoDateBadge } from "@/components/PoDateBadge";
import { MONTH_NAMES, formatDateId } from "../hooks/useBranchCalendar";

const helper = createColumnHelper<any>();

export function BranchInlineDetail({
  selectedDateKey,
  groupedPOs,
  filteredDetailPOs,
  inlineSearch,
  setInlineSearch,
  inlineDateFrom,
  setInlineDateFrom,
  inlineDateTo,
  setInlineDateTo,
  setSelectedDateKey,
  setSelectedDetailPO,
}: any) {
  const selectedDateLabel = selectedDateKey ? (() => {
    const parts = selectedDateKey.split("-");
    return `${Number(parts[2])} ${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[0]}`;
  })() : "";

  const columns = useMemo(() => [
    helper.accessor("noPo", {
      header: "No PO",
      size: 160,
      cell: ({ row }) => (
        <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{row.original.noPo || "-"}</span>
      ),
    }),
    helper.accessor("tglPo", {
      header: "Tgl PO",
      size: 120,
      cell: ({ row }) => (
        <PoDateBadge 
          dateNode={<span className="whitespace-nowrap">{formatDateId(row.original.tglPo)}</span>}
          type="TAGIH"
          buktiData={row.original.buktiTagih}
        />
      ),
    }),
    helper.accessor("expiredTgl", {
      header: "Expired",
      size: 120,
      cell: ({ row }) => (
        <PoDateBadge 
          dateNode={<span className="whitespace-nowrap text-rose-600 font-semibold">{formatDateId(row.original.expiredTgl)}</span>}
          type="PAID"
          buktiData={row.original.buktiBayar}
        />
      ),
    }),
    helper.accessor("produk", {
      header: "Produk",
      size: 200,
      cell: ({ row }) => {
        const names = (row.original.Items || []).map((it: any) => it.Product?.name || "-").join(", ");
        return (
          <span className="max-w-[200px] truncate inline-block" title={names}>{names || "-"}</span>
        );
      },
    }),
    helper.accessor("tglKirim", {
      header: "Tgl Kirim",
      size: 120,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-amber-600 font-semibold">{formatDateId(row.original.tglkirim || row.original.tglKirim)}</span>
      ),
    }),
    helper.accessor("pcs", {
      header: "Pcs",
      size: 100,
      meta: { align: "right" },
      cell: ({ row }) => {
        const total = (row.original.Items || []).reduce((s: number, it: any) => s + (Number(it.pcs) || 0), 0);
        return <span className="whitespace-nowrap font-medium">{total.toLocaleString("id-ID")}</span>;
      },
    }),
    helper.accessor("pcsKirim", {
      header: "Pcs Kirim",
      size: 100,
      meta: { align: "right" },
      cell: ({ row }) => {
        const total = (row.original.Items || []).reduce((s: number, it: any) => s + (Number(it.pcsKirim) || 0), 0);
        return <span className="whitespace-nowrap font-bold text-amber-600">{total.toLocaleString("id-ID")}</span>;
      },
    }),
    helper.accessor("namaSupir", {
      header: "Nama Supir",
      size: 150,
      cell: ({ row }) => (
        <span className="whitespace-nowrap uppercase">{row.original.namaSupir || "-"}</span>
      ),
    }),
    helper.accessor("platNomor", {
      header: "Plat Nomor",
      size: 120,
      cell: ({ row }) => (
        <span className="whitespace-nowrap uppercase font-bold">{row.original.platNomor || "-"}</span>
      ),
    }),
    helper.accessor("totalKg", {
      header: "Total Kg",
      size: 120,
      meta: { align: "right" },
      cell: ({ row }) => {
        const total = (row.original.Items || []).reduce(
          (s: number, it: any) => s + (Number(it.pcsKirim) || Number(it.pcs) || 0) * Number(it.Product?.satuanKg || 1), 0
        );
        return <span className="whitespace-nowrap font-semibold">{total.toLocaleString("id-ID")}</span>;
      },
    }),
    helper.accessor("tujuan", {
      header: "Tujuan",
      size: 200,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">{row.original.tujuanDetail || row.original.RitelModern?.tujuan || "-"}</span>
      ),
    }),
    helper.accessor("regional", {
      header: "Regional",
      size: 150,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.regional || "-"}</span>
      ),
    }),
    helper.accessor("siteArea", {
      header: "Site Area",
      size: 150,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.UnitProduksi?.siteArea || "-"}</span>
      ),
    }),
    helper.accessor("nominal", {
      header: "Nominal",
      size: 150,
      meta: { align: "right" },
      cell: ({ row }) => {
        const total = (row.original.Items || []).reduce((s: number, it: any) => s + (Number(it.nominal) || 0), 0);
        return <span className="whitespace-nowrap font-bold text-indigo-700">Rp {total.toLocaleString("id-ID")}</span>;
      },
    }),
  ], []);

  if (!selectedDateKey) return null;

  return (
    <div className="mt-8 border-t pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${groupedPOs[selectedDateKey]?.length > 0 ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500"}`}
          >
            <Truck size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Jadwal Pengiriman: {selectedDateLabel}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              {filteredDetailPOs.length} /{" "}
              {groupedPOs[selectedDateKey]?.length || 0} Purchase Orders
              Terjadwal
              {inlineSearch && ` (Filter: "${inlineSearch}")`}
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
      <div className="flex flex-col lg:flex-row gap-3 mb-4 items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
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
              placeholder="Cari No PO, Inv, Company, Inisial..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
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
        getRowId={(row: any) => row.id}
        loading={false}
        isFetching={false}
        manualPagination={false}
        onRowClick={(po: any) => {
          const items = po.Items || [];
          const isShipped = items.some((it: any) => (Number(it.pcsKirim) || 0) > 0);
          setSelectedDetailPO({
            ...po,
            buktiKirim: po.buktiKirim,
            buktiFp: po.buktiFp,
            company: po.RitelModern?.namaPt || po.company || "Unknown",
            siteArea: po.UnitProduksi?.siteArea || "-",
            status: {
              kirim: !!po.statusKirim || isShipped,
              sdif: !!po.statusSdif,
              po: !!po.statusPo,
              fp: !!po.statusFp,
              kwi: !!po.statusKwi,
              inv: !!po.statusInv,
              tagih: !!po.statusTagih,
              bayar: !!po.statusBayar,
            },
          });
        }}
      />
    </div>
  );
}
