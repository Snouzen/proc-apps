import React from "react";
import { Truck, X, Search, ChevronDown } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";
import { DataTable } from "@/components/data-table";
import { PoDateBadge } from "@/components/PoDateBadge";
import { MONTH_NAMES, formatDateId } from "../hooks/useBranchCalendar";

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
  colsOpen,
  setColsOpen,
  visibleCols,
  setVisibleCols,
  toggleAllCols,
  setSelectedDateKey,
  setSelectedDetailPO,
}: any) {
  if (!selectedDateKey) return null;

  const selectedDateLabel = (() => {
    const parts = selectedDateKey.split("-");
    return `${Number(parts[2])} ${MONTH_NAMES[Number(parts[1]) - 1]} ${parts[0]}`;
  })();

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
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setColsOpen(!colsOpen)}
            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between gap-2"
          >
            Customize Columns <ChevronDown size={14} />
          </button>
          {colsOpen && (
            <>
              <div
                className="fixed inset-0 z-[40]"
                onClick={() => setColsOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-[600px] max-w-[90vw] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    Pilih Kolom
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAllCols(true)}
                      className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    >
                      Show All
                    </button>
                    <button
                      onClick={() => toggleAllCols(false)}
                      className="px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50"
                    >
                      Hide All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 max-h-72 overflow-y-auto p-1">
                  {Object.keys(visibleCols).map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer capitalize"
                    >
                      <input
                        type="checkbox"
                        checked={(visibleCols as any)[key]}
                        onChange={() =>
                          setVisibleCols((prev: any) => ({
                            ...prev,
                            [key]: !(prev as any)[key],
                          }))
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "noPo",
            label: "No PO",
            hidden: !visibleCols.noPo,
            render: (_v: any, po: any) => (
              <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{po.noPo || "-"}</span>
            ),
          },
          {
            key: "tglPo",
            label: "Tgl PO",
            hidden: !visibleCols.tglPo,
            render: (_v: any, po: any) => (
              <PoDateBadge 
                dateNode={<span className="whitespace-nowrap">{formatDateId(po.tglPo)}</span>}
                type="TAGIH"
                buktiData={po.buktiTagih}
              />
            ),
          },
          {
            key: "expired",
            label: "Expired",
            hidden: !visibleCols.expired,
            render: (_v: any, po: any) => (
              <PoDateBadge 
                dateNode={<span className="whitespace-nowrap text-rose-600 font-semibold">{formatDateId(po.expiredTgl)}</span>}
                type="PAID"
                buktiData={po.buktiBayar}
              />
            ),
          },
          {
            key: "produk",
            label: "Produk",
            hidden: !visibleCols.produk,
            render: (_v: any, po: any) => {
              const names = (po.Items || []).map((it: any) => it.Product?.name || "-").join(", ");
              return (
                <span className="max-w-[200px] truncate inline-block" title={names}>{names || "-"}</span>
              );
            },
          },
          {
            key: "tglKirim",
            label: "Tgl Kirim",
            hidden: !visibleCols.tglKirim,
            render: (_v: any, po: any) => (
              <span className="whitespace-nowrap text-amber-600 font-semibold">{formatDateId(po.tglkirim || po.tglKirim)}</span>
            ),
          },
          {
            key: "pcs",
            label: "Pcs",
            align: "right" as const,
            hidden: !visibleCols.pcs,
            render: (_v: any, po: any) => {
              const total = (po.Items || []).reduce((s: number, it: any) => s + (Number(it.pcs) || 0), 0);
              return <span className="whitespace-nowrap font-medium">{total.toLocaleString("id-ID")}</span>;
            },
          },
          {
            key: "pcsKirim",
            label: "Pcs Kirim",
            align: "right" as const,
            hidden: !visibleCols.pcsKirim,
            render: (_v: any, po: any) => {
              const total = (po.Items || []).reduce((s: number, it: any) => s + (Number(it.pcsKirim) || 0), 0);
              return <span className="whitespace-nowrap font-bold text-amber-600">{total.toLocaleString("id-ID")}</span>;
            },
          },
          {
            key: "namaSupir",
            label: "Nama Supir",
            hidden: !visibleCols.namaSupir,
            render: (_v: any, po: any) => (
              <span className="whitespace-nowrap uppercase">{po.namaSupir || "-"}</span>
            ),
          },
          {
            key: "platNomor",
            label: "Plat Nomor",
            hidden: !visibleCols.platNomor,
            render: (_v: any, po: any) => (
              <span className="whitespace-nowrap uppercase font-bold">{po.platNomor || "-"}</span>
            ),
          },
          {
            key: "totalKg",
            label: "Total Kg",
            align: "right" as const,
            hidden: !visibleCols.totalKg,
            render: (_v: any, po: any) => {
              const total = (po.Items || []).reduce(
                (s: number, it: any) => s + (Number(it.pcsKirim) || Number(it.pcs) || 0) * Number(it.Product?.satuanKg || 1), 0
              );
              return <span className="whitespace-nowrap font-semibold">{total.toLocaleString("id-ID")}</span>;
            },
          },
          {
            key: "tujuan",
            label: "Tujuan",
            hidden: !visibleCols.tujuan,
            render: (_v: any, po: any) => (
              <span className="whitespace-nowrap text-xs">{po.tujuanDetail || po.RitelModern?.tujuan || "-"}</span>
            ),
          },
          {
            key: "regional",
            label: "Regional",
            hidden: !visibleCols.regional,
            render: (_v: any, po: any) => (
              <span className="whitespace-nowrap">{po.regional || "-"}</span>
            ),
          },
          {
            key: "siteArea",
            label: "Site Area",
            hidden: !visibleCols.siteArea,
            render: (_v: any, po: any) => (
              <span className="whitespace-nowrap">{po.UnitProduksi?.siteArea || "-"}</span>
            ),
          },
          {
            key: "nominal",
            label: "Nominal",
            align: "right" as const,
            hidden: !visibleCols.nominal,
            render: (_v: any, po: any) => {
              const total = (po.Items || []).reduce((s: number, it: any) => s + (Number(it.nominal) || 0), 0);
              return <span className="whitespace-nowrap font-bold text-indigo-700">Rp {total.toLocaleString("id-ID")}</span>;
            },
          },
        ]}
        data={filteredDetailPOs}
        rowKey={(po: any, idx: number) => po.id || idx}
        hidePagination
        loading={false}
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
        variant="rounded"
        className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden"
        emptyMessage="Tidak ada pengiriman"
      />
    </div>
  );
}
