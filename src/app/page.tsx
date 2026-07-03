"use client";

import dynamic from "next/dynamic";
import StatCard from "@/components/card";
import { PoDateBadge } from "@/components/PoDateBadge";

// Dynamic imports for complex components
const ChartAreaInteractive = dynamic(() => import("@/components/chart-area-interactive").then(mod => mod.ChartAreaInteractive), { ssr: false });
const PODetailModal = dynamic(() => import("@/components/po-detail-modal"), { ssr: false });
const POEditModal = dynamic(() => import("@/components/po-edit-modal"), { ssr: false });
const POFilters = dynamic(() => import("@/components/po-filters"), { ssr: false });
const PoStatusDonut = dynamic(() => import("@/components/dashboard-widgets").then(m => m.PoStatusDonut), { ssr: false });
const RegionalDistributionBar = dynamic(() => import("@/components/dashboard-widgets").then(m => m.RegionalDistributionBar), { ssr: false });
const ExpiringPoMiniTable = dynamic(() => import("@/components/dashboard-widgets").then(m => m.ExpiringPoMiniTable), { ssr: false });
const PoReadinessRadialChart = dynamic(() => import("@/components/dashboard-widgets").then(m => m.PoReadinessRadialChart), { ssr: false });
const MonthlyTrendAreaChart = dynamic(() => import("@/components/dashboard-widgets").then(m => m.MonthlyTrendAreaChart), { ssr: false });
const RecentActivityWidget = dynamic(() => import("@/components/dashboard-widgets").then(m => m.RecentActivityWidget), { ssr: false });

import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { getDashboardColumns } from "./_components/DashboardColumns";
import { Briefcase, Eye, Check, ClockAlert, CalendarClock, UserPlus } from "lucide-react";
import { useState, useMemo, useEffect, Suspense } from "react";
import SmoothSelect from "@/components/ui/smooth-select";
import { useAutoRefreshTick } from "@/components/auto-refresh";

import { useRouter } from "next/navigation";

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
  const { role, regional, siteArea, email, roleReady, authLoading } = useAuthData();
  const { unitData } = useMasterUnits();

  // Format username and role based on header logic (clientlayout.tsx)
  const headerTitle = role === "magang" ? "Admin Sales 1" : role === "sitearea"
    ? email ? email.split("@")[0] : "ADMIN CABANG"
    : role === "rm"
      ? regional || "Regional Manager"
      : "ADMIN PUSAT";

  const userName = String(headerTitle).replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const displayRole = role === "magang" ? "Admin Bisnis" : role === "sitearea"
    ? regional || "-"
    : role === "rm"
      ? "Regional Manager"
      : "Super Admin";
  
  // Table Hook
  const poTable = usePoTable({ role, regional, siteArea, initialGroup: "all" });
  
  // Stats Hook
  const { stats, statsLoading } = usePoStats({
    roleReady, role, regional, siteArea,
    dateFrom: poTable.dateFrom, dateTo: poTable.dateTo
  });

  const router = useRouter();
  const showStatsSkeleton = authLoading || !roleReady || statsLoading;

  const focusTable = (group: "active" | "assign" | "almost_expired" | "expired" | "completed") => {
    router.push(`/purchase-order?group=${group}`);
  };

  return (
    <main>
      {/* Main Dashboard Layout (Top & Middle Rows combined) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Cards & Charts */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Top Row (inside Left Column) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Greeting Card */}
            <div className="md:col-span-2 lg:col-span-2 bg-indigo-700 dark:bg-indigo-900 text-white rounded-2xl p-8 flex flex-col justify-center shadow-sm">
              <h2 className="text-lg font-medium text-indigo-200">
                Welcome Back,
              </h2>
              <p className="text-3xl font-bold tracking-tight truncate text-white mt-1">
                {userName}
              </p>
            </div>

            {showStatsSkeleton ? (
              Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  title="Total PO"
                  value={String(stats.totalCount)}
                  subValue={`${stats.totalCount} total`}
                  subLabel=""
                  color=""
                  variant="blue"
                  icon={<Briefcase size={20} />}
                  tooltip="Total keseluruhan PO di sistem"
                />
                <StatCard
                  title="Active PO"
                  value={String(stats.activeCount)}
                  subValue={`${stats.activeCount} active`}
                  subLabel=""
                  color=""
                  variant="emerald"
                  icon={<Eye size={20} />}
                  onClick={() => focusTable("active")}
                  tooltip="PO aktif (belum invoice & belum expired)"
                />
                <StatCard
                  title="Need Assign"
                  value={String(stats.needAssignCount)}
                  subValue={`${stats.needAssignCount} pending`}
                  subLabel=""
                  color=""
                  variant="amber"
                  icon={<UserPlus size={20} />}
                  onClick={() => focusTable("assign")}
                  tooltip="PO yang belum di-assign (Regional/Site Area kosong)"
                />
              </>
            )}
          </div>

          {/* Middle Row (inside Left Column) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              <PoStatusDonut stats={stats} />
            </div>
            <div className="md:col-span-1">
              <RegionalDistributionBar stats={stats} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Expiring PO Mini Table */}
        <div className="xl:col-span-1 relative min-h-[400px] xl:min-h-0">
          <div className="xl:absolute xl:inset-0 h-full">
            {showStatsSkeleton ? (
              <div className="h-full w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm animate-pulse" />
            ) : (
              <ExpiringPoMiniTable 
                role={role || undefined} 
                regional={regional || undefined} 
                siteArea={siteArea || undefined} 
                totalAlmostExpired={stats.almostExpiredCount} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row Widgets */}
      {roleReady && !showStatsSkeleton && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-1 h-full min-h-[300px]">
            <PoReadinessRadialChart stats={stats} />
          </div>
          <div className="md:col-span-1 h-full min-h-[300px]">
            <MonthlyTrendAreaChart />
          </div>
          <div className="md:col-span-1 h-full min-h-[300px]">
            <RecentActivityWidget />
          </div>
        </div>
      )}

      {roleReady && role === "pusat" && (
        <div className="mt-8">
          <ChartAreaInteractive role={role} regional={regional} />
        </div>
      )}
      
    </main>
  );
}
