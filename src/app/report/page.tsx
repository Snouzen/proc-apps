"use client";

import { useReport } from "./hooks/useReport";
import { ReportHeader } from "./components/ReportHeader";
import { ReportFilters } from "./components/ReportFilters";
import { ReportColumns } from "./components/ReportColumns";
import { ReportTable } from "./components/ReportTable";

export default function ReportPage() {
  const hook = useReport();

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-4">
      <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-6">
        <ReportHeader hook={hook} />
        <ReportFilters hook={hook} />
        <ReportColumns hook={hook} />
      </div>

      <ReportTable hook={hook} />
    </div>
  );
}
