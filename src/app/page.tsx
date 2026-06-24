"use client";

import dynamic from "next/dynamic";
import StatCard from "@/components/card";
import { PoDateBadge } from "@/components/PoDateBadge";

// Dynamic imports for complex components
const ChartAreaInteractive = dynamic(() => import("@/components/chart-area-interactive").then(mod => mod.ChartAreaInteractive), { ssr: false });
const PODetailModal = dynamic(() => import("@/components/po-detail-modal"), { ssr: false });
const POEditModal = dynamic(() => import("@/components/po-edit-modal"), { ssr: false });
const POFilters = dynamic(() => import("@/components/po-filters"), { ssr: false });

import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { getDashboardColumns } from "./_components/DashboardColumns";
import { Briefcase, Eye, Check, ClockAlert, CalendarClock, UserPlus } from "lucide-react";
import { useState, useMemo, Suspense } from "react";
import SmoothSelect from "@/components/ui/smooth-select";
import { useAutoRefreshTick } from "@/components/auto-refresh";

// Custom Hooks
import { useAuthData } from "@/hooks/useAuthData";
import { useMasterUnits } from "@/hooks/useMasterUnits";
import { usePoStats } from "@/hooks/usePoStats";
import { usePoTable } from "@/hooks/usePoTable";

// Extracted Components
import { StatCardSkeleton, TableSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { AssignDropdown } from "@/components/assign-dropdown";
import { Button } from "@/components/ui/button";

export default function Home() {
  const refreshTick = useAutoRefreshTick();
  
  // Custom Hooks calls
  const { role, regional, siteArea, roleReady, authLoading } = useAuthData();
  const { unitData } = useMasterUnits();
  
  // Table Hook
  const poTable = usePoTable({ role, regional, siteArea, initialGroup: "all" });
  
  // Stats Hook
  const { stats, statsLoading } = usePoStats({
    roleReady, role, regional, siteArea,
    dateFrom: poTable.dateFrom, dateTo: poTable.dateTo
  });

  const [tableFocus, setTableFocus] = useState<"active" | "assign" | "almost_expired" | "expired" | "completed" | null>(null);

  const showStatsSkeleton = authLoading || !roleReady || statsLoading;

  const focusTable = (group: "active" | "assign" | "almost_expired" | "expired" | "completed") => {
    setTableFocus(group);
    setTimeout(() => {
      document.getElementById("po-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <main>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
        {showStatsSkeleton ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="PO Total"
              value={String(stats.totalCount)}
              subValue={`${stats.totalCount} total`}
              subLabel=""
              color=""
              variant="amber"
              icon={<Briefcase size={20} />}
              tooltip="Total keseluruhan po"
            />
            <StatCard
              title="PO Active"
              value={String(stats.activeCount)}
              subValue={`${stats.activeCount} active`}
              subLabel=""
              color=""
              variant="blue"
              icon={<Eye size={20} />}
              onClick={() => focusTable("active")}
              tooltip="PO yang belum melewati tgl due date dan belum memiliki no invoice"
            />
            <StatCard
              title="PO Need To Assign"
              value={String(stats.needAssignCount)}
              subValue={`${stats.needAssignCount} need assign`}
              subLabel=""
              color=""
              variant="amber"
              icon={<UserPlus size={20} />}
              onClick={() => focusTable("assign")}
              tooltip="Regional/site area masih kosong"
            />
            <StatCard
              title="PO Almost Expired"
              value={String(stats.almostExpiredCount)}
              subValue={`${stats.almostExpiredCount} within 14 days`}
              subLabel=""
              color=""
              variant="rose"
              icon={<ClockAlert size={20} />}
              onClick={() => focusTable("almost_expired")}
              tooltip="PO h-1 due date"
            />
            <StatCard
              title="PO Expired"
              value={String(stats.expiredCount)}
              subValue={`${stats.expiredCount} expired`}
              subLabel=""
              color=""
              variant="rose"
              icon={<CalendarClock size={20} />}
              onClick={() => focusTable("expired")}
              tooltip="Sudah melewati due date"
            />
            <StatCard
              title="PO Completed"
              value={String(stats.completedCount)}
              subValue={`Selesai`}
              subLabel=""
              color=""
              variant="emerald"
              icon={<Check size={20} />}
              onClick={() => focusTable("completed")}
              tooltip="PO completed"
            />
          </>
        )}
      </div>

      {roleReady && role === "pusat" && (
        <div className="mt-8">
          <ChartAreaInteractive role={role} regional={regional} />
        </div>
      )}
      
      {/* Table bawah chart - full width */}
      <div
        id="po-table"
        className="mt-8 bg-white dark:bg-slate-800 text-black dark:text-slate-100 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors"
      >
        <Suspense fallback={<div className="p-10 text-center text-slate-500">Memuat tabel...</div>}>
          <TableUnderChart
            refreshTick={refreshTick}
            role={role}
            regional={regional}
            siteArea={siteArea}
            units={unitData}
            focusGroup={tableFocus}
            onFocusApplied={() => setTableFocus(null)}
            poTable={poTable}
          />
        </Suspense>
      </div>
    </main>
  );
}

function TableUnderChart({
  role,
  regional,
  units,
  focusGroup,
  onFocusApplied,
  poTable,
}: {
  refreshTick: number;
  role: "pusat" | "rm" | "sitearea" | null;
  regional: string | null;
  siteArea: string | null;
  units: any[];
  focusGroup: "active" | "assign" | "almost_expired" | "expired" | "completed" | null;
  onFocusApplied: () => void;
  poTable: ReturnType<typeof usePoTable>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editNoPo, setEditNoPo] = useState<string | null>(null);
  
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  
  const modalOpen = detailOpen || editOpen;
  


  // Effect to apply focus group
  useMemo(() => {
    if (focusGroup) {
      poTable.setGroup(focusGroup);
      onFocusApplied();
    }
  }, [focusGroup, poTable, onFocusApplied]);

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const isCompleted = (po: any) => {
    const inv = String(po?.noInvoice || "").trim();
    return inv.length > 0 && inv !== "-" && inv.toLowerCase() !== "unknown";
  };

  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const getCompanyName = (po: any) => {
    const candidates = [
      "company", "companyName", "vendor", "supplier", "namaPt", "retailer", "name",
    ];
    for (const key of candidates) {
      const v = (po as any)[key];
      if (!v) continue;
      if (typeof v === "string" && v.trim().length > 0) return v;
      if (typeof v === "object") {
        if (v?.name) return v.name;
        if (v?.namaPt) return v.namaPt;
      }
    }
    if (po?.RitelModern?.namaPt) return po.RitelModern.namaPt;
    return "-";
  };

  const statusText = (po: any) => {
    if (!isCompleted(po)) {
      const du = daysUntil(toDate(po.expiredTgl));
      if (du != null) {
        if (du < 0) return "Expired";
        if (du <= 14) return "Almost Expired";
      }
      return "Active";
    }
    return "Done";
  };

  const statusChipClass = (t: string) =>
    t === "Done"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : t === "Almost Expired"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

  const dueFlag = (po: any) => {
    if (isCompleted(po)) return null;
    const du = daysUntil(toDate(po?.expiredTgl));
    if (du == null) return null;
    if (du < 0) return { label: "Expired", className: "bg-rose-200 text-rose-800 ring-1 ring-rose-300" };
    if (du <= 3) return { label: `D-${du}`, className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" };
    if (du <= 7) return { label: `D-${du}`, className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" };
    return null;
  };

  const openDetail = async (po: any) => {
    const nopo = String(po?.noPo || po?.nopo || po?.poNumber || "").trim();
    let fullPo: any = po;
    if (nopo) {
      try {
        const params = new URLSearchParams();
        params.set("noPo", nopo);
        params.set("includeItems", "true");
        params.set("limit", "1");
        const res = await fetch(`/api/po?${params.toString()}`);
        const json = await res.json();
        if (json?.data?.[0]) fullPo = json.data[0];
      } catch {}
    }

    const items: any[] = Array.isArray(fullPo?.Items) ? fullPo.Items : [];
    const mappedItems = items.map((it: any, idx: number) => ({
      id: it?.id ?? `item-${idx}`,
      pcs: Number(it?.pcs || 0),
      pcsKirim: Number(it?.pcsKirim || 0),
      hargaPcs: Number(it?.hargaPcs || 0),
      nominal: Number(it?.nominal || 0),
      Product: { name: String(it?.Product?.name || "-") },
    }));

    setDetailData({
      ...fullPo,
      id: fullPo?.id || "",
      noPo: fullPo?.noPo || fullPo?.nopo || "-",
      company: getCompanyName(fullPo),
      Items: mappedItems,
    });
    setDetailOpen(true);
  };

  const columnDefs = useMemo(() => [
    { key: "company", label: "Company" },
    { key: "nopo", label: "No PO" },
    { key: "pcsPo", label: "PCS PO" },
    { key: "nominal", label: "Nominal" },
    { key: "submitDate", label: "Submit Date" },
    { key: "tglPo", label: "Tgl PO" },
    { key: "tglKirim", label: "Tgl Kirim" },
    { key: "dueDate", label: "Tgl Expired" },
    { key: "regional", label: "Regional" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ], []);



  if (!role) {
    return <TableSkeleton />;
  }

  return (
    <>
      {poTable.poLoadError && (
        <div className="mx-5 mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Gagal load data: {poTable.poLoadError}
        </div>
      )}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 relative z-30 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full">
            {!modalOpen && (
              <>
                <div className="relative w-full md:w-auto z-40">
                  <SmoothSelect
                    width={172}
                    value={poTable.group}
                    onChange={(v) => { poTable.setPage(1); poTable.setGroup(v as any); }}
                    options={[
                      { value: "all", label: "All" },
                      { value: "active", label: "Active" },
                      { value: "assign", label: "Need To Assign" },
                      { value: "almost_expired", label: "Almost Expired" },
                      { value: "expired", label: "Expired" },
                      { value: "completed", label: "Completed" },
                    ]}
                  />
                </div>
                
                <Button 
                  variant={poTable.sortDesc ? "default" : "outline"} 
                  size="sm" 
                  className="rounded-full"
                  onClick={() => { poTable.setPage(1); poTable.setSortDesc((v) => !v); }}
                >
                  Newest First
                </Button>
                
                <Button 
                  variant={poTable.alphaSort !== "none" ? "default" : "outline"} 
                  size="sm" 
                  className="rounded-full"
                  onClick={() => {
                    poTable.setPage(1);
                    poTable.setAlphaSort((v) => v === "none" ? "asc" : v === "asc" ? "desc" : "none");
                  }}
                >
                  {poTable.alphaSort === "asc" ? "Company A-Z" : poTable.alphaSort === "desc" ? "Company Z-A" : "Company Sort"}
                </Button>

                <div className="w-full md:w-auto">
                  <POFilters
                    unitData={units}
                    searchValue={poTable.debouncedSearch}
                    onSearchChange={poTable.handleSearchChange}
                    dateFrom={poTable.dateFrom}
                    dateTo={poTable.dateTo}
                    regionalValue={role === "rm" || role === "sitearea" ? regional || "" : poTable.regionalFilter}
                    siteAreaValue={poTable.siteAreaFilter}
                    regionalLocked={role === "rm" || role === "sitearea"}
                    siteAreaLocked={role === "sitearea"}
                    onFilterChange={poTable.handleFilterChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <DataTableV2
        columns={getDashboardColumns({
          role,
          poTableGroup: poTable.group,
          units,
          regional,
          onAssign: (po, unit) => {
            poTable.setAllPoData((prev) =>
              prev.map((x) => x.noPo === po.noPo ? { ...x, UnitProduksi: { ...(x.UnitProduksi || {}), siteArea: unit.siteArea, namaRegional: unit.namaRegional }, regional: unit.namaRegional } : x)
            );
          },
          onEdit: (po) => { setEditNoPo(po.noPo); setEditOpen(true); },
          onView: (po) => openDetail(po),
        }) as any}
        data={poTable.allPoData}
        loading={poTable.loading}
        isFetching={poTable.isFetchingPage}
        manualPagination={true}
        pageCount={Math.ceil(poTable.serverTotal / poTable.rowsPerPage)}
        pagination={{ pageIndex: poTable.page - 1, pageSize: poTable.rowsPerPage }}
        onPaginationChange={(updater) => {
          if (typeof updater === 'function') {
            const newState = updater({ pageIndex: poTable.page - 1, pageSize: poTable.rowsPerPage });
            poTable.setPage(newState.pageIndex + 1);
            poTable.setRowsPerPage(newState.pageSize);
          } else {
            poTable.setPage(updater.pageIndex + 1);
            poTable.setRowsPerPage(updater.pageSize);
          }
        }}
        manualSorting={true}
        sorting={poTable.sorting}
        onSortingChange={poTable.setSorting}
        manualFiltering={true}
        columnFilters={poTable.columnFilters}
        onColumnFiltersChange={poTable.setColumnFilters}
      />
      <PODetailModal open={detailOpen} onClose={() => setDetailOpen(false)} data={detailData} />
      <POEditModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditNoPo(null); }}
        noPo={editNoPo}
        returnMode="summary"
        onSaved={(updated) => poTable.fetchTable().then(o => o && poTable.setAllPoData(o.list))}
      />
    </>
  );
}
