import React from "react";
import { AlertTriangle, X, Search, LayoutList, ChevronDown, Check, ExternalLink } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";
import { DataTable } from "@/components/data-table";
import { PoDateBadge } from "@/components/PoDateBadge";
import { MONTH_NAMES, formatDatePremium, formatCurrencyPremium } from "../hooks/useExpiredCalendar";

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
  colsOpen,
  setColsOpen,
  toggleAllCols,
  visibleCols,
  setVisibleCols,
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

        <div className="relative">
          <button
            onClick={() => setColsOpen(!colsOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <LayoutList size={16} />
            Columns
            <ChevronDown
              size={14}
              className={`transition-transform ${colsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {colsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl z-[120] p-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between gap-1 mb-1">
                <button
                  onClick={() => toggleAllCols(true)}
                  className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2 py-1 rounded-md"
                >
                  All
                </button>
                <button
                  onClick={() => toggleAllCols(false)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 px-2 py-1 rounded-md"
                >
                  None
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                {Object.entries(visibleCols).map(([k, v]) => (
                  <div
                    key={k}
                    onClick={() =>
                      setVisibleCols((prev: any) => ({
                        ...prev,
                        [k]: !v,
                      }))
                    }
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${v ? "bg-rose-500 border-rose-500" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"}`}
                    >
                      {Boolean(v) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">
                      {k.replace(/([A-Z])/g, " $1")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "noPo",
            label: "NO PO",
            hidden: !visibleCols.noPo,
            render: (_v: any, po: any) => (
              <span className="text-xs font-black text-[#1e3a8a] dark:text-blue-300 whitespace-nowrap">
                {po.noPo}
              </span>
            ),
          },
          {
            key: "tglPo",
            label: "TGL PO",
            hidden: !visibleCols.tglPo,
            render: (_v: any, po: any) => (
              <PoDateBadge 
                dateNode={<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDatePremium(po.tglPo)}</span>}
                type="TAGIH"
                buktiData={po.buktiTagih}
              />
            ),
          },
          {
            key: "expired",
            label: "EXPIRED",
            hidden: !visibleCols.expired,
            render: (_v: any, po: any) => (
              <PoDateBadge 
                dateNode={<span className="text-[11px] font-black text-rose-500 dark:text-rose-400 whitespace-nowrap">{formatDatePremium(po.expiredTgl)}</span>}
                type="PAID"
                buktiData={po.buktiBayar}
              />
            ),
          },
          {
            key: "produk",
            label: "PRODUK / PT",
            hidden: !visibleCols.produk,
            render: (_v: any, po: any) => {
              const names = (Array.isArray(po.Items) ? po.Items : [])
                .map((it: any) => it.Product?.name || "")
                .filter(Boolean)
                .join(", ");
              return (
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase whitespace-nowrap">
                  {names || "-"}
                </span>
              );
            },
          },
          {
            key: "tglKirim",
            label: "TGL KIRIM",
            hidden: !visibleCols.tglKirim,
            render: (_v: any, po: any) => (
              <span
                className={`text-[11px] font-black whitespace-nowrap ${po.tglkirim ? "text-amber-600 dark:text-amber-400" : "text-slate-300 dark:text-slate-500"}`}
              >
                {po.tglkirim ? formatDatePremium(po.tglkirim) : "-"}
              </span>
            ),
          },
          {
            key: "pcs",
            label: "PCS",
            align: "center" as const,
            hidden: !visibleCols.pcs,
            render: (_v: any, po: any) => {
              const total = (
                Array.isArray(po.Items) ? po.Items : []
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
          },
          {
            key: "pcsKirim",
            label: "PCS KIRIM",
            align: "center" as const,
            hidden: !visibleCols.pcsKirim,
            render: (_v: any, po: any) => {
              const total = (
                Array.isArray(po.Items) ? po.Items : []
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
          },
          {
            key: "namaSupir",
            label: "NAMA SUPIR",
            hidden: !visibleCols.namaSupir,
            render: (_v: any, po: any) => (
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                {po.namaSupir || "-"}
              </span>
            ),
          },
          {
            key: "platNomor",
            label: "PLAT NOMOR",
            hidden: !visibleCols.platNomor,
            render: (_v: any, po: any) => (
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                {po.platNomor || "-"}
              </span>
            ),
          },
          {
            key: "totalKg",
            label: "TOTAL KG",
            align: "center" as const,
            hidden: !visibleCols.totalKg,
            render: (_v: any, po: any) => {
              const total = (
                Array.isArray(po.Items) ? po.Items : []
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
          },
          {
            key: "tujuan",
            label: "TUJUAN",
            hidden: !visibleCols.tujuan,
            render: (_v: any, po: any) => (
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate max-w-[150px] inline-block">
                {po.tujuanDetail || "-"}
              </span>
            ),
          },
          {
            key: "nominal",
            label: "NOMINAL",
            align: "right" as const,
            hidden: !visibleCols.nominal,
            render: (_v: any, po: any) => {
              const total = (po.Items || []).reduce(
                (a: number, b: any) => a + (Number(b.nominal) || 0),
                0,
              );
              return (
                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  {formatCurrencyPremium(total)}
                </span>
              );
            },
          },
          {
            key: "actions",
            label: "AKSI",
            align: "right" as const,
            render: (_v: any, po: any) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/po?noPo=${po.noPo}`, "_blank");
                }}
                className="p-2 text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <ExternalLink size={14} />
              </button>
            ),
          },
        ]}
        data={filteredDetailPOs}
        rowKey={(po: any) => po.id}
        hidePagination
        loading={false}
        variant="rounded"
        className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[28px] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50"
        emptyMessage="Data Tidak Ditemukan"
      />
    </div>
  );
}
