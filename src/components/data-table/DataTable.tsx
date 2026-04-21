"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { DataTableProps, ColumnDef } from "./types";
import { Fragment, ReactNode, useMemo } from "react";

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`h-3.5 bg-slate-100 rounded-md ${
              i === 0
                ? "w-8"
                : i % 3 === 0
                  ? "w-28"
                  : i % 3 === 1
                    ? "w-44"
                    : "w-20"
            }`}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function DefaultEmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
        {message || "Tidak ada data ditemukan"}
      </p>
    </div>
  );
}

// ─── Pagination Footer ────────────────────────────────────────────────────────
function TablePagination({
  page,
  totalPages,
  total,
  rowsPerPage,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
  variant,
}: {
  page: number;
  totalPages: number;
  total: number;
  rowsPerPage: number;
  rowsPerPageOptions?: number[];
  onPageChange: (p: number) => void;
  onRowsPerPageChange?: (rpp: number) => void;
  variant: "default" | "rounded";
}) {
  const from = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to = Math.min(page * rowsPerPage, total);

  if (variant === "rounded") {
    // Retur-style pagination (round, minimal, centered chevrons)
    return (
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onRowsPerPageChange && rowsPerPageOptions && (
            <select
              className="px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-600 uppercase tracking-widest shadow-sm outline-none"
              value={rowsPerPage}
              onChange={(e) => {
                onRowsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
            >
              {rowsPerPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          )}
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Menampilkan{" "}
            <span className="text-indigo-600">{from}</span> -{" "}
            <span className="text-indigo-600">{to}</span> dari{" "}
            <span className="text-slate-800 font-black">{total}</span> data
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter tabular-nums">
              Page {page} of {totalPages}
            </span>
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || totalPages === 0}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages || totalPages === 0}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all active:scale-90 shadow-sm"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Default variant — Dashboard style
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white text-sm">
      <div className="text-sm text-gray-700 flex items-center gap-2">
        Rows per page
        {onRowsPerPageChange && rowsPerPageOptions ? (
          <select
            className="px-2 py-1 rounded-md bg-white border border-gray-300 text-black text-sm"
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
          >
            {rowsPerPageOptions.map((n) => (
              <option key={n} value={n} className="text-black text-sm">
                {n}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-bold">{rowsPerPage}</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-black">
        <span>
          Page <span className="font-bold">{page}</span> of{" "}
          <span className="font-bold">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            title="Halaman Pertama"
          >
            «
          </button>
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            title="Sebelumnya"
          >
            ‹
          </button>
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            title="Selanjutnya"
          >
            ›
          </button>
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            title="Halaman Terakhir"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main DataTable Component ─────────────────────────────────────────────────
export default function DataTable<T = any>({
  columns,
  data,
  rowKey,
  total,
  page = 1,
  rowsPerPage = 15,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
  hidePagination = false,
  loading = false,
  skeletonRows = 8,
  isFetchingPage = false,
  emptyState,
  emptyMessage,
  onRowClick,
  rowClassName,
  rowNumber = false,
  stickyFirstCol = false,
  stickyLastCol = false,
  className,
  variant = "default",
  maxHeight,
  expandedKeys,
  onToggleExpand,
  renderExpandedRow,
}: DataTableProps<T>) {
  // Filter out hidden columns
  const visibleCols = useMemo(
    () => columns.filter((c) => !c.hidden),
    [columns],
  );

  const totalCount = total ?? data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const colCount = visibleCols.length + (rowNumber ? 1 : 0);

  // Resolve cell value
  const getCellValue = (row: T, col: ColumnDef<T>) => {
    return (row as any)?.[col.key];
  };

  // --- Variant-specific class tokens ---
  const isRounded = variant === "rounded";

  const wrapperCls = isRounded
    ? "bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden relative animate-in zoom-in-95 duration-500"
    : "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden";

  const headerRowCls = isRounded
    ? "bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest"
    : "text-gray-700 text-sm uppercase tracking-wider border-b border-gray-100";

  const headerCellCls = isRounded
    ? "px-6 py-5 whitespace-nowrap"
    : "px-6 py-3 font-semibold sticky top-0 z-10 bg-white";

  const bodyCls = isRounded
    ? `divide-y divide-slate-50 transition-all duration-300 ${isFetchingPage ? "opacity-50 pointer-events-none scale-[0.998]" : "opacity-100"}`
    : `divide-y divide-gray-100 text-[0.95rem] transition-opacity duration-200 ${isFetchingPage ? "opacity-50 pointer-events-none" : "opacity-100"}`;

  const rowCls = isRounded
    ? "hover:bg-slate-50/80 transition-colors group cursor-pointer"
    : "hover:bg-gray-50 transition-colors cursor-pointer group";

  const cellCls = isRounded ? "px-6 py-4" : "px-6 py-4 align-top";

  // Sticky column styles
  const stickyFirstThCls = isRounded
    ? "sticky left-0 z-20 bg-slate-50/95 backdrop-blur px-6 py-5 w-20 text-center border-r border-slate-100"
    : "px-6 py-3 font-semibold sticky top-0 left-0 z-20 bg-white w-16 border-r border-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]";

  const stickyFirstTdCls = isRounded
    ? "sticky left-0 z-10 bg-white group-hover:bg-slate-50/95 backdrop-blur px-6 py-4 text-xs font-black text-slate-400 text-center tabular-nums border-r border-slate-100 transition-colors"
    : "px-6 py-4 align-top text-slate-600 font-semibold tabular-nums sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]";

  const stickyLastThCls = isRounded
    ? "sticky right-0 z-20 bg-slate-50/95 backdrop-blur px-6 py-5 text-right border-l border-slate-100"
    : "px-6 py-3 font-semibold text-center sticky top-0 z-10 bg-white";

  const stickyLastTdCls = isRounded
    ? "sticky right-0 z-10 bg-white group-hover:bg-slate-50/95 backdrop-blur px-6 py-4 text-right border-l border-slate-100 transition-colors"
    : "px-6 py-4 align-top sticky right-0 z-10 bg-white group-hover:bg-gray-50";

  // Alignment helper
  const alignCls = (align?: string) =>
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";

  return (
    <div className={className || wrapperCls}>
      <div
        className={`overflow-x-auto scrollbar-hide ${isRounded ? "py-2" : ""}`}
        style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
      >
        <table
          className={`w-full text-left border-collapse ${isRounded ? "table-auto" : "table-fixed text-sm min-w-[1200px]"}`}
        >
          {/* ── THEAD ──────────────────────────────────────── */}
          <thead>
            <tr className={headerRowCls}>
              {/* Row number header */}
              {rowNumber && (
                <th
                  className={
                    stickyFirstCol ? stickyFirstThCls : `${headerCellCls} w-16 text-center`
                  }
                >
                  NO
                </th>
              )}

              {/* Data columns */}
              {visibleCols.map((col, ci) => {
                const isFirst = !rowNumber && ci === 0 && stickyFirstCol;
                const isLast = ci === visibleCols.length - 1 && stickyLastCol;

                const thCls = isFirst
                  ? stickyFirstThCls
                  : isLast
                    ? stickyLastThCls
                    : `${headerCellCls} ${col.width || ""} ${alignCls(col.align)}`;

                return (
                  <th key={col.key} className={thCls}>
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── TBODY ──────────────────────────────────────── */}
          <tbody className={bodyCls}>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={`sk-${i}`} colCount={colCount} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  {emptyState || (
                    <DefaultEmptyState message={emptyMessage} />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key = rowKey ? rowKey(row, idx) : idx;
                const keyStr = String(key);
                const extraCls = rowClassName ? rowClassName(row, idx) : "";
                const isExpanded = expandedKeys?.has(keyStr) ?? false;

                return (
                  <Fragment key={key}>
                    <tr
                      className={`${rowCls} ${extraCls} ${isExpanded && renderExpandedRow ? (isRounded ? "bg-indigo-50/30" : "bg-gray-50/50") : ""}`}
                      onClick={() => onRowClick?.(row, idx)}
                    >
                      {/* Row number cell */}
                      {rowNumber && (
                        <td
                          className={
                            stickyFirstCol ? stickyFirstTdCls : `${cellCls} text-center text-slate-500 font-semibold tabular-nums`
                          }
                        >
                          {(page - 1) * rowsPerPage + idx + 1}
                        </td>
                      )}

                      {/* Data cells */}
                      {visibleCols.map((col, ci) => {
                        const val = getCellValue(row, col);
                        const isFirst = !rowNumber && ci === 0 && stickyFirstCol;
                        const isLast =
                          ci === visibleCols.length - 1 && stickyLastCol;

                        const tdCls = isFirst
                          ? stickyFirstTdCls
                          : isLast
                            ? stickyLastTdCls
                            : `${cellCls} ${alignCls(col.align)}`;

                        return (
                          <td key={col.key} className={tdCls}>
                            {col.render
                              ? col.render(val, row, idx)
                              : (val ?? "-")}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Expanded content row */}
                    {isExpanded && renderExpandedRow && (
                      renderExpandedRow(row, idx)
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ────────────────────────────────────── */}
      {!hidePagination && !loading && data.length > 0 && onPageChange && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={totalCount}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          variant={variant}
        />
      )}
    </div>
  );
}
