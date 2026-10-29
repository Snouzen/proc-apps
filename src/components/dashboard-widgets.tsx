"use client";

import { openDashboardPOs } from "@/lib/dashboardDrilldown";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PoDateBadge } from "@/components/PoDateBadge";
import { ArrowRight, FileWarning, Activity, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import DateInputHybrid from "@/components/DateInputHybrid";

const COLORS = ["#3b82f6", "#f59e0b", "#f43f5e", "#10b981", "#64748b"];


/** Measure chart space, including changes caused by the neighbouring PO list/sidebar. */
function useWidgetChartSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const ref = React.useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      const next = { width: Math.round(width), height: Math.round(height) };
      setSize(current => current.width === next.width && current.height === next.height ? current : next);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(node);
    }
  }, []);
  useEffect(() => () => observerRef.current?.disconnect(), []);
  return [ref, size] as const;
}

export function PoStatusDonut({ stats }: { stats: any }) {
  const data = [
    { name: "Active", value: stats.activeCount || 0 },
    { name: "Need Assign", value: stats.needAssignCount || 0 },
    { name: "Almost Expired", value: stats.almostExpiredCount || 0 },
    { name: "Expired", value: stats.expiredCount || 0 },
    { name: "Completed", value: stats.completedCount || 0 },
  ].filter(d => d.value > 0);

  const STATUS_COLORS: Record<string, string> = {
    "Active": "#3b82f6",
    "Need Assign": "#f59e0b",
    "Almost Expired": "#f43f5e",
    "Expired": "#10b981",
    "Completed": "#8b5cf6", // Purple/Violet for Completed
  };

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full min-h-fit min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Status Keseluruhan PO
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-[300px] min-w-0 px-4 sm:px-6 pb-6">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">Tidak ada data</div>
        ) : (
          <>
          <div className="flex-1 min-h-[240px] min-w-0 w-full" data-dashboard-status-chart>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="84%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                onClick={(entry: any) => openDashboardPOs({ group: ({ Active: "active", "Need Assign": "assign", "Almost Expired": "almost_expired", Expired: "expired", Completed: "completed" } as Record<string,string>)[entry.name] || "all" }, entry.name)}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#000"} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [`${value} PO`, name]}
                contentStyle={{ fontSize: '14px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
</PieChart>
          </ResponsiveContainer>
          </div>
          <ul aria-label="Legenda status PO" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4 text-xs sm:text-sm leading-relaxed shrink-0">
            {data.map(entry => (
              <li key={entry.name} className="flex items-center gap-1.5" style={{ color: STATUS_COLORS[entry.name] }}>
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.name] }} aria-hidden="true" />
                <span>{entry.name}</span>
              </li>
            ))}
          </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function RegionalDistributionBar({ stats }: { stats?: any }) {
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [localStats, setLocalStats] = useState<any>(null);
  const [lastSuccessRange, setLastSuccessRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [chartContainerRef, chartDimensions] = useWidgetChartSize();
  const compactChart = chartDimensions.width > 0 && chartDimensions.width < 360;

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const latestReqIdRef = React.useRef<number>(0);

  const formatDateDisplay = (val: string) => {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  const formatRange = (range: { from: string; to: string }) => {
    const fromDisplay = formatDateDisplay(range.from);
    const toDisplay = formatDateDisplay(range.to);
    if (fromDisplay && toDisplay) return `${fromDisplay} s.d. ${toDisplay}`;
    if (fromDisplay) return `dari ${fromDisplay}`;
    if (toDisplay) return `s.d. ${toDisplay}`;
    return "";
  };

  useEffect(() => {
    // Abort any ongoing request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const reqId = ++latestReqIdRef.current;

    if (!tglFrom && !tglTo) {
      setLocalStats(null);
      setLastSuccessRange(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (tglFrom) params.set("tglFrom", tglFrom);
        if (tglTo) params.set("tglTo", tglTo);

        const res = await fetch(`/api/po/stats?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Gagal mengambil data filter");
        const data = await res.json();

        if (latestReqIdRef.current === reqId && !controller.signal.aborted) {
          setLocalStats(data);
          setLastSuccessRange({ from: tglFrom, to: tglTo });
          setError(null);
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || controller.signal.aborted) {
          return;
        }
        if (latestReqIdRef.current === reqId) {
          setError("Gagal memuat data filter.");
        }
      } finally {
        if (latestReqIdRef.current === reqId && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tglFrom, tglTo, retryCount]);

  const handleResetAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    latestReqIdRef.current++;
    setTglFrom("");
    setTglTo("");
    setLocalStats(null);
    setLastSuccessRange(null);
    setLoading(false);
    setError(null);
  };

  const activeStats = localStats || stats;
  const sourceData = activeStats?.topSiteAreas;
  const data = sourceData && sourceData.length > 0
    ? sourceData
    : [
        { name: "BELUM ADA DATA", po: 0 },
      ];

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full min-h-fit min-w-0 relative">
      <CardHeader className="pb-2 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2 w-full">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider min-w-0">
            Distribusi PO (Top 5)
          </CardTitle>
          {loading && (
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 animate-pulse font-semibold">
              Memuat...
            </span>
          )}
        </div>

        {error && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-lg text-xs text-rose-700 dark:text-rose-300 w-full justify-between animate-in fade-in">
            <span className="text-[10px] font-medium leading-tight">
              {error} {lastSuccessRange && localStats
                ? `(Menampilkan data terakhir berhasil dimuat: ${formatRange(lastSuccessRange)})`
                : "(Menampilkan data awal)"}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[9px] uppercase tracking-wider cursor-pointer"
              >
                Coba Lagi
              </button>
              {localStats && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-800/60 text-rose-700 dark:text-rose-300 rounded font-bold text-[9px] uppercase tracking-wider cursor-pointer"
                >
                  Ke Data Awal
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full">
          <button
            type="button"
            onClick={handleResetAll}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider shrink-0 cursor-pointer ${(!tglFrom && !tglTo) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            All
          </button>
          <div className="flex flex-1 flex-wrap gap-1.5 sm:gap-2 min-w-0 basis-[280px]">
            <div className="flex-1 min-w-[135px]">
              <DateInputHybrid
                value={tglFrom}
                onChange={setTglFrom}
                placeholder="Dari..."
                maxDate={tglTo}
                inputClassName="py-1.5 pl-2.5 text-xs font-semibold"
              />
            </div>
            <div className="flex-1 min-w-[135px]">
              <DateInputHybrid
                value={tglTo}
                onChange={setTglTo}
                placeholder="Sampai..."
                minDate={tglFrom}
                inputClassName="py-1.5 pl-2.5 text-xs font-semibold"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-[300px] min-w-0 px-4 sm:px-6 pb-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
        <div ref={chartContainerRef} className="flex-1 min-h-[260px] min-w-0 w-full" data-dashboard-distribution-chart>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: compactChart ? 12 : 24, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }: any) => {
                const label = String(payload.value ?? "");
                const limit = compactChart ? 11 : 19;
                return (
                  <text x={x} y={y} dy="0.35em" textAnchor="end" fill="#64748b" fontSize={compactChart ? 11 : 14} fontWeight={500}>
                    <title>{label}</title>
                    {label.length > limit ? label.slice(0, limit - 1) + "…" : label}
                  </text>
                );
              }}
              width={compactChart ? 88 : 144}
            />
            <Tooltip 
               cursor={{fill: '#f1f5f9'}}
               contentStyle={{ fontSize: '14px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar onClick={(entry: any) => openDashboardPOs({ siteArea: entry.name || entry.payload?.name, tglFrom: lastSuccessRange?.from || "", tglTo: lastSuccessRange?.to || "" }, "PO per Site Area")} dataKey="po" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={Math.min(compactChart ? 32 : 44, Math.max(22, (chartDimensions.height - 16) / Math.max(data.length, 1) * 0.42))}>
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpiringPoMiniTable({ role, regional, siteArea, totalAlmostExpired }: { role?: string, regional?: string, siteArea?: string, totalAlmostExpired?: number }) {
  const [pos, setPos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const fetchExpiring = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("group", "almost_expired");
        params.set("limit", "15");
        params.set("includeUnknown", "true");
        params.set("summary", "true");
        params.set("includeItems", "false");
        
        if ((role === "rm" || role === "sitearea") && regional) {
          params.set("regional", regional);
        }
        if (role === "sitearea" && siteArea) {
          params.set("siteArea", siteArea);
        }

        const res = await fetch(`/api/po?${params.toString()}`);
        const json = await res.json();
        if (mounted && json?.data) {
          setPos(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch almost expired POs", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchExpiring();
    return () => { mounted = false; };
  }, [role, regional, siteArea]);

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            PO Almost Expired
          </CardTitle>
          {totalAlmostExpired !== undefined && totalAlmostExpired > 0 && (
            <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {totalAlmostExpired}
            </span>
          )}
        </div>
        <Link onClick={e => { e.preventDefault(); openDashboardPOs({ group: "almost_expired" }, "PO Almost Expired"); }} href="/purchase-order" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
          VIEW ALL <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-2 pb-2 min-h-0">
        {loading ? (
          <div className="flex flex-col h-full items-center justify-center text-slate-400 text-sm gap-2">
            Memuat data...
          </div>
        ) : pos.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-slate-400 text-sm gap-2">
            <FileWarning size={24} className="opacity-20" />
            Tidak ada PO Almost Expired
          </div>
        ) : (
          <div className="w-full flex-1 overflow-auto custom-scrollbar">
            <table className="w-full min-w-[380px] text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                  <th className="font-semibold text-slate-600 dark:text-slate-400 py-3 pr-2 w-[28%]">No PO</th>
                  <th className="font-semibold text-slate-600 dark:text-slate-400 py-3 px-2 w-[32%]">Nama Ritel</th>
                  <th className="font-semibold text-slate-600 dark:text-slate-400 py-3 px-2 w-[20%]">Site Area</th>
                  <th className="font-semibold text-slate-600 dark:text-slate-400 py-3 px-2 w-[20%] text-right">Tgl Expired</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po: any, i: number) => {
                  const retailerName = po.RitelModern?.namaPt || po.companyName || "Unknown Retailer";
                  const siteAreaText = po.UnitProduksi?.siteArea || po.siteArea || "-";
                  const expiredDate = po.expiredTgl 
                    ? new Date(po.expiredTgl).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })
                    : "-";
                  return (
                    <tr 
                      key={i} onClick={() => openDashboardPOs({ noPo: po.noPo }, "Detail " + po.noPo)}
                      className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors last:border-0"
                    >
                      <td className="py-3 pr-2 font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                        {po.noPo}
                      </td>
                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300 truncate" title={retailerName}>
                        {retailerName}
                      </td>
                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300 truncate" title={siteAreaText}>
                        {siteAreaText}
                      </td>
                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300 text-right truncate">
                        <span className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-md font-medium text-[11px]">
                          {expiredDate}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PoReadinessRadialChart({ stats }: { stats: any }) {
  const assigned = (stats.totalCount || 0) - (stats.needAssignCount || 0);
  const unassigned = stats.needAssignCount || 0;
  
  const data = [
    { name: "Assigned", value: assigned, fill: "#10b981" },
    { name: "Unassigned", value: unassigned, fill: "#f59e0b" }
  ];

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Rasio Kesiapan PO
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              onClick={(entry: any) => openDashboardPOs({ group: entry.name === "Unassigned" ? "assign" : "assigned" }, entry.name)}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`${value} PO`, ""]}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-xs mt-2 justify-center">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Assigned</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Unassigned</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthlyTrendAreaChart() {
  const [data, setData] = useState<any[]>([]);
  const [trendError, setTrendError] = useState("");
  useEffect(() => {
    const ctrl = new AbortController();
    const now = new Date();
    void Promise.all(Array.from({ length: 6 }, async (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const year = date.getFullYear(), month = date.getMonth() + 1;
      const res = await fetch('/api/po?summary=true&limit=1&offset=0&filterBy=tglPo&month=' + month + '&year=' + year, { signal: ctrl.signal, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat tren');
      return { name: date.toLocaleDateString('id-ID', { month: 'short' }), month, year, total: json.total };
    })).then(rows => { if (!ctrl.signal.aborted) setData(rows); }).catch(e => { if (!ctrl.signal.aborted) setTrendError(e.message); });
    return () => ctrl.abort();
  }, []);

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Tren PO Bulanan
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px] pt-4">
        {trendError && <p role="alert">{trendError}</p>}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart onClick={(state: any) => { const item = data.find(d => d.name === state.activeLabel); if (item) openDashboardPOs({ filterBy: "tglPo", month: String(item.month), year: String(item.year) }, "PO " + item.name); }} data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export function RecentActivityWidget() {
  const [res, setRes] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const response = await fetch('/api/activities');
        const json = await response.json();
        if (isMounted) {
          setRes(json);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  
  const renderActivity = (act: any) => {
    let text = "Aktivitas tidak diketahui";
    let link = "#";
    let icon = <Activity size={14} className="text-blue-500" />;
    
    if (act.entity === "PurchaseOrder") {
      const poRef = act.refNumber || act.newData?.noPo || act.newData?.noInvoice;
      const refText = poRef ? ` (${poRef})` : '';
      text = `PO${refText} baru diupload oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/po`;
      icon = <FileWarning size={14} className="text-blue-500" />;
    } else if (act.entity === "Reconcile") {
      const rekonRef = act.refNumber || act.newData?.noRekonsiliasi;
      const refText = rekonRef ? ` (${rekonRef})` : '';
      text = `Rekonsiliasi${refText} dibuat oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/rekon?action=edit&id=${act.entityId}`;
      icon = <CheckCircle2 size={14} className="text-emerald-500" />;
    } else if (act.entity === "DataRetur") {
      const isBatch = act.newData?.isBatch || act.entityId.startsWith("batch-");
      const count = act.newData?.count || 1;
      const rtvRef = act.refNumber || act.newData?.rtvCn;
      const refText = (!isBatch && rtvRef) ? ` (${rtvRef})` : '';
      text = `${isBatch ? count : 1} Data Retur${refText} diupload oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/retur`;
      icon = <Activity size={14} className="text-rose-500" />;
    } else if (act.entity === "CreditLimitBatch") {
      text = `Batch Credit Limit diajukan oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/credit-limit`;
      icon = <Clock size={14} className="text-amber-500" />;
    }
    
    return (
      <Link onClick={e => { if (act.entity === "PurchaseOrder") { e.preventDefault(); openDashboardPOs({ q: act.refNumber || act.newData?.noPo || "" }, "PO dari aktivitas"); } }} href={link} key={act.id} className="flex gap-3 items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 -mx-2 rounded-lg transition-colors">
        <div className="mt-0.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
          {icon}
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">{text}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{timeAgo(act.createdAt)}</span>
        </div>
      </Link>
    );
  };

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full max-h-[420px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Aktivitas Terakhir
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pt-2 px-6">
        {(!res && !error) ? (
          <div className="text-xs text-slate-400 text-center py-4">Memuat data...</div>
        ) : (res?.data?.length === 0) ? (
          <div className="text-xs text-slate-400 text-center py-4">Belum ada aktivitas</div>
        ) : (
          <div className="flex flex-col gap-2">
            {res?.data?.map(renderActivity)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
