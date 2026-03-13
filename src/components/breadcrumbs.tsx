"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const routeNameMap: Record<string, string> = {
  "master-data": "Master Data",
  "unit-produksi": "Unit Produksi",
  produk: "Produk",
  "ritel-modern": "Ritel Modern",
  company: "Company",
  po: "Purchase Order",
};

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Home size={18} className="text-slate-400" />
        <span className="font-semibold text-slate-700">Dashboard</span>
      </div>
    );
  }

  const segments = pathname.split("/").filter(Boolean);
  const useCompanyRoot = pathname === "/po" || pathname.startsWith("/po/");

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-hide">
      {useCompanyRoot ? (
        <Link
          href="/company"
          className="hover:text-slate-800 transition-colors truncate max-w-[150px]"
        >
          Company
        </Link>
      ) : (
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-slate-800 transition-colors"
        >
          <Home size={18} className="text-slate-400" />
        </Link>
      )}

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = `/${segments.slice(0, index + 1).join("/")}`;

        let label = routeNameMap[segment] || segment;

        // Simple heuristic to detect IDs (UUID or numbers)
        if (segment.length > 20 || !isNaN(Number(segment))) {
          label = "Detail";
        }

        // Capitalize if not mapped
        if (label === segment) {
          label =
            label.charAt(0).toUpperCase() + label.slice(1).replace(/-/g, " ");
        }

        return (
          <Fragment key={href}>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
            {isLast ? (
              <span className="font-bold text-slate-800 truncate max-w-[200px]">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-slate-800 transition-colors truncate max-w-[150px]"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
