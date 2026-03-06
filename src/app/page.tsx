"use client";

import StatCard from "@/components/card";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";

import {
  Bell,
  Briefcase,
  CalendarClock,
  Check,
  ClockAlert,
  Hourglass,
  ListChecks,
  Menu,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/po?includeUnknown=true", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!mounted) return;
        setPoData(Array.isArray(data) ? data : data?.data || []);
      } catch {
        if (mounted) setPoData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const { activeCount, inProgressCount, almostExpiredCount, monthlyCounts } =
    useMemo(() => {
      const active = poData.filter((po) => !!po.statusPo).length;
      const inProg = poData.filter((po) => !po.statusBayar).length;
      const almost = poData.filter((po) => {
        const exp = toDate(po.expiredTgl);
        const du = daysUntil(exp);
        return du != null && du >= 0 && du <= 14 && !po.statusBayar;
      }).length;
      const months = Array(12).fill(0);
      for (const po of poData) {
        const dt = toDate(po.tglPo);
        if (!dt) continue;
        months[dt.getMonth()]++;
      }
      return {
        activeCount: active,
        inProgressCount: inProg,
        almostExpiredCount: almost,
        monthlyCounts: months,
      };
    }, [poData]);

  return (
    <main>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="PO Active"
          value={String(activeCount)}
          subValue={loading ? "Loading..." : `${activeCount} active`}
          subLabel=""
          color=""
          variant="amber"
          icon={<Briefcase size={20} />}
        />
        <StatCard
          title="PO In Progress"
          value={String(inProgressCount)}
          subValue={loading ? "Loading..." : `${inProgressCount} open`}
          subLabel=""
          color=""
          variant="blue"
          icon={<ListChecks size={20} />}
        />
        <StatCard
          title="PO Almost Expired"
          value={String(almostExpiredCount)}
          subValue={
            loading ? "Loading..." : `${almostExpiredCount} within 14 days`
          }
          subLabel=""
          color=""
          variant="amber"
          icon={<ListChecks size={20} />}
        />
      </div>

      <div className="mt-8">
        <ChartAreaInteractive />
      </div>
      {/* Table bawah chart - full width */}
      <div className="mt-8 bg-white text-black rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <TableUnderChart poData={poData} />
      </div>
    </main>
  );
}

function TableUnderChart({ poData }: { poData: any[] }) {
  const [group, setGroup] = useState<"new" | "in_progress" | "almost_expired">(
    "new",
  );
  const [visibleCols, setVisibleCols] = useState({
    company: true,
    nopo: true,
    submitDate: true,
    dueDate: true,
    status: true,
    actions: true,
  });
  const [colsOpen, setColsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const toggleCol = (key: keyof typeof visibleCols) =>
    setVisibleCols((v) => ({ ...v, [key]: !v[key] }));

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const filtered = useMemo(() => {
    const arr = Array.isArray(poData) ? poData : [];
    if (group === "new") {
      return arr.filter((po) => {
        const dt = toDate(po.tglPo);
        if (!dt) return false;
        const days = Math.ceil((Date.now() - dt.getTime()) / 86400000);
        return days <= 7;
      });
    }
    if (group === "in_progress") {
      return arr.filter((po) => !po.statusBayar);
    }
    // almost_expired
    return arr.filter((po) => {
      const exp = toDate(po.expiredTgl);
      const du = daysUntil(exp);
      return du != null && du >= 0 && du <= 14 && !po.statusBayar;
    });
  }, [poData, group]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const getCompanyName = (po: any) => {
    const candidates = [
      "company",
      "companyName",
      "company_name",
      "vendor",
      "vendorName",
      "supplier",
      "supplierName",
      "customer",
      "customerName",
      "namaPt",
      "nama_pt",
      "namaPT",
      "nama_perusahaan",
      "namaPerusahaan",
      "namaRitel",
      "namaRetail",
      "retailer",
      "tenant",
      "merchant",
      "name",
      "judul",
      "title",
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
    if (!po.statusBayar) {
      const du = daysUntil(toDate(po.expiredTgl));
      if (du != null && du >= 0 && du <= 14) return "Almost Expired";
      return "In Progress";
    }
    return "Done";
  };

  const counts = useMemo(() => {
    const arr = Array.isArray(poData) ? poData : [];
    const cNew = arr.filter((po) => {
      const dt = toDate(po.tglPo);
      if (!dt) return false;
      const days = Math.ceil((Date.now() - dt.getTime()) / 86400000);
      return days <= 7;
    }).length;
    const cProgress = arr.filter((po) => !po.statusBayar).length;
    const cAlmost = arr.filter((po) => {
      const exp = toDate(po.expiredTgl);
      const du = daysUntil(exp);
      return du != null && du >= 0 && du <= 14 && !po.statusBayar;
    }).length;
    return { cNew, cProgress, cAlmost };
  }, [poData]);

  const statusChipClass = (t: string) =>
    t === "Done"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : t === "Almost Expired"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

  return (
    <>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${group === "new" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
            onClick={() => {
              setPage(1);
              setGroup("new");
            }}
          >
            New <span className="ml-1 text-[10px] font-bold text-gray-500">({counts.cNew})</span>
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${group === "in_progress" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
            onClick={() => {
              setPage(1);
              setGroup("in_progress");
            }}
          >
            In Progress <span className="ml-1 text-[10px] font-bold text-gray-500">({counts.cProgress})</span>
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${group === "almost_expired" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
            onClick={() => {
              setPage(1);
              setGroup("almost_expired");
            }}
          >
            Almost Expired <span className="ml-1 text-[10px] font-bold text-gray-500">({counts.cAlmost})</span>
          </button>
        </div>
        <div className="relative">
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold bg-white hover:bg-gray-50"
            onClick={() => setColsOpen((o) => !o)}
          >
            Customize Columns
          </button>
          {colsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl p-2 space-y-1 z-50">
              {[
                { key: "company", label: "Company" },
                { key: "nopo", label: "No PO" },
                { key: "submitDate", label: "Submit Date" },
                { key: "dueDate", label: "Due Date" },
                { key: "status", label: "Status" },
                { key: "actions", label: "Actions" },
              ].map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-black"
                  onClick={() => toggleCol(c.key as any)}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={(visibleCols as any)[c.key]}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="text-gray-600 text-[11px] uppercase tracking-wider border-b border-gray-100">
              {visibleCols.company && (
                <th className="px-6 py-3 font-semibold">Company</th>
              )}
              {visibleCols.nopo && (
                <th className="px-6 py-3 font-semibold">No PO</th>
              )}
              {visibleCols.submitDate && (
                <th className="px-6 py-3 font-semibold">Submit Date</th>
              )}
              {visibleCols.dueDate && (
                <th className="px-6 py-3 font-semibold">Due Date</th>
              )}
              {visibleCols.status && (
                <th className="px-6 py-3 font-semibold">Status</th>
              )}
              {visibleCols.actions && (
                <th className="px-6 py-3 font-semibold text-center">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((po, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                {visibleCols.company && (
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-800 tracking-tight">
                      {getCompanyName(po)}
                    </span>
                  </td>
                )}
                {visibleCols.nopo && (
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono font-bold text-slate-800">
                      {po.noPo || po.nopo || po.poNumber || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.submitDate && (
                  <td className="px-6 py-4">
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">
                      Submitted
                    </span>
                    <span className="block text-xs font-bold text-slate-700">
                      {toDate(po.tglPo)?.toLocaleDateString() || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.dueDate && (
                  <td className="px-6 py-4">
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">
                      Expired
                    </span>
                    <span className="block text-xs font-bold text-red-500">
                      {toDate(po.expiredTgl)?.toLocaleDateString() || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.status && (
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusChipClass(statusText(po))}`}
                    >
                      {statusText(po)}
                    </span>
                  </td>
                )}
                {visibleCols.actions && (
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        title="Update"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        title="Extend"
                      >
                        <CalendarClock size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-sm text-gray-500" colSpan={6}>
                  Tidak ada data untuk filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
        <div className="text-xs text-gray-600 flex items-center gap-2">
          Rows per page
          <select
            className="px-2 py-1 rounded-md bg-white border border-gray-300 text-black text-xs"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n} className="text-black">
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-black">
          <span>
            Page <span className="font-bold">{page}</span> of{" "}
            <span className="font-bold">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            <button
              className="px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
