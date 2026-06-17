"use client";

import { useMemo, useState } from "react";
import PODetailModal from "@/components/po-detail-modal";
import { Search } from "lucide-react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import * as Popover from "@radix-ui/react-popover";
import { GlobalPagination } from "@/components/global-pagination";
import { CustomSelect } from "@/components/ui/custom-select";
import { PoDateBadge } from "@/components/PoDateBadge";

import { useAuthData } from "@/hooks/useAuthData";
import { useMasterUnits } from "@/hooks/useMasterUnits";
import { usePoDetailModal } from "@/hooks/usePoDetailModal";
import { useNeedAssignTable, NeedAssignRow } from "@/hooks/useNeedAssignTable";
import { useNeedAssignColumns } from "./hooks/useNeedAssignColumns";

export default function NeedAssignPage() {
  const { role, regional } = useAuthData();
  const { unitData: units } = useMasterUnits();
  
  const tableState = useNeedAssignTable({ role: (role || "") as any, regional: regional || "" });
  const detailModal = usePoDetailModal({ role: (role || "") as any, regional: regional || "" });

  const [hoveredPoId, setHoveredPoId] = useState<string | null>(null);

  const formatDate = (d: any) => {
    const date = d ? new Date(d) : null;
    if (!date || isNaN(date.getTime())) return "-";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleDateString("id-ID", { month: "short" });
    const year = date.getFullYear().toString();
    return `${day} ${month} ${year}`;
  };

  const filteredRows = useMemo(() => tableState.rows, [tableState.rows]);
  const totalPages = Math.max(1, Math.ceil(tableState.total / tableState.rowsPerPage));

  const keyify = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\bregional\b/g, "reg")
      .replace(/([a-z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([a-z])/g, "$1 $2")
      .replace(/\s+/g, " ");

  const siteOptionsByRegional = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const u of units) {
      const k = keyify(u.namaRegional || "");
      if (!k) continue;
      if (!map[k]) map[k] = [];
      if (u.siteArea) map[k].push(u.siteArea);
    }
    for (const k of Object.keys(map)) {
      map[k] = Array.from(new Set(map[k])).sort();
    }
    return map;
  }, [units]);
  
  const siteRegionalKeys = useMemo(
    () => Object.keys(siteOptionsByRegional),
    [siteOptionsByRegional],
  );

  const columns = useNeedAssignColumns({
    role: (role || "") as any,
    regional: regional || "",
    units,
    tableState,
    detailModal,
    hoveredPoId,
    setHoveredPoId,
    siteOptionsByRegional,
    siteRegionalKeys,
    keyify,
    formatDate,
  });

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Need Assign
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
            Daftar PO yang menunggu mapping Unit Produksi/Regional.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari PO, Perusahaan..."
            className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            value={tableState.search}
            onChange={(e) => tableState.setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden relative min-h-[400px] flex flex-col">
        {tableState.loading && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300">
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
              <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Memuat data...
              </span>
            </div>
          </div>
        )}

        <div className={`transition-opacity duration-300 flex-1 flex flex-col ${tableState.isTransitioning ? "opacity-50" : "opacity-100"}`}>
          <div className="overflow-x-auto w-full flex-1">
            {tableState.error ? (
              <div className="p-8 text-center text-rose-500 font-medium">
                {tableState.error}
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-max xl:min-w-[1400px]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-100 dark:border-slate-800">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 align-top">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!tableState.loading && filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium"
                      >
                        Tidak ada data yang perlu di-assign
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {!tableState.loading && !tableState.error && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
            Total Data: <span className="text-slate-900 dark:text-slate-100 font-bold">{tableState.total.toLocaleString("id-ID")}</span> baris
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Rows per page
            </span>
            <CustomSelect
              value={tableState.rowsPerPage}
              onChange={(val) => {
                tableState.setRowsPerPage(Number(val));
                tableState.setPage(1);
              }}
              options={[
                { value: 10, label: "10" },
                { value: 25, label: "25" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
              ]}
              className="w-20 shadow-sm dark:shadow-none"
            />
          </div>

          <GlobalPagination
            currentPage={tableState.page}
            totalPages={totalPages}
            onPageChange={tableState.setPage}
            itemsCount={filteredRows.length}
            totalItems={tableState.total}
            itemName="po"
          />
        </div>
      )}

      <PODetailModal
        open={detailModal.openDetail}
        onClose={() => detailModal.setOpenDetail(false)}
        data={detailModal.detailData}
      />
    </div>
  );
}
