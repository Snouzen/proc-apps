"use client";

import { Search, X } from "lucide-react";

export function CreditLimitSearchBar({
  value,
  onChange,
  placeholder = "Search No PO, Site, Company...",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative group">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors"
        size={16}
      />
      <input
        type="text"
        placeholder={placeholder}
        className="pl-9 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500/40 transition-all w-full md:w-72 shadow-sm dark:shadow-none text-slate-700 dark:text-slate-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        suppressHydrationWarning
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
