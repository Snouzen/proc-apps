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
  Pencil,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PODetailModal from "@/components/po-detail-modal";
import POEditModal from "@/components/po-edit-modal";
import { useAutoRefreshTick } from "@/components/auto-refresh";

export default function Home() {
  const refreshTick = useAutoRefreshTick();
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"pusat" | "rm" | null>(null);
  const [regional, setRegional] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [unitData, setUnitData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeCount: 0,
    inProgressCount: 0,
    almostExpiredCount: 0,
    completedCount: 0,
  });
  const [tableFocus, setTableFocus] = useState<
    "in_progress" | "completed" | null
  >(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (mounted) setLoading(true);
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
        const statsUrl =
          r === "rm" && reg
            ? `/api/po/stats?includeUnknown=true&regional=${encodeURIComponent(reg)}`
            : `/api/po/stats?includeUnknown=true`;
        const [resStats, resUnits] = await Promise.all([
          fetch(statsUrl, { cache: "no-store" }),
          fetch("/api/unit-produksi", { cache: "no-store" }),
        ]);
        const s = await resStats.json();
        const u = await resUnits.json();
        if (!mounted) return;
        setUnitData(Array.isArray(u) ? u : u?.data || []);
        setStats({
          activeCount: Number(s?.cAll) || 0,
          inProgressCount: Number(s?.cProgress) || 0,
          almostExpiredCount: Number(s?.cAlmost) || 0,
          completedCount: Number(s?.cCompleted) || 0,
        });
      } catch {
        if (!mounted) return;
        setStats({
          activeCount: 0,
          inProgressCount: 0,
          almostExpiredCount: 0,
          completedCount: 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const isCompleted = (po: any) => {
    const inv = po?.noInvoice;
    return String(inv ?? "").trim().length > 0;
  };
  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const { activeCount, inProgressCount, almostExpiredCount, completedCount } =
    stats;

  if (!roleReady) {
    return (
      <main>
        <div className="mt-8 bg-white text-black rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
          <div className="text-sm text-slate-500">Loading dashboard…</div>
        </div>
      </main>
    );
  }

  const focusTable = (group: "in_progress" | "completed") => {
    setTableFocus(group);
    setTimeout(() => {
      document
        .getElementById("po-table")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

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
            onClick={() => focusTable("in_progress")}
          />
          <StatCard
            title="PO Completed"
            value={String(completedCount)}
            subValue={loading ? "Loading..." : `Selesai`}
            subLabel=""
            color=""
            variant="emerald"
            icon={<FileText size={20} />}
            onClick={() => focusTable("completed")}
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
            onClick={() => focusTable("in_progress")}
          />
          <StatCard
            title="PO Almost Expired"
            value={String(almostExpiredCount)}
            subValue={
              loading ? "Loading..." : `${almostExpiredCount} within 14 days`
            }
            subLabel=""
            color=""
            variant="rose"
            icon={<ClockAlert size={20} />}
          />
          <StatCard
            title="PO Completed"
            value={String(completedCount)}
            subValue={loading ? "Loading..." : `Selesai`}
            subLabel=""
            color=""
            variant="emerald"
            icon={<Check size={20} />}
            onClick={() => focusTable("completed")}
          />
        </div>
      )}

      {role === "pusat" && (
        <div className="mt-8">
          <ChartAreaInteractive poData={poData} />
        </div>
      )}
      {/* Table bawah chart - full width */}
      <div
        id="po-table"
        className="mt-8 bg-white text-black rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <TableUnderChart
          refreshTick={refreshTick}
          poData={poData}
          setPoData={setPoData}
          role={role}
          regional={regional}
          units={unitData}
          focusGroup={tableFocus}
          onFocusApplied={() => setTableFocus(null)}
        />
      </div>
    </main>
  );
}

function TableUnderChart({
  refreshTick,
  poData,
  setPoData,
  role,
  regional,
  units,
  focusGroup,
  onFocusApplied,
}: {
  refreshTick: number;
  poData: any[];
  setPoData: React.Dispatch<React.SetStateAction<any[]>>;
  role: "pusat" | "rm" | null;
  regional: string | null;
  units: any[];
  focusGroup: "in_progress" | "completed" | null;
  onFocusApplied: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editNoPo, setEditNoPo] = useState<string | null>(null);
  const [group, setGroup] = useState<
    "all" | "in_progress" | "almost_expired" | "completed" | "assign"
  >(() => (role === "rm" ? "assign" : "in_progress"));
  const [visibleCols, setVisibleCols] = useState({
    company: true,
    nopo: true,
    pcsPo: true,
    nominal: true,
    submitDate: true,
    tglPo: true,
    dueDate: true,
    regional: true,
    status: true,
    actions: true,
  });
  const [colsOpen, setColsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [serverTotal, setServerTotal] = useState(0);
  const toggleCol = (key: keyof typeof visibleCols) =>
    setVisibleCols((v) => ({ ...v, [key]: !v[key] }));
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortDesc, setSortDesc] = useState(true);
  const [alphaSort, setAlphaSort] = useState<"none" | "asc" | "desc">("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [poLoadError, setPoLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState({
    cAll: 0,
    cAssign: 0,
    cProgress: 0,
    cAlmost: 0,
    cCompleted: 0,
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [assignOpenId, setAssignOpenId] = useState<string | null>(null);

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const isCompleted = (po: any) => {
    const inv = po?.noInvoice;
    return String(inv ?? "").trim().length > 0;
  };
  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    if (!focusGroup) return;
    setPage(1);
    setGroup(focusGroup);
    onFocusApplied();
  }, [focusGroup]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(String(searchQuery || "").trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!role) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        if (role === "rm" && regional) params.set("regional", regional);
        if (dateFrom) params.set("tglFrom", dateFrom);
        if (dateTo) params.set("tglTo", dateTo);
        const res = await fetch(`/api/po/stats?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();
        setCounts({
          cAll: Number(json?.cAll) || 0,
          cAssign: Number(json?.cAssign) || 0,
          cProgress: Number(json?.cProgress) || 0,
          cAlmost: Number(json?.cAlmost) || 0,
          cCompleted: Number(json?.cCompleted) || 0,
        });
      } catch {
        setCounts({
          cAll: 0,
          cAssign: 0,
          cProgress: 0,
          cAlmost: 0,
          cCompleted: 0,
        });
      }
    };
    run();
    return () => controller.abort();
  }, [role, regional, dateFrom, dateTo]);

  useEffect(() => {
    if (!role) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        params.set("summary", "true");
        params.set("includeItems", "false");
        params.set("group", group);
        params.set("limit", String(rowsPerPage));
        params.set("offset", String(Math.max(0, (page - 1) * rowsPerPage)));
        if (role === "rm" && regional) params.set("regional", regional);
        if (dateFrom) params.set("tglFrom", dateFrom);
        if (dateTo) params.set("tglTo", dateTo);
        if (debouncedSearch) params.set("q", debouncedSearch);
        const sort =
          alphaSort !== "none"
            ? alphaSort === "asc"
              ? "company_asc"
              : "company_desc"
            : sortDesc
              ? "tglPo_desc"
              : "tglPo_asc";
        params.set("sort", sort);
        const res = await fetch(`/api/po?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            (json as any)?.error || res.statusText || "Gagal mengambil data PO";
          throw new Error(msg);
        }
        const list = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];
        setPoData(list);
        setServerTotal(Number(json?.total) || list.length);
        setPoLoadError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal mengambil data PO";
        setPoLoadError(msg);
      }
    };
    run();
    return () => controller.abort();
  }, [
    refreshTick,
    role,
    regional,
    group,
    dateFrom,
    dateTo,
    debouncedSearch,
    page,
    rowsPerPage,
    sortDesc,
    alphaSort,
    setPoData,
  ]);

  useEffect(() => {
    if (
      role === "rm" &&
      group !== "assign" &&
      group !== "in_progress" &&
      group !== "completed" &&
      group !== "all"
    ) {
      setGroup("assign");
    }
  }, [role]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = Array.isArray(poData) ? poData : [];

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
    if (!isCompleted(po)) {
      const du = daysUntil(toDate(po.expiredTgl));
      if (du != null && du >= 0 && du <= 14) return "Almost Expired";
      return "In Progress";
    }
    return "Done";
  };

  const statusChipClass = (t: string) =>
    t === "Done"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : t === "Almost Expired"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

  // New: flag jika due date mendekati real time (D-7 & D-3)
  const dueFlag = (po: any) => {
    if (isCompleted(po)) return null;
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

  const openDetail = async (po: any) => {
    const nopo = String(po?.noPo || po?.nopo || po?.poNumber || "").trim();
    let fullPo: any = po;
    if (nopo) {
      try {
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        params.set("noPo", nopo);
        params.set("includeItems", "true");
        params.set("limit", "1");
        params.set("offset", "0");
        if (role === "rm" && regional) params.set("regional", regional);
        const res = await fetch(`/api/po?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const first = Array.isArray(json?.data)
          ? json.data[0]
          : Array.isArray(json)
            ? json[0]
            : null;
        if (first) fullPo = first;
      } catch {}
    }

    const items: any[] = Array.isArray(fullPo?.Items) ? fullPo.Items : [];
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
      id: fullPo?.id || "",
      noPo: fullPo?.noPo || fullPo?.nopo || "-",
      company: getCompanyName(fullPo),
      createdAt: fullPo?.createdAt || null,
      updatedAt: fullPo?.updatedAt || null,
      tglPo: fullPo?.tglPo || null,
      expiredTgl: fullPo?.expiredTgl || null,
      linkPo: fullPo?.linkPo || null,
      noInvoice: fullPo?.noInvoice || null,
      siteArea:
        fullPo?.UnitProduksi?.siteArea &&
        fullPo.UnitProduksi.siteArea !== "UNKNOWN"
          ? fullPo.UnitProduksi.siteArea
          : "-",
      tujuanDetail: fullPo?.tujuanDetail || null,
      regional: fullPo?.regional || fullPo?.UnitProduksi?.namaRegional || null,
      Items: mappedItems,
      status: {
        kirim: !!fullPo?.statusKirim,
        sdif: !!fullPo?.statusSdif,
        po: !!fullPo?.statusPo,
        fp: !!fullPo?.statusFp,
        kwi: !!fullPo?.statusKwi,
        inv: !!fullPo?.statusInv,
        tagih: !!fullPo?.statusTagih,
        bayar: !!fullPo?.statusBayar,
      },
      remarks: fullPo?.remarks || null,
    });
    setDetailOpen(true);
  };

  return (
    <>
      {poLoadError && (
        <div className="mx-5 mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Gagal load data: {poLoadError}
        </div>
      )}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          {role === "rm" ? (
            <>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "all" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`All (${counts.cAll})`}
                onClick={() => {
                  setPage(1);
                  setSortDesc(true);
                  setGroup("all");
                }}
              >
                All
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "assign" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`Need Assign (${counts.cAssign})`}
                onClick={() => {
                  setPage(1);
                  setGroup("assign");
                }}
              >
                Need Assign
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "in_progress" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`In Progress (${counts.cProgress})`}
                onClick={() => {
                  setPage(1);
                  setGroup("in_progress");
                }}
              >
                In Progress
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "completed" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`Completed (${counts.cCompleted})`}
                onClick={() => {
                  setPage(1);
                  setGroup("completed");
                }}
              >
                Completed
              </button>
            </>
          ) : (
            <>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "all" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`All (${counts.cAll})`}
                onClick={() => {
                  setPage(1);
                  setSortDesc(true);
                  setGroup("all");
                }}
              >
                All
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "in_progress" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`In Progress (${counts.cProgress})`}
                onClick={() => {
                  setPage(1);
                  setGroup("in_progress");
                }}
              >
                In Progress
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "almost_expired" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`Almost Expired (${counts.cAlmost})`}
                onClick={() => {
                  setPage(1);
                  setGroup("almost_expired");
                }}
              >
                Almost Expired
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${group === "completed" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                title={`Completed (${counts.cCompleted})`}
                onClick={() => {
                  setPage(1);
                  setGroup("completed");
                }}
              >
                Completed
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
          <button
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
              alphaSort !== "none"
                ? "bg-black text-white border-black"
                : "bg-white text-black border-gray-300 hover:bg-gray-50"
            }`}
            onClick={() => {
              setPage(1);
              setAlphaSort((v) =>
                v === "none" ? "asc" : v === "asc" ? "desc" : "none",
              );
            }}
            title="Toggle alphabet sort (Company)"
          >
            {alphaSort === "asc"
              ? "Company A-Z"
              : alphaSort === "desc"
                ? "Company Z-A"
                : "Company Sort"}
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
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="w-64 pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
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
                  { key: "pcsPo", label: "PCS PO" },
                  { key: "nominal", label: "Nominal" },
                  { key: "submitDate", label: "Submit Date" },
                  { key: "tglPo", label: "Tgl PO" },
                  { key: "dueDate", label: "Tgl Expired" },
                  { key: "regional", label: "Regional" },
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
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-left border-collapse table-auto text-sm">
          <thead>
            <tr className="text-gray-700 text-sm uppercase tracking-wider border-b border-gray-100">
              {visibleCols.company && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white">
                  Company
                </th>
              )}
              {visibleCols.nopo && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white">
                  No PO
                </th>
              )}
              {visibleCols.pcsPo && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white text-right">
                  PCS PO
                </th>
              )}
              {visibleCols.nominal && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white text-right">
                  Nominal
                </th>
              )}
              {visibleCols.submitDate && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white">
                  Submit Date
                </th>
              )}
              {visibleCols.tglPo && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white">
                  Tgl PO
                </th>
              )}
              {visibleCols.dueDate && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white">
                  Tgl Expired
                </th>
              )}
              {visibleCols.regional && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white">
                  Regional
                </th>
              )}
              {visibleCols.status && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white">
                  Status
                </th>
              )}
              {visibleCols.actions && (
                <th className="px-6 py-3 font-semibold text-center sticky top-0 z-10 bg-white">
                  Actions
                </th>
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
                {visibleCols.pcsPo && (
                  <td className="px-6 py-4 text-right">
                    <span className="text-base font-bold text-slate-700 tabular-nums">
                      {(() => {
                        const total =
                          typeof po?.pcsTotal === "number"
                            ? po.pcsTotal
                            : (Array.isArray(po?.Items) ? po.Items : []).reduce(
                                (acc: number, it: any) =>
                                  acc + (Number(it?.pcs) || 0),
                                0,
                              );
                        return Number(total || 0).toLocaleString("id-ID");
                      })()}
                    </span>
                  </td>
                )}
                {visibleCols.nominal && (
                  <td className="px-6 py-4 text-right">
                    <span className="text-base font-bold text-slate-700 tabular-nums">
                      {(() => {
                        const total =
                          typeof po?.totalNominal === "number"
                            ? po.totalNominal
                            : (Array.isArray(po?.Items) ? po.Items : []).reduce(
                                (acc: number, it: any) =>
                                  acc + (Number(it?.nominal) || 0),
                                0,
                              );
                        return `Rp ${Number(total || 0).toLocaleString("id-ID")}`;
                      })()}
                    </span>
                  </td>
                )}
                {visibleCols.submitDate && (
                  <td className="px-6 py-4">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">
                      Submitted
                    </span>
                    <span className="block text-sm font-bold text-slate-700">
                      {(() => {
                        const dt =
                          toDate(po?.createdAt) ||
                          toDate(po?.updatedAt) ||
                          toDate(po?.tglPo);
                        return dt ? dt.toLocaleDateString("id-ID") : "-";
                      })()}
                    </span>
                  </td>
                )}
                {visibleCols.tglPo && (
                  <td className="px-6 py-4">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">
                      Tgl PO
                    </span>
                    <span className="block text-sm font-bold text-slate-700">
                      {toDate(po.tglPo)?.toLocaleDateString("id-ID") || "-"}
                    </span>
                  </td>
                )}
                {visibleCols.dueDate && (
                  <td className="px-6 py-4">
                    <span className="block text-xs text-gray-500 uppercase font-semibold">
                      Tgl Expired
                    </span>
                    <span className="block text-sm font-bold text-red-500">
                      {toDate(po.expiredTgl)?.toLocaleDateString("id-ID") ||
                        "-"}
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
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            const no = String(
                              po?.noPo || po?.nopo || po?.poNumber || "",
                            ).trim();
                            if (!no) return;
                            setEditNoPo(no);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
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
                <td
                  className="px-6 py-6 text-sm text-gray-500"
                  colSpan={Object.values(visibleCols).filter(Boolean).length}
                >
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
      <POEditModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditNoPo(null);
        }}
        noPo={editNoPo}
        returnMode="summary"
        onSaved={(updated) => {
          const updatedNo = String(updated?.noPo || "").trim();
          const originalNo = String(updated?.__originalNoPo || "").trim();
          if (!updatedNo) return;
          setPoData((prev) =>
            prev.map((x) => {
              const xNo = String(
                x?.noPo || x?.nopo || x?.poNumber || "",
              ).trim();
              return xNo === updatedNo || (originalNo && xNo === originalNo)
                ? { ...x, ...updated, noPo: updatedNo }
                : x;
            }),
          );
        }}
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
