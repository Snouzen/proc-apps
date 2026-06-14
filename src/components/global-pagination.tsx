"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export const usePagination = ({
  currentPage,
  totalPages,
  siblingCount = 1,
}: {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
}) => {
  const range = (start: number, end: number) => {
    let length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  const DOTS = "...";

  const paginationRange = () => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = range(1, leftItemCount);
      return [...leftRange, DOTS, totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [firstPageIndex, DOTS, ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }

    return [];
  };

  return paginationRange();
};

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
        
        {usePagination({ currentPage, totalPages }).map((page, index) => {
          if (page === "...") {
            return (
              <span key={`dots-${index}`} className="w-9 h-9 flex items-center justify-center text-xs font-bold text-slate-400">
                ...
              </span>
            );
          }
          return (
            <button
              key={index}
              onClick={() => onPageChange(page as number)}
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
