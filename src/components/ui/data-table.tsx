import React from "react";
import { flexRender, Table as ReactTable } from "@tanstack/react-table";
import { LoaderThree } from "@/components/ui/loader";
import CustomSelect from "@/components/select";
import { GlobalPagination } from "@/components/global-pagination";

interface DataTableProps<TData> {
  table: ReactTable<TData>;
  columnsLength: number;
  loading?: boolean;
  isTransitioning?: boolean;
  dataLength: number;
  noDataMessage?: string;
  totalData: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  onRowsPerPageChange: (val: number) => void;
  itemName?: string;
  minWidth?: string;
  stickyLeftCols?: string[];
  stickyRightCols?: string[];
}

export function DataTable<TData>({
  table,
  columnsLength,
  loading = false,
  isTransitioning = false,
  dataLength,
  noDataMessage = "Tidak ada data.",
  totalData,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  itemName = "Data",
  minWidth = "min-w-[1000px]",
  stickyLeftCols = [],
  stickyRightCols = [],
}: DataTableProps<TData>) {
  const totalPages = Math.max(1, Math.ceil(totalData / rowsPerPage));

  return (
    <div className="flex flex-col flex-1">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative premium-scrollbar">
        <table className={`w-full text-left border-collapse ${minWidth}`}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const isStickyLeft = stickyLeftCols.includes(h.column.id);
                  const isStickyRight = stickyRightCols.includes(h.column.id);

                  return (
                    <th
                      key={h.id}
                      className={`px-4 py-4 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md whitespace-nowrap border-b border-slate-200 dark:border-slate-700
                        ${isStickyLeft ? "sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]" : ""}
                        ${isStickyRight ? "sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.5)]" : ""}
                      `}
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody
            className={`divide-y divide-slate-100 dark:divide-slate-800/50 text-sm text-black dark:text-slate-200 transition-opacity duration-300 ${
              isTransitioning ? "opacity-50" : "opacity-100"
            }`}
          >
            {table.getRowModel().rows.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group"
              >
                {r.getVisibleCells().map((c) => {
                  const isStickyLeft = stickyLeftCols.includes(c.column.id);
                  const isStickyRight = stickyRightCols.includes(c.column.id);

                  return (
                    <td
                      key={c.id}
                      className={`px-4 py-3 align-middle
                        ${isStickyLeft ? "sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] transition-colors" : ""}
                        ${isStickyRight ? "sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.5)] transition-colors" : ""}
                      `}
                    >
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}

            {dataLength === 0 && !loading && !isTransitioning && (
              <tr>
                <td
                  className="px-6 py-10 text-center text-slate-500 dark:text-slate-400 font-medium"
                  colSpan={columnsLength}
                >
                  {noDataMessage}
                </td>
              </tr>
            )}

            {(loading || isTransitioning) && (
              <tr>
                <td className="px-6 py-10 text-center" colSpan={columnsLength}>
                  <LoaderThree label="Loading data..." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          Total Data:{" "}
          <span className="text-slate-900 dark:text-slate-100 font-bold">
            {totalData.toLocaleString("id-ID")}
          </span>{" "}
          baris
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Rows per page
          </span>
          <CustomSelect
            value={String(rowsPerPage)}
            onChange={(val) => onRowsPerPageChange(Number(val))}
            options={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            className="w-20 shadow-sm dark:shadow-none"
          />
        </div>

        <GlobalPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          itemsCount={dataLength}
          totalItems={totalData}
          itemName={itemName}
        />
      </div>
    </div>
  );
}
