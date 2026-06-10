import React from "react";

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="flex-1">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`h-4 bg-slate-200 dark:bg-slate-700 rounded ${i === 0 ? "w-8" : i % 3 === 0 ? "w-28" : i % 3 === 1 ? "w-44" : "w-20"}`}
          />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ colCount = 8, rowCount = 10 }: { colCount?: number, rowCount?: number }) {
  return (
    <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-left border-collapse table-auto text-sm min-w-[1200px]">
          <thead>
            <tr className="text-gray-700 text-sm uppercase tracking-wider border-b border-gray-100">
              {Array.from({ length: colCount }).map((_, i) => (
                <th
                  key={i}
                  className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white"
                >
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRowSkeleton key={i} colCount={colCount} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
