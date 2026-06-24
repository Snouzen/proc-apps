"use client";

import { useMemo, useState } from "react";
import PODetailModal from "@/components/po-detail-modal";
import { Search } from "lucide-react";
import { DataTableV2 } from "@/components/data-table/DataTableV2";
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

      <DataTableV2
        columns={columns as any}
        data={filteredRows}
        getRowId={(row: any) => row.id || row.noPo}
        loading={tableState.loading}
        isFetching={tableState.isTransitioning}
        manualPagination={true}
        pageCount={Math.max(1, Math.ceil(tableState.total / tableState.rowsPerPage))}
        pagination={{ pageIndex: Math.max(0, tableState.page - 1), pageSize: tableState.rowsPerPage }}
        onPaginationChange={(updater: any) => {
          const next = typeof updater === "function" 
            ? updater({ pageIndex: Math.max(0, tableState.page - 1), pageSize: tableState.rowsPerPage }) 
            : updater;
          if (next.pageSize !== tableState.rowsPerPage) {
            tableState.setRowsPerPage(next.pageSize);
            tableState.setPage(1);
          } else {
            tableState.setPage(next.pageIndex + 1);
          }
        }}
      />

      <PODetailModal
        open={detailModal.openDetail}
        onClose={() => detailModal.setOpenDetail(false)}
        data={detailModal.detailData}
      />
    </div>
  );
}
