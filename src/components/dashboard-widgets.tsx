"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PoDateBadge } from "@/components/PoDateBadge";
import { ArrowRight, FileWarning, Activity, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import DateInputHybrid from "@/components/DateInputHybrid";

const COLORS = ["#3b82f6", "#f59e0b", "#f43f5e", "#10b981", "#64748b"];

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
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Status Keseluruhan PO
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[260px] pb-6">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">Tidak ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 15, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#000"} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [`${value} PO`, name]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend 
                verticalAlign="bottom" 
                align="center" 
                iconType="circle" 
                wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function RegionalDistributionBar({ stats }: { stats?: any }) {
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [localStats, setLocalStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tglFrom && !tglTo) {
      setLocalStats(null);
      return;
    }
    const fetchFiltered = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tglFrom) params.set("tglFrom", tglFrom);
        if (tglTo) params.set("tglTo", tglTo);
        // Fallback to safe defaults if session/role isn't fully propagated in this isolated fetch
        const res = await fetch(`/api/po/stats?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setLocalStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    // Simple debounce
    const t = setTimeout(fetchFiltered, 500);
    return () => clearTimeout(t);
  }, [tglFrom, tglTo]);

  const activeStats = localStats || stats;
  const sourceData = activeStats?.topSiteAreas;
  const data = sourceData && sourceData.length > 0
    ? sourceData
    : [
        { name: "BELUM ADA DATA", po: 0 },
      ];

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full relative">
      <CardHeader className="pb-2 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
        <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider shrink-0">
          Distribusi PO (Top 5)
        </CardTitle>
        <div className="flex gap-2 w-full xl:w-auto items-center justify-end">
          <button
            onClick={() => {
              setTglFrom("");
              setTglTo("");
            }}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider shrink-0 ${(!tglFrom && !tglTo) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
          >
            All
          </button>
          <div className="flex-1 min-w-0 xl:w-[115px]">
            <DateInputHybrid value={tglFrom} onChange={setTglFrom} placeholder="Dari..." maxDate={tglTo} />
          </div>
          <div className="flex-1 min-w-0 xl:w-[115px]">
            <DateInputHybrid value={tglTo} onChange={setTglTo} placeholder="Sampai..." minDate={tglFrom} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[260px] pb-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={120} />
            <Tooltip 
               cursor={{fill: '#f1f5f9'}}
               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="po" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
        <Link href="/purchase-order" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
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
          <div className="w-full flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                  <th className="font-semibold text-slate-600 dark:text-slate-400 py-3 pr-2 w-[30%]">No PO</th>
                  <th className="font-semibold text-slate-600 dark:text-slate-400 py-3 px-2 w-[30%]">Nama Ritel</th>
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
                      key={i} 
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
  const data = [
    { name: "Jan", total: 120 },
    { name: "Feb", total: 210 },
    { name: "Mar", total: 180 },
    { name: "Apr", total: 290 },
    { name: "May", total: 250 },
    { name: "Jun", total: 340 },
  ];

  return (
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Tren PO Bulanan
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
      text = `PO baru diupload oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/po`;
      icon = <FileWarning size={14} className="text-blue-500" />;
    } else if (act.entity === "Reconcile") {
      text = `Rekonsiliasi dibuat oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/rekon?action=edit&id=${act.entityId}`;
      icon = <CheckCircle2 size={14} className="text-emerald-500" />;
    } else if (act.entity === "DataRetur") {
      const isBatch = act.newData?.isBatch;
      const count = act.newData?.count || 1;
      text = `${isBatch ? count : 1} Data Retur diupload oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/retur`;
      icon = <Activity size={14} className="text-rose-500" />;
    } else if (act.entity === "CreditLimitBatch") {
      text = `Batch Credit Limit diajukan oleh ${act.userName} (${act.userRole?.toUpperCase() || 'SYSTEM'})`;
      link = `/dashboard/credit-limit`;
      icon = <Clock size={14} className="text-amber-500" />;
    }
    
    return (
      <Link href={link} key={act.id} className="flex gap-3 items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 -mx-2 rounded-lg transition-colors">
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
    <Card className="flex flex-col shadow-sm border-slate-100 dark:border-slate-800 h-full">
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
