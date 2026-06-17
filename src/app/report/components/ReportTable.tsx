import { ExternalLink } from "lucide-react";
import { PoDateBadge } from "@/components/PoDateBadge";
import { GlobalPagination } from "@/components/global-pagination";
import { StatusBadge, HighlightText } from "./ReportComponents";
import { Column, Row, formatCurrency, formatNumber, formatDateId } from "../hooks/useReport";

export function ReportTable({ hook }: { hook: any }) {
  const {
    loading,
    error,
    pageRows,
    serverTotal,
    rowsPerPage,
    setRowsPerPage,
    visibleColumns,
    page,
    setPage,
    totalPages,
    query,
    colFilters,
  } = hook;

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
      <div className="px-6 py-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-b border-gray-100 dark:border-slate-800">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {loading
            ? "Loading..."
            : error
              ? `Error: ${error}`
              : `Menampilkan ${pageRows.length} dari ${serverTotal} baris`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="px-2 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm outline-none"
          >
            {[25, 50, 100, 250].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-slate-800">
            <tr>
              {visibleColumns.map((c: Column) => {
                const isItemField = [
                  "namaProduk", "pcs", "pcsKirim", "satuanKg", "kg", "hargaPcs", "hargaKg", "discount", "nominal", "rpTagih"
                ].includes(String(c.id));
                return (
                  <th
                    key={String(c.id)}
                    className={`px-4 py-3 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 ${isItemField ? "text-indigo-600 dark:text-indigo-400" : ""}`}
                  >
                    {c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 uppercase">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={`sk-${i}`} className="animate-pulse">
                  {visibleColumns.map((c: Column) => (
                    <td key={`${i}-${String(c.id)}`} className="px-4 py-3 whitespace-nowrap">
                      <div className="h-4 w-full min-w-[60px] bg-slate-100 dark:bg-slate-800 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-slate-500 dark:text-slate-400 text-center" colSpan={Math.max(1, visibleColumns.length)}>
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              pageRows.map((r: Row) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-[12px] border-b border-slate-50 dark:border-slate-800/50"
                >
                  {visibleColumns.map((c: Column) => {
                    const v = c.value(r);
                    const isStatus = c.kind === "bool" || c.id.toString().startsWith("status");
                    const isItemField = [
                      "namaProduk", "pcs", "pcsKirim", "satuanKg", "kg", "hargaPcs", "hargaKg", "discount", "nominal", "rpTagih"
                    ].includes(String(c.id));

                    const text = c.kind === "number"
                      ? ["nominal", "rpTagih", "hargaPcs", "hargaKg", "discount"].includes(String(c.id))
                        ? formatCurrency(Number(v) || 0)
                        : formatNumber(Number(v) || 0)
                      : c.kind === "date"
                        ? v ? formatDateId(v) : "-"
                        : String(v ?? "-") || "-";

                    const filterVal = colFilters[String(c.id)] || [];
                    const highlightTerm = query && filterVal.length === 0 && c.kind === "text" ? query : filterVal;

                    return (
                      <td
                        key={String(c.id)}
                        className={`px-4 py-3 whitespace-nowrap ${isItemField ? "bg-indigo-50/30 dark:bg-indigo-500/5" : ""} ${c.kind === "number" && c.id !== "no" ? "text-right" : ""} ${c.id === "no" ? "text-center font-semibold text-slate-500 dark:text-slate-400" : ""} ${c.id === "expiredTgl" ? "text-rose-600 dark:text-rose-400 font-bold" : c.id !== "no" ? "text-slate-800 dark:text-slate-200" : ""}`}
                      >
                        {c.id === "linkPo" ? (
                          v && String(v).trim() && String(v) !== "-" ? (
                            <a
                              href={String(v)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                            >
                              <ExternalLink size={16} />
                            </a>
                          ) : "-"
                        ) : isStatus ? (
                          <StatusBadge label={c.label.toUpperCase()} checked={!!v} />
                        ) : c.id === "tglPo" ? (
                          <PoDateBadge 
                            dateNode={c.kind === "text" && highlightTerm ? <HighlightText text={text} highlight={highlightTerm} /> : text}
                            type="TAGIH"
                            buktiData={r.buktiTagih}
                          />
                        ) : c.id === "expiredTgl" ? (
                          <PoDateBadge 
                            dateNode={c.kind === "text" && highlightTerm ? <HighlightText text={text} highlight={highlightTerm} /> : text}
                            type="PAID"
                            buktiData={r.buktiBayar}
                          />
                        ) : c.kind === "text" && highlightTerm ? (
                          <HighlightText text={text} highlight={highlightTerm} />
                        ) : text}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 mb-2 px-2">
        <GlobalPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          itemsCount={pageRows.length}
          totalItems={serverTotal}
          itemName="baris"
        />
      </div>
    </div>
  );
}
