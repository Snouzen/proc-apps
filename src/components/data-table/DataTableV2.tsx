"use client";

import React, { useState } from "react";
import SmoothSelect from "@/components/ui/smooth-select";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  ColumnPinningState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  MoreVertical,
  EyeOff,
  Pin,
  ArrowLeft,
  Columns,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

interface DataTableV2Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  isFetching?: boolean;
  onRowClick?: (row: TData) => void;
  getRowId?: (originalRow: TData, index: number, parent?: any) => string;
  meta?: any;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  expandedKeys?: Set<string>;
  // Server-side props
  manualPagination?: boolean;
  hidePagination?: boolean;
  pageCount?: number;
  pagination?: { pageIndex: number; pageSize: number };
  onPaginationChange?: (updater: any) => void;
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: (updater: any) => void;
  manualFiltering?: boolean;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (updater: any) => void;
}

function ColumnMenuPopover({ column, table }: { column: any, table: any }) {
  const columnFilterValue = column.getFilterValue();
  const isSorted = column.getIsSorted();
  const isPinned = column.getIsPinned();
  const [view, setView] = useState<"menu" | "manage">("menu");

  return (
    <Popover.Root onOpenChange={(open) => { if (!open) setTimeout(() => setView("menu"), 200) }}>
      <Popover.Trigger asChild>
        <button suppressHydrationWarning className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 opacity-100 focus:opacity-100">
          <MoreVertical size={14} className={(column.getIsFiltered() || isSorted || isPinned) ? "text-blue-500" : ""} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={5}
          className="z-50 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {view === "menu" ? (
            <div className="flex flex-col py-1">
              {/* Sorting */}
              {column.getCanSort() && (
                <>
                  <button
                    onClick={() => column.toggleSorting(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isSorted === "asc" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    <ArrowUp size={16} /> Sort by ASC
                  </button>
                  <button
                    onClick={() => column.toggleSorting(true)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isSorted === "desc" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    <ArrowDown size={16} /> Sort by DESC
                  </button>
                  {isSorted && (
                    <button
                      onClick={() => column.clearSorting()}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                    >
                      <X size={16} /> Clear Sort
                    </button>
                  )}
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2" />
                </>
              )}

              {/* Pinning */}
              {column.getCanPin() && (
                <>
                  <button
                    onClick={() => column.pin("left")}
                    className={`flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isPinned === "left" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    <Pin size={16} className="-scale-x-100" /> Pin to left
                  </button>
                  <button
                    onClick={() => column.pin("right")}
                    className={`flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isPinned === "right" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    <Pin size={16} /> Pin to right
                  </button>
                  {isPinned && (
                    <button
                      onClick={() => column.pin(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                    >
                      <X size={16} /> Unpin
                    </button>
                  )}
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2" />
                </>
              )}

              {/* Filter */}
              {column.getCanFilter() && (
                <div className="px-3 py-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-1">
                    <Filter size={16} /> Filter
                  </div>
                  <input
                    type="text"
                    value={(columnFilterValue ?? "") as string}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    placeholder={`Search in ${typeof column.columnDef.header === 'string' ? column.columnDef.header : 'column'}...`}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {column.getIsFiltered() && (
                    <button
                      onClick={() => column.setFilterValue(undefined)}
                      className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-left mt-1"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              )}

              {/* Visibility & Manage */}
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2" />
              {column.getCanHide() && (
                <button
                  onClick={() => column.toggleVisibility(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
                >
                  <EyeOff size={16} /> Hide Column
                </button>
              )}
              <button
                onClick={() => setView("manage")}
                className="flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
              >
                <Columns size={16} /> Manage Columns
              </button>
            </div>
          ) : (
            <div className="flex flex-col py-2 px-3 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <button 
                  onClick={() => setView("menu")}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Manage Columns</span>
              </div>
              <div className="flex flex-col gap-1">
                {table.getAllLeafColumns().map((col: any) => (
                  <label key={col.id} className="flex items-center gap-3 text-sm py-1.5 px-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition-colors text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                    />
                    {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function DataTableV2<TData, TValue>({
  columns,
  data,
  loading = false,
  isFetching = false,
  onRowClick,
  getRowId,
  meta,
  renderExpandedRow,
  expandedKeys,
  hidePagination,
  manualPagination,
  pageCount,
  pagination,
  onPaginationChange,
  manualSorting,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  manualFiltering,
  columnFilters: externalColumnFilters,
  onColumnFiltersChange: externalOnColumnFiltersChange,
}: DataTableV2Props<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});
  const [internalPagination, setInternalPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const initialVisibility = React.useMemo(() => {
    const vis: VisibilityState = {};
    columns.forEach((col: any) => {
      const id = col.id || col.accessorKey;
      if (id && col.meta?.defaultHidden) {
        vis[id] = false;
      }
    });
    return vis;
  }, [columns]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility);

  const sorting = manualSorting && externalSorting !== undefined ? externalSorting : internalSorting;
  const setSorting = manualSorting && externalOnSortingChange ? externalOnSortingChange : setInternalSorting;

  const columnFilters = manualFiltering && externalColumnFilters !== undefined ? externalColumnFilters : internalColumnFilters;
  const setColumnFilters = manualFiltering && externalOnColumnFiltersChange ? externalOnColumnFiltersChange : setInternalColumnFilters;

  const activePagination = manualPagination && pagination ? pagination : internalPagination;
  const setActivePagination = manualPagination && onPaginationChange ? onPaginationChange : setInternalPagination;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    meta,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: (manualPagination || hidePagination) ? undefined : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setActivePagination,
    manualPagination,
    pageCount,
    manualSorting,
    manualFiltering,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnPinning,
      columnVisibility,
      pagination: activePagination,
    },
  });

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="overflow-x-auto w-full bg-white dark:bg-[#0f172a]/40 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative z-0 hide-scrollbar">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  const isLastLeftPinned = isPinned === 'left' && header.column.getIsLastColumn('left');
                  const isFirstRightPinned = isPinned === 'right' && header.column.getIsFirstColumn('right');
                  
                  return (
                    <th
                      key={header.id}
                      style={{ 
                        width: header.column.getSize(),
                        minWidth: header.column.getSize(),
                        left: isPinned === 'left' ? `${header.column.getStart('left')}px` : undefined,
                        right: isPinned === 'right' ? `${header.column.getAfter('right')}px` : undefined,
                      }}
                      className={`px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap group relative bg-slate-50/95 dark:bg-slate-800/95 ${isPinned ? "sticky z-20 shadow-[0_0_10px_rgba(0,0,0,0.05)] dark:shadow-none" : "z-10"} ${isLastLeftPinned ? "border-r border-slate-200 dark:border-slate-700" : ""} ${isFirstRightPinned ? "border-l border-slate-200 dark:border-slate-700" : ""}`}
                    >
                      {header.isPlaceholder ? null : (() => {
                        const align = (header.column.columnDef.meta as any)?.align || 'left';
                        return (
                          <div className={`flex items-center w-full relative group/header ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-between'}`}>
                            <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getIsSorted() && (
                                <span className="text-blue-500 flex items-center">
                                  {header.column.getIsSorted() === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                </span>
                              )}
                            </div>
                            {(header.column.getCanFilter() || header.column.getCanSort() || header.column.getCanHide()) && (
                              <div className={`${align === 'center' || align === 'right' ? 'absolute -right-5 top-1/2 -translate-y-1/2' : ''}`}>
                                <ColumnMenuPopover column={header.column} table={table} />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className={`divide-y divide-slate-50 dark:divide-slate-800/50 relative transition-all duration-500 ease-in-out ${isFetching && !loading ? "opacity-30 blur-[2px] scale-[0.995]" : "opacity-100 blur-0 scale-100"}`}>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={`sk-${i}`} className="bg-white dark:bg-transparent">
                  {table.getVisibleLeafColumns().map((col) => {
                    const isPinned = col.getIsPinned();
                    const isLastLeftPinned = isPinned === 'left' && col.getIsLastColumn('left');
                    const isFirstRightPinned = isPinned === 'right' && col.getIsFirstColumn('right');
                    return (
                      <td
                        key={col.id}
                        style={{
                          left: isPinned === 'left' ? `${col.getStart('left')}px` : undefined,
                          right: isPinned === 'right' ? `${col.getAfter('right')}px` : undefined,
                        }}
                        className={`px-6 py-4 align-middle ${isPinned ? "sticky z-10 bg-white/95 dark:bg-[#0f172a]/95" : ""} ${isLastLeftPinned ? "border-r border-slate-100 dark:border-slate-800" : ""} ${isFirstRightPinned ? "border-l border-slate-100 dark:border-slate-800" : ""}`}
                      >
                        <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse w-full"></div>
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr
                  onClick={() => onRowClick?.(row.original)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-transparent ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isPinned = cell.column.getIsPinned();
                    const isLastLeftPinned = isPinned === 'left' && cell.column.getIsLastColumn('left');
                    const isFirstRightPinned = isPinned === 'right' && cell.column.getIsFirstColumn('right');
                    
                    return (
                      <td 
                        key={cell.id} 
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          left: isPinned === 'left' ? `${cell.column.getStart('left')}px` : undefined,
                          right: isPinned === 'right' ? `${cell.column.getAfter('right')}px` : undefined,
                        }}
                        className={`px-6 py-4 align-middle text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-[#0f172a]/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors ${isPinned ? "sticky z-10 shadow-[0_0_10px_rgba(0,0,0,0.02)] dark:shadow-none" : ""} ${isLastLeftPinned ? "border-r border-slate-100 dark:border-slate-800" : ""} ${isFirstRightPinned ? "border-l border-slate-100 dark:border-slate-800" : ""} ${(cell.column.columnDef.meta as any)?.align === 'right' ? 'text-right' : (cell.column.columnDef.meta as any)?.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
                {renderExpandedRow && expandedKeys?.has(row.id) && (
                  renderExpandedRow(row.original)
                )}
              </React.Fragment>
            ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-32 text-center text-slate-500"
                >
                  {loading ? "Memuat data..." : "Tidak ada data."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!hidePagination && (
        <div className="flex items-center justify-between px-2 text-sm text-slate-500">
          <div className="flex-1 text-sm text-slate-500">
            Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
            {table.getPageCount()} (Total {table.getFilteredRowModel().rows.length} data)
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Data per halaman</p>
              <SmoothSelect
                value={String(table.getState().pagination.pageSize)}
                onChange={(v) => table.setPageSize(Number(v))}
                options={[
                  { value: "10", label: "10" },
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                ]}
                className="w-[80px]"
                menuPlacement="top"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
