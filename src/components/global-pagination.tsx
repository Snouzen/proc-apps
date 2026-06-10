"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function GlobalPagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsCount,
  totalItems,
  itemName = "data",
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  itemsCount: number;
  totalItems: number;
  itemName?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none px-6 py-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Menampilkan <span className="font-bold text-slate-700 dark:text-slate-200">{itemsCount}</span> dari{" "}
        <span className="font-bold text-slate-700 dark:text-slate-200">{totalItems}</span> {itemName}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                page === currentPage
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/50"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );
}
