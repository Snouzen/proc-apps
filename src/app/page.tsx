"use client";

import StatCard from "@/components/card";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";

import {
  Bell,
  Briefcase,
  CalendarClock,
  FileText,
  Eye,
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
import PODetailModal from "@/components/po-detail-modal";

export default function Home() {
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"pusat" | "rm" | null>(null);
  const [regional, setRegional] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [unitData, setUnitData] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then(
          (r) => r.json(),
        );
        const r: "pusat" | "rm" = me?.role === "rm" ? "rm" : "pusat";
        const reg = me?.regional || null;
        if (mounted) {
          setRole(r);
          setRegional(reg);
          setRoleReady(true);
        }
        const q =
          r === "rm" && reg
            ? `/api/po?includeUnknown=true&regional=${encodeURIComponent(reg)}`
            : `/api/po?includeUnknown=true`;
        const [res, resUnits] = await Promise.all([
          fetch(q, { cache: "no-store" }),
          fetch("/api/unit-produksi", { cache: "no-store" }),
        ]);
        const data = await res.json();
        const u = await resUnits.json();
        if (!mounted) return;
        setPoData(Array.isArray(data) ? data : data?.data || []);
        setUnitData(Array.isArray(u) ? u : u?.data || []);
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
      const done = poData.filter((po) => !!po.statusBayar).length;
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

  if (!roleReady) {
    return (
      <main>
        <div className="mt-8 bg-white text-black rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
          <div className="text-sm text-slate-500">Loading dashboard…</div>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* Stats Grid */}
      {role === "rm" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            title="PO Completed"
            value={String(
              Math.max(poData.filter((po) => !!po.statusBayar).length, 0),
            )}
            subValue={loading ? "Loading..." : `Selesai`}
            subLabel=""
            color=""
            variant="amber"
            icon={<FileText size={20} />}
          />
        </div>
      ) : (
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
      )}

      {role === "pusat" && (
        <div className="mt-8">
          <ChartAreaInteractive poData={poData} />
        </div>
      )}
      {/* Table bawah chart - full width */}
      <div className="mt-8 bg-white text-black rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <TableUnderChart
          poData={poData}
          setPoData={setPoData}
          role={role}
          regional={regional}
          units={unitData}
        />
      </div>
    </main>
  );
}

function TableUnderChart({
  poData,
  setPoData,
  role,
  regional,
  units,
}: {
  poData: any[];
  setPoData: React.Dispatch<React.SetStateAction<any[]>>;
  role: "pusat" | "rm" | null;
  regional: string | null;
  units: any[];
}) {
  const [group, setGroup] = useState<
    "new" | "in_progress" | "almost_expired" | "assign"
  >(() => (role === "rm" ? "assign" : "new"));
  const [visibleCols, setVisibleCols] = useState({
    company: true,
    nopo: true,
    regional: true,
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
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortDesc, setSortDesc] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [assignOpenId, setAssignOpenId] = useState<string | null>(null);

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

  useEffect(() => {
    if (role === "rm" && group !== "assign" && group !== "in_progress") {
      setGroup("assign");
    }
  }, [role]);

  const filtered = useMemo(() => {
    const arr = Array.isArray(poData) ? poData : [];
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    const inRange = (d: Date | null) => {
      if (!d) return false;
      if (from && d < from) return false;
      if (to) {
        const dt = new Date(to);
        dt.setHours(23, 59, 59, 999);
        if (d > dt) return false;
      }
      return true;
    };
    const needAssign = (p: any) =>
      !p?.unitProduksiId ||
      p?.unitProduksiId === "UNKNOWN" ||
      !p?.UnitProduksi?.siteArea;
    if (group === "assign") {
      return arr.filter((po) => {
        const dt = toDate(po.tglPo);
        if (!dt) return false;
        return needAssign(po) && (!dateFrom && !dateTo ? true : inRange(dt));
      });
    }
    if (group === "new") {
      return arr.filter((po) => {
        const dt = toDate(po.tglPo);
        if (!dt) return false;
        const days = Math.ceil((Date.now() - dt.getTime()) / 86400000);
        const isNew = days <= 7;
        return isNew && (!dateFrom && !dateTo ? true : inRange(dt));
      });
    }
    if (group === "in_progress") {
      return arr.filter((po) => {
        if (po.statusBayar) return false;
        const dt = toDate(po.tglPo);
        return !dateFrom && !dateTo ? true : inRange(dt);
      });
    }
    // almost_expired
    return arr.filter((po) => {
      const exp = toDate(po.expiredTgl);
      const du = daysUntil(exp);
      const isAlmost = du != null && du >= 0 && du <= 14 && !po.statusBayar;
      if (!isAlmost) return false;
      const dt = toDate(po.tglPo);
      return !dateFrom && !dateTo ? true : inRange(dt);
    });
  }, [poData, group, dateFrom, dateTo]);

  // Default sort: submit date (tglPo) oldest -> newest
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const da = toDate(a?.tglPo);
      const db = toDate(b?.tglPo);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return sortDesc
        ? db.getTime() - da.getTime()
        : da.getTime() - db.getTime();
    });
    return arr;
  }, [filtered, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = sorted.slice(start, start + rowsPerPage);

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
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    const inRange = (d: Date | null) => {
      if (!d) return false;
      if (from && d < from) return false;
      if (to) {
        const dt = new Date(to);
        dt.setHours(23, 59, 59, 999);
        if (d > dt) return false;
      }
      return true;
    };
    const cAssign = arr.filter((po) => {
      const dt = toDate(po.tglPo);
      if (!dt) return false;
      const na =
        !po?.unitProduksiId ||
        po?.unitProduksiId === "UNKNOWN" ||
        !po?.UnitProduksi?.siteArea;
      return na && (!dateFrom && !dateTo ? true : inRange(dt));
    }).length;
    const cNew = arr.filter((po) => {
      const dt = toDate(po.tglPo);
      if (!dt) return false;
      const days = Math.ceil((Date.now() - dt.getTime()) / 86400000);
      return days <= 7 && (!dateFrom && !dateTo ? true : inRange(dt));
    }).length;
    const cProgress = arr.filter((po) => {
      if (po.statusBayar) return false;
      const dt = toDate(po.tglPo);
      return !dateFrom && !dateTo ? true : inRange(dt);
    }).length;
    const cAlmost = arr.filter((po) => {
      const exp = toDate(po.expiredTgl);
      const du = daysUntil(exp);
      const isAlmost = du != null && du >= 0 && du <= 14 && !po.statusBayar;
      if (!isAlmost) return false;
      const dt = toDate(po.tglPo);
      return !dateFrom && !dateTo ? true : inRange(dt);
    }).length;
    return { cAssign, cNew, cProgress, cAlmost };
  }, [poData, dateFrom, dateTo]);

  const statusChipClass = (t: string) =>
    t === "Done"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : t === "Almost Expired"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

  // New: flag jika due date mendekati real time (D-7 & D-3)
  const dueFlag = (po: any) => {
    if (po?.statusBayar) return null;
    const du = daysUntil(toDate(po?.expiredTgl));
    if (du == null) return null;
    if (du < 0) {
      return {
        label: "Expired",
        className: "bg-rose-200 text-rose-800 ring-1 ring-rose-300",
      };
    }
    if (du <= 3) {
      return {
        label: `D-${du}`,
        className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
      };
    }
    if (du <= 7) {
      return {
        label: `D-${du}`,
        className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      };
    }
    return null;
  };

  const openDetail = (po: any) => {
    const items: any[] = Array.isArray(po?.Items) ? po.Items : [];
    const mappedItems = items.map((it: any, idx: number) => ({
      id:
        it?.id ??
        `${it?.Product?.name || "item"}-${it?.pcs || 0}-${it?.hargaPcs || 0}-${idx}`,
      pcs: Number(it?.pcs || 0),
      pcsKirim: Number(it?.pcsKirim || 0),
      hargaPcs: Number(it?.hargaPcs || 0),
      nominal: Number(it?.nominal || 0),
      rpTagih: Number(it?.rpTagih || 0),
      Product: {
        name: String(it?.Product?.name || "-"),
        satuanKg:
          typeof it?.Product?.satuanKg === "number"
            ? it.Product.satuanKg
            : undefined,
      },
    }));
    setDetailData({
      id: po?.id || "",
      noPo: po?.noPo || po?.nopo || "-",
      company: getCompanyName(po),
      tglPo: po?.tglPo || null,
      expiredTgl: po?.expiredTgl || null,
      linkPo: po?.linkPo || null,
      noInvoice: po?.noInvoice || null,
      siteArea: po?.UnitProduksi?.siteArea || "-",
      tujuanDetail: po?.tujuanDetail || null,
      regional: po?.regional || po?.UnitProduksi?.namaRegional || null,
      Items: mappedItems,
      status: {
        kirim: !!po?.statusKirim,
        sdif: !!po?.statusSdif,
        po: !!po?.statusPo,
        fp: !!po?.statusFp,
        kwi: !!po?.statusKwi,
        inv: !!po?.statusInv,
        tagih: !!po?.statusTagih,
        bayar: !!po?.statusBayar,
      },
      remarks: po?.remarks || null,
    });
    setDetailOpen(true);
  };

  return (
    <>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          {role === "rm" ? (
            <>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "assign" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                onClick={() => {
                  setPage(1);
                  setGroup("assign");
                }}
              >
                Need Assign{" "}
                <span className="ml-1 text-xs font-bold text-gray-500">
                  ({counts.cAssign})
                </span>
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "in_progress" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                onClick={() => {
                  setPage(1);
                  setGroup("in_progress");
                }}
              >
                In Progress{" "}
                <span className="ml-1 text-xs font-bold text-gray-500">
                  ({counts.cProgress})
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "new" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                onClick={() => {
                  setPage(1);
                  setGroup("new");
                }}
              >
                New{" "}
                <span className="ml-1 text-xs font-bold text-gray-500">
                  ({counts.cNew})
                </span>
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "in_progress" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                onClick={() => {
                  setPage(1);
                  setGroup("in_progress");
                }}
              >
                In Progress{" "}
                <span className="ml-1 text-xs font-bold text-gray-500">
                  ({counts.cProgress})
                </span>
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "almost_expired" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                onClick={() => {
                  setPage(1);
                  setGroup("almost_expired");
                }}
              >
                Almost Expired{" "}
                <span className="ml-1 text-xs font-bold text-gray-500">
                  ({counts.cAlmost})
                </span>
              </button>
            </>
          )}
          <button
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${sortDesc ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
            onClick={() => {
              setPage(1);
              setSortDesc((v) => !v);
            }}
            title="Toggle newest to oldest"
          >
            Newest First
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Date</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 rounded-md border border-gray-300 text-sm text-black"
            />
            <span className="text-sm text-gray-600">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 rounded-md border border-gray-300 text-sm text-black"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="px-2 py-1 rounded-md border border-gray-300 text-sm bg-white hover:bg-gray-50"
                title="Clear date filter"
              >
                Clear
              </button>
            )}
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
                  { key: "regional", label: "Regional" },
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
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto text-sm">
          <thead>
            <tr className="text-gray-700 text-sm uppercase tracking-wider border-b border-gray-100">
              {visibleCols.company && (
                <th className="px-6 py-3 font-semibold">Company</th>
              )}
              {visibleCols.nopo && (
                <th className="px-6 py-3 font-semibold">No PO</th>
              )}
              {visibleCols.submitDate && (
                <th className="px-6 py-3 font-semibold">Submit Date</th>
              )}
              {visibleCols.regional && (
                <th className="px-6 py-3 font-semibold">Regional</th>
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
          <tbody className="divide-y divide-gray-100 text-[0.95rem]">
            {pageRows.map((po, idx) => (
              <tr
                key={idx}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => openDetail(po)}
                title="Lihat detail PO"
              >
                {visibleCols.company && (
                  <td className="px-6 py-4">
                    <span className="text-base font-semibold text-slate-800 tracking-tight">
                      {getCompanyName(po)}
                    </span>
                  </td>
                )}
                {visibleCols.nopo && (
                  <td className="px-6 py-4">
                    <span className="text-base font-mono font-bold text-slate-800">
                      {po.noPo || po.nopo || po.poNumber || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.submitDate && (
                  <td className="px-6 py-4">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">
                      Submitted
                    </span>
                    <span className="block text-sm font-bold text-slate-700">
                      {toDate(po.tglPo)?.toLocaleDateString() || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.regional && (
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-700">
                      {po?.regional || po?.UnitProduksi?.namaRegional || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.dueDate && (
                  <td className="px-6 py-4">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">
                      Expired
                    </span>
                    <span className="block text-sm font-bold text-red-500">
                      {toDate(po.expiredTgl)?.toLocaleDateString() || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.status && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 text-sm font-semibold px-2.5 py-1 rounded-full ${statusChipClass(
                          statusText(po),
                        )}`}
                      >
                        {statusText(po)}
                      </span>
                      {(() => {
                        const flag = dueFlag(po);
                        return flag ? (
                          <span
                            title="Mendekati due date"
                            className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${flag.className}`}
                          >
                            {flag.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </td>
                )}
                {visibleCols.actions && (
                  <td className="px-6 py-4 text-center">
                    {role === "rm" ? (
                      group === "assign" ? (
                        <AssignDropdown
                          po={po}
                          units={units}
                          regional={regional}
                          onAssigned={(unit: any) => {
                            // Optimistic update
                            setPoData((prev) =>
                              prev.map((x) =>
                                x.noPo === po.noPo
                                  ? {
                                      ...x,
                                      UnitProduksi: {
                                        ...(x.UnitProduksi || {}),
                                        siteArea: unit.siteArea,
                                        namaRegional: unit.namaRegional,
                                      },
                                      regional: unit.namaRegional,
                                    }
                                  : x,
                              ),
                            );
                          }}
                          onClick={(e: any) => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                          title="View Detail"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(po);
                          }}
                        >
                          <Eye size={16} />
                        </button>
                      )
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <button
                          className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                          title="Update"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(po);
                          }}
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                          title="Extend"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(po);
                          }}
                        >
                          <CalendarClock size={14} />
                        </button>
                      </div>
                    )}
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
      <PODetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        data={detailData}
      />
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white text-sm">
        <div className="text-sm text-gray-700 flex items-center gap-2">
          Rows per page
          <select
            className="px-2 py-1 rounded-md bg-white border border-gray-300 text-black text-sm"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n} className="text-black text-sm">
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-sm text-black">
          <span>
            Page <span className="font-bold">{page}</span> of{" "}
            <span className="font-bold">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
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

function AssignDropdown({
  po,
  units,
  regional,
  onAssigned,
  onClick,
}: {
  po: any;
  units: any[];
  regional: string | null;
  onAssigned: (unit: any) => void;
  onClick?: (e: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const reg = String(regional || "").toLowerCase();
  const syn = (() => {
    if (
      reg.includes("bandung") ||
      reg.includes("reg 1") ||
      reg.includes("regional 1") ||
      reg.includes(" i")
    ) {
      return ["reg 1", "regional 1", "reg i", "regional i", "bandung"];
    }
    if (
      reg.includes("surabaya") ||
      reg.includes("reg 2") ||
      reg.includes("regional 2") ||
      reg.includes(" ii")
    ) {
      return ["reg 2", "regional 2", "reg ii", "regional ii", "surabaya"];
    }
    if (
      reg.includes("makassar") ||
      reg.includes("reg 3") ||
      reg.includes("regional 3") ||
      reg.includes(" iii")
    ) {
      return ["reg 3", "regional 3", "reg iii", "regional iii", "makassar"];
    }
    return reg ? [reg] : [];
  })();
  const list = (Array.isArray(units) ? units : []).filter((u: any) => {
    const name = String(u?.namaRegional || "").toLowerCase();
    return syn.length === 0 || syn.some((s) => name.includes(s));
  });
  const filtered = list.filter((u: any) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(u?.siteArea || "")
        .toLowerCase()
        .includes(q) ||
      String(u?.namaRegional || "")
        .toLowerCase()
        .includes(q)
    );
  });
  const assign = async (unit: any) => {
    setBusy(true);
    try {
      await fetch("/api/po/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPo: po.noPo, siteArea: unit.siteArea }),
      });
      onAssigned(unit);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="relative inline-block" onClick={onClick}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-all"
        disabled={busy}
        title="Assign ke Site Area"
      >
        <UserPlus size={16} className={busy ? "opacity-50" : ""} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1">
            <input
              type="text"
              placeholder="Cari site area / regional..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-gray-400">
                Tidak ada site area
              </div>
            ) : (
              filtered.map((u: any) => (
                <button
                  key={`${u.idRegional}-${u.siteArea}`}
                  onClick={() => assign(u)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  disabled={busy}
                >
                  <div className="text-sm font-semibold text-slate-800">
                    {u.siteArea}
                  </div>
                  <div className="text-xs text-slate-500">{u.namaRegional}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
