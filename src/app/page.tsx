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
  ChevronDown,
  Hourglass,
  ListChecks,
  Menu,
  Pencil,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import SmoothSelect from "@/components/ui/smooth-select";
import PODetailModal from "@/components/po-detail-modal";
import POEditModal from "@/components/po-edit-modal";
import { useAutoRefreshTick } from "@/components/auto-refresh";
import { getMe } from "@/lib/me";
import { getUnits } from "@/lib/units";
import POFilters from "@/components/po-filters";

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-slate-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
          <div className="h-7 w-20 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-28 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function TableRowSkeleton({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`h-4 bg-slate-200 rounded ${i === 0 ? "w-8" : i % 3 === 0 ? "w-28" : i % 3 === 1 ? "w-44" : "w-20"}`}
          />
        </td>
      ))}
    </tr>
  );
}
export default function Home() {
  const refreshTick = useAutoRefreshTick();
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | null>(null);
  const [regional, setRegional] = useState<string | null>(null);
  const [siteArea, setSiteArea] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [unitData, setUnitData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    inProgressCount: 0,
    needAssignCount: 0,
    almostExpiredCount: 0,
    expiredCount: 0,
    completedCount: 0,
  });
  const [tableFocus, setTableFocus] = useState<
    "active" | "assign" | "almost_expired" | "expired" | "completed" | null
  >(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const me = await getMe();
      setRole(me?.role as any);
      setRegional(me?.regional || null);
      setSiteArea((me as any)?.siteArea || null);
      setRoleReady(true);
    } catch {
      setRole("pusat");
      setRegional(null);
      setSiteArea(null);
      setRoleReady(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = () => {
      if (!mounted) return;
      fetchMe();
    };
    if (typeof document !== "undefined" && !document.hasFocus()) {
      window.addEventListener("focus", run, { once: true });
      return () => {
        mounted = false;
        window.removeEventListener("focus", run);
      };
    }
    run();
    return () => {
      mounted = false;
    };
  }, [fetchMe]);

  const fetchUnits = useCallback(async () => {
    try {
      const list = await getUnits();
      setUnitData(Array.isArray(list) ? list : []);
    } catch {
      setUnitData([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = () => {
      if (!mounted) return;
      fetchUnits();
    };
    if (typeof document !== "undefined" && !document.hasFocus()) {
      window.addEventListener("focus", run, { once: true });
      return () => {
        mounted = false;
        window.removeEventListener("focus", run);
      };
    }
    run();
    return () => {
      mounted = false;
    };
  }, [fetchUnits]);

  const statsParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("includeUnknown", "true");
    if ((role === "rm" || role === "sitearea") && regional) {
      params.set("regional", regional);
    }
    if (role === "sitearea" && siteArea) {
      params.set("siteArea", siteArea);
    }
    if (dateFrom) params.set("tglFrom", dateFrom);
    if (dateTo) params.set("tglTo", dateTo);
    return params.toString();
  }, [role, regional, siteArea, dateFrom, dateTo]);

  const fetchStats = useCallback(
    async (signal?: AbortSignal) => {
      setStatsLoading(true);
      try {
        const res = await fetch(`/api/po/stats?${statsParams}`, {
          cache: "no-store",
          signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) throw new Error("Gagal mengambil statistik PO");
        const s = json as any;
        setStats({
          totalCount: Number(s?.cAll) || 0,
          activeCount: Number(s?.cActive) || 0,
          inProgressCount: 0,
          needAssignCount: Number(s?.cAssign) || 0,
          almostExpiredCount: Number(s?.cAlmost) || 0,
          expiredCount: Number(s?.cExpired) || 0,
          completedCount: Number(s?.cCompleted) || 0,
        });
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
      } finally {
        setStatsLoading(false);
      }
    },
    [statsParams],
  );

  useEffect(() => {
    if (!roleReady) return;
    let mounted = true;
    const controller = new AbortController();
    const run = () => {
      if (mounted) fetchStats(controller.signal);
    };
    if (typeof document !== "undefined" && !document.hasFocus()) {
      window.addEventListener("focus", run, { once: true });
      return () => {
        mounted = false;
        window.removeEventListener("focus", run);
        controller.abort();
      };
    }
    const timer = window.setTimeout(run, 100);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [roleReady, fetchStats]);

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

  const {
    totalCount,
    activeCount,
    inProgressCount,
    needAssignCount,
    almostExpiredCount,
    expiredCount,
    completedCount,
  } = stats;

  const showStatsSkeleton = !roleReady || statsLoading;

  const focusTable = (
    group: "active" | "assign" | "almost_expired" | "expired" | "completed",
  ) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
        {showStatsSkeleton ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="PO Total"
              value={String(totalCount)}
              subValue={`${totalCount} total`}
              subLabel=""
              color=""
              variant="amber"
              icon={<Briefcase size={20} />}
              tooltip="Total keseluruhan po"
            />
            <StatCard
              title="PO Active"
              value={String(activeCount)}
              subValue={`${activeCount} active`}
              subLabel=""
              color=""
              variant="blue"
              icon={<Eye size={20} />}
              onClick={() => focusTable("active")}
              tooltip="PO yang belum melewati tgl due date dan belum memiliki no invoice"
            />
            <StatCard
              title="PO Need To Assign"
              value={String(needAssignCount)}
              subValue={`${needAssignCount} need assign`}
              subLabel=""
              color=""
              variant="amber"
              icon={<UserPlus size={20} />}
              onClick={() => focusTable("assign")}
              tooltip="Regional/site area masih kosong"
            />
            <StatCard
              title="PO Almost Expired"
              value={String(almostExpiredCount)}
              subValue={`${almostExpiredCount} within 14 days`}
              subLabel=""
              color=""
              variant="rose"
              icon={<ClockAlert size={20} />}
              onClick={() => focusTable("almost_expired")}
              tooltip="PO h-1 due date"
            />
            <StatCard
              title="PO Expired"
              value={String(expiredCount)}
              subValue={`${expiredCount} expired`}
              subLabel=""
              color=""
              variant="rose"
              icon={<CalendarClock size={20} />}
              onClick={() => focusTable("expired")}
              tooltip="Sudah melewati due date"
            />
            <StatCard
              title="PO Completed"
              value={String(completedCount)}
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
        className="mt-8 bg-white text-black rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <Suspense
          fallback={
            <div className="p-10 text-center text-slate-500">
              Memuat tabel...
            </div>
          }
        >
          <TableUnderChart
            refreshTick={refreshTick}
            role={role}
            regional={regional}
            siteArea={siteArea}
            units={unitData}
            focusGroup={tableFocus}
            onFocusApplied={() => setTableFocus(null)}
            counts={{
              cAll: stats.totalCount,
              cActive: stats.activeCount,
              cAssign: stats.needAssignCount,
              cProgress: stats.inProgressCount,
              cAlmost: stats.almostExpiredCount,
              cExpired: stats.expiredCount,
              cCompleted: stats.completedCount,
            }}
          />
        </Suspense>
      </div>
    </main>
  );
}

function TableUnderChart({
  refreshTick,
  role,
  regional,
  siteArea,
  units,
  focusGroup,
  onFocusApplied,
  counts,
}: {
  refreshTick: number;
  role: "pusat" | "rm" | "sitearea" | null;
  regional: string | null;
  siteArea: string | null;
  units: any[];
  focusGroup:
    | "active"
    | "assign"
    | "almost_expired"
    | "expired"
    | "completed"
    | null;
  onFocusApplied: () => void;
  counts: {
    cAll: number;
    cActive: number;
    cAssign: number;
    cProgress: number;
    cAlmost: number;
    cExpired: number;
    cCompleted: number;
  };
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [editOpen, setEditOpen] = useState(false);
  const [editNoPo, setEditNoPo] = useState<string | null>(null);
  const [group, setGroup] = useState<
    "all" | "active" | "assign" | "almost_expired" | "expired" | "completed"
  >("all");
  const [visibleCols, setVisibleCols] = useState({
    company: true,
    nopo: true,
    pcsPo: true,
    nominal: true,
    submitDate: true,
    tglPo: true,
    tglKirim: true,
    dueDate: true,
    regional: true,
    status: true,
    actions: true,
  });
  const [colsOpen, setColsOpen] = useState(false);
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [rowsPerPage, setRowsPerPage] = useState(
    () => Number(searchParams.get("limit")) || 10,
  );
  const [serverTotal, setServerTotal] = useState(0);

  // Sync page and limit to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (Number(params.get("page")) !== page) {
      params.set("page", page.toString());
      changed = true;
    }
    if (Number(params.get("limit")) !== rowsPerPage) {
      params.set("limit", rowsPerPage.toString());
      changed = true;
    }

    if (changed) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [page, rowsPerPage, pathname, router, searchParams]);

  const toggleCol = (key: keyof typeof visibleCols) =>
    setVisibleCols((v) => ({ ...v, [key]: !v[key] }));
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortDesc, setSortDesc] = useState(true);
  const [alphaSort, setAlphaSort] = useState<"none" | "asc" | "desc">("none");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [regionalFilter, setRegionalFilter] = useState("");
  const [siteAreaFilter, setSiteAreaFilter] = useState("");
  const [poLoadError, setPoLoadError] = useState<string | null>(null);
  const [allPoData, setAllPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [assignOpenId, setAssignOpenId] = useState<string | null>(null);
  const modalOpen = detailOpen || editOpen;
  const handleSearchChange = useCallback((v: string) => {
    setPage(1);
    setDebouncedSearch(v);
  }, []);

  const handleFilterChange = useCallback((next: any) => {
    setPage(1);
    if (typeof next.dateFrom === "string") setDateFrom(next.dateFrom);
    if (typeof next.dateTo === "string") setDateTo(next.dateTo);
    if (typeof next.regionalValue === "string")
      setRegionalFilter(next.regionalValue);
    if (typeof next.siteAreaValue === "string")
      setSiteAreaFilter(next.siteAreaValue);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    setColsOpen(false);
    setAssignOpenId(null);
  }, [modalOpen]);

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

  useEffect(() => {
    if (!focusGroup) return;
    setPage(1);
    setGroup(focusGroup);
    onFocusApplied();
  }, [focusGroup, onFocusApplied]);

  // Stats fetched centrally above; no duplicate fetch here

  const fetchKey = useMemo(() => {
    const parts = [
      String(role ?? ""),
      String(regional ?? ""),
      String(group),
      String(dateFrom || ""),
      String(dateTo || ""),
      String(debouncedSearch || ""),
      String(regionalFilter || ""),
      String(siteAreaFilter || ""),
      String(page),
      String(rowsPerPage),
      String(sortDesc ? "desc" : "asc"),
      String(alphaSort),
    ];
    return parts.join("|");
  }, [
    role,
    regional,
    group,
    dateFrom,
    dateTo,
    debouncedSearch,
    regionalFilter,
    siteAreaFilter,
    sortDesc,
    alphaSort,
  ]);

  const fetchTable = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        if (typeof document !== "undefined" && !document.hasFocus()) {
          return;
        }
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        params.set("summary", "true");
        params.set("includeItems", "false");
        params.set("group", group);
        // SERVER SIDE PAGINATION PARAMS
        params.set("limit", String(rowsPerPage));
        params.set("offset", String(Math.max(0, (page - 1) * rowsPerPage)));
        
        if ((role === "rm" || role === "sitearea") && regional) {
          params.set("regional", regional);
        }
        if (role === "sitearea" && siteArea) {
          params.set("siteArea", siteArea);
        }
        if (regionalFilter) params.set("regional", regionalFilter);
        if (siteAreaFilter) params.set("siteArea", siteAreaFilter);
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
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) {
          const msg =
            (json as any)?.error || res.statusText || "Gagal mengambil data PO";
          throw new Error(msg);
        }
        let list: any[] = [];
        if (Array.isArray((json as any)?.data)) list = (json as any).data;
        else if (Array.isArray((json as any)?.rows)) list = (json as any).rows;
        else if (Array.isArray((json as any)?.items))
          list = (json as any).items;
        else if (Array.isArray(json)) list = json as any[];
        else if (json && typeof json === "object") {
          const arrLike = Object.values(json).find((v) => Array.isArray(v));
          if (Array.isArray(arrLike)) list = arrLike as any[];
        }
        const total = Number((json as any)?.total) || list.length;
        return { list, total };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal mengambil data PO";
        return { list: [], total: 0, error: msg as string };
      }
    },
    [
      role,
      regional,
      group,
      dateFrom,
      dateTo,
      debouncedSearch,
      regionalFilter,
      siteAreaFilter,
      siteArea,
      page,
      rowsPerPage,
      sortDesc,
      alphaSort,
    ],
  );

  useEffect(() => {
    if (!role) return;
    if (typeof document !== "undefined" && !document.hasFocus()) return;
    let active = true;
    const controller = new AbortController();
    
    // SOFT LOADING LOGIC
    if (allPoData.length === 0) {
      setLoading(true);
    } else {
      setIsFetchingPage(true);
    }

    const timer = setTimeout(() => {
      if (active) {
        fetchTable(controller.signal).then((out) => {
          if (!active || !out) return;
          if ((out as any).error) {
            setPoLoadError((out as any).error as string);
          } else {
            setAllPoData(out.list || []);
            setServerTotal(out.total || 0);
            setPoLoadError(null);
          }
          setLoading(false);
          setIsFetchingPage(false);
        });
      }
    }, 100);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    role,
    group,
    dateFrom,
    dateTo,
    debouncedSearch,
    regionalFilter,
    siteAreaFilter,
    sortDesc,
    alphaSort,
    page,
    rowsPerPage,
    fetchTable,
  ]);

  // Default group 'all' allowed for all roles; no auto override

  // SERVER-SIDE PAGINATION LOGIC (NO SLICE)
  const totalPages = Math.max(1, Math.ceil(serverTotal / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = allPoData;

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

  const columnDefs = useMemo(
    () => [
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
    ],
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    dateFrom,
    dateTo,
    regionalFilter,
    siteAreaFilter,
    group,
    alphaSort,
    sortDesc,
  ]);

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

    const isShipped = mappedItems.some((it: any) => it.pcsKirim > 0);

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

      tglKirim: fullPo?.tglkirim || fullPo?.tglKirim || null,
      buktiTagih: fullPo?.buktiTagih || null,
      buktiBayar: fullPo?.buktiBayar || null,
      buktiKirim: fullPo?.buktiKirim || null,
      buktiFp: fullPo?.buktiFp || null,
      namaSupir: fullPo?.namaSupir || null,
      platNomor: fullPo?.platNomor || null,

      status: {
        kirim: !!fullPo?.statusKirim || isShipped,
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

  if (!role) {
    return (
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse table-auto text-sm min-w-[1200px]">
            <thead>
              <tr className="text-gray-700 text-sm uppercase tracking-wider border-b border-gray-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <th
                    key={i}
                    className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white"
                  >
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRowSkeleton key={i} colCount={8} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      {poLoadError && (
        <div className="mx-5 mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Gagal load data: {poLoadError}
        </div>
      )}
      <div className="px-5 py-4 border-b border-gray-100 bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full">
            {!modalOpen && (
              <>
                <div className="relative w-full md:w-auto z-[60]">
                  <SmoothSelect
                    width={172}
                    value={group}
                    onChange={(v) => {
                      setPage(1);
                      setGroup(v as any);
                    }}
                    onOpen={() => setColsOpen(false)}
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
                <button
                  className={`w-full md:w-auto px-3 py-1.5 rounded-full text-sm font-semibold border ${sortDesc ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`}
                  onClick={() => {
                    setPage(1);
                    setSortDesc((v) => !v);
                  }}
                  title="Toggle newest to oldest"
                >
                  Newest First
                </button>
                <button
                  className={`w-full md:w-auto px-3 py-1.5 rounded-full text-sm font-semibold border ${
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
                <div className="w-full md:w-auto">
                  <POFilters
                    unitData={units}
                    searchValue={debouncedSearch}
                    onSearchChange={handleSearchChange}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    regionalValue={
                      role === "rm" || role === "sitearea"
                        ? regional || ""
                        : regionalFilter
                    }
                    siteAreaValue={
                      role === "sitearea" ? siteArea || "" : siteAreaFilter
                    }
                    regionalLocked={role === "rm" || role === "sitearea"}
                    siteAreaLocked={role === "sitearea"}
                    onFilterChange={handleFilterChange}
                  />
                </div>
                <div className="relative w-full md:w-auto z-10">
                  <button
                    className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold bg-white hover:bg-gray-50"
                    onClick={() => setColsOpen((o) => !o)}
                  >
                    Customize Columns
                  </button>
                  {colsOpen && !modalOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl p-2 space-y-1 z-20">
                      {columnDefs.map((c) => (
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
              </>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[70vh] scrollbar-hide">
        <table className="w-full text-left border-collapse table-fixed text-sm min-w-[1200px]">
          <thead>
            <tr className="text-gray-700 text-sm uppercase tracking-wider border-b border-gray-100">
              <th className="px-6 py-3 font-semibold sticky top-0 left-0 z-20 bg-white w-16 border-r border-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                No
              </th>
              {visibleCols.company && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-48">
                  Company
                </th>
              )}
              {visibleCols.nopo && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-40">
                  No PO
                </th>
              )}
              {visibleCols.pcsPo && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white text-right w-24">
                  PCS PO
                </th>
              )}
              {visibleCols.nominal && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white text-right w-36">
                  Nominal
                </th>
              )}
              {visibleCols.submitDate && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-32">
                  Submit Date
                </th>
              )}
              {visibleCols.tglPo && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-32">
                  Tgl PO
                </th>
              )}
              {visibleCols.tglKirim && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-32">
                  Tgl Kirim
                </th>
              )}
              {visibleCols.dueDate && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-32">
                  Tgl Expired
                </th>
              )}
              {visibleCols.regional && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-32">
                  Regional
                </th>
              )}
              {visibleCols.status && (
                <th className="px-6 py-3 font-semibold sticky top-0 z-10 bg-white w-44">
                  Status
                </th>
              )}
              {visibleCols.actions && (
                <th className="px-6 py-3 font-semibold text-center sticky top-0 z-10 bg-white w-36">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y divide-gray-100 text-[0.95rem] transition-opacity duration-200 ${isFetchingPage ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => {
                  const colCount =
                    1 +
                    Number(visibleCols.company) +
                    Number(visibleCols.nopo) +
                    Number(visibleCols.pcsPo) +
                    Number(visibleCols.nominal) +
                    Number(visibleCols.submitDate) +
                    Number(visibleCols.tglPo) +
                    Number(visibleCols.tglKirim) +
                    Number(visibleCols.dueDate) +
                    Number(visibleCols.regional) +
                    Number(visibleCols.status) +
                    Number(visibleCols.actions);
                  return (
                    <TableRowSkeleton key={`sk-${i}`} colCount={colCount} />
                  );
                })
              : pageRows.map((po, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => openDetail(po)}
                    title="Lihat detail PO"
                  >
                    <td className="px-6 py-4 align-top text-slate-600 font-semibold tabular-nums sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {start + idx + 1}
                    </td>
                    {visibleCols.company && (
                      <td className="px-6 py-4 align-top">
                        <div
                          className="text-base font-semibold text-slate-800 tracking-tight max-w-[14rem] overflow-x-auto whitespace-nowrap scrollbar-hide"
                          title={getCompanyName(po)}
                        >
                          {getCompanyName(po)}
                        </div>
                      </td>
                    )}
                    {visibleCols.nopo && (
                      <td className="px-6 py-4 align-top">
                        <div
                          className="text-base font-mono font-bold text-slate-800 max-w-[12rem] overflow-x-auto whitespace-nowrap scrollbar-hide"
                          title={po.noPo || po.nopo || po.poNumber || "-"}
                        >
                          {po.noPo || po.nopo || po.poNumber || "-"}
                        </div>
                      </td>
                    )}
                    {visibleCols.pcsPo && (
                      <td className="px-6 py-4 text-right align-top">
                        <span className="text-base font-bold text-slate-700 tabular-nums whitespace-nowrap">
                          {(() => {
                            const total =
                              typeof po?.pcsTotal === "number"
                                ? po.pcsTotal
                                : (Array.isArray(po?.Items)
                                    ? po.Items
                                    : []
                                  ).reduce(
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
                      <td className="px-6 py-4 text-right align-top">
                        <div
                          className="text-base font-bold text-slate-700 tabular-nums max-w-[9rem] ml-auto overflow-x-auto whitespace-nowrap scrollbar-hide"
                          title={`Rp ${Number(
                            typeof po?.totalNominal === "number"
                              ? po.totalNominal
                              : (Array.isArray(po?.Items)
                                  ? po.Items
                                  : []
                                ).reduce(
                                  (acc: number, it: any) =>
                                    acc + (Number(it?.nominal) || 0),
                                  0,
                                ) || 0,
                          ).toLocaleString("id-ID")}`}
                        >
                          {(() => {
                            const total =
                              typeof po?.totalNominal === "number"
                                ? po.totalNominal
                                : (Array.isArray(po?.Items)
                                    ? po.Items
                                    : []
                                  ).reduce(
                                    (acc: number, it: any) =>
                                      acc + (Number(it?.nominal) || 0),
                                    0,
                                  );
                            return `Rp ${Number(total || 0).toLocaleString("id-ID")}`;
                          })()}
                        </div>
                      </td>
                    )}
                    {visibleCols.submitDate && (
                      <td className="px-6 py-4 align-top">
                        <span className="block text-xs text-gray-500 uppercase font-semibold leading-tight whitespace-nowrap">
                          Submitted
                        </span>
                        <span className="block text-sm font-bold text-slate-700 leading-tight whitespace-nowrap mt-0.5">
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
                      <td className="px-6 py-4 align-top">
                        <span className="block text-xs text-gray-500 uppercase font-semibold leading-tight whitespace-nowrap">
                          Tgl PO
                        </span>
                        <span className="block text-sm font-bold text-slate-700 leading-tight whitespace-nowrap mt-0.5">
                          {toDate(po.tglPo)?.toLocaleDateString("id-ID") || "-"}
                        </span>
                      </td>
                    )}
                    {visibleCols.tglKirim && (
                      <td className="px-6 py-4 align-top">
                        <span className="block text-xs text-gray-500 uppercase font-semibold leading-tight whitespace-nowrap">
                          Tgl Kirim
                        </span>
                        <span className="block text-sm font-bold text-slate-700 leading-tight whitespace-nowrap mt-0.5">
                          {toDate(
                            (po as any).tglkirim || (po as any).tglKirim,
                          )?.toLocaleDateString("id-ID") || "-"}
                        </span>
                      </td>
                    )}
                    {visibleCols.dueDate && (
                      <td className="px-6 py-4 align-top">
                        <span className="block text-xs text-gray-500 uppercase font-semibold leading-tight whitespace-nowrap">
                          Tgl Expired
                        </span>
                        <span className="block text-sm font-bold text-red-500 leading-tight whitespace-nowrap mt-0.5">
                          {toDate(po.expiredTgl)?.toLocaleDateString("id-ID") ||
                            "-"}
                        </span>
                      </td>
                    )}
                    {visibleCols.regional && (
                      <td className="px-6 py-4 align-top">
                        <div
                          className="text-sm font-semibold text-slate-700 max-w-[10rem] overflow-x-auto whitespace-nowrap scrollbar-hide"
                          title={
                            po?.regional ||
                            po?.UnitProduksi?.namaRegional ||
                            "-"
                          }
                        >
                          {po?.regional ||
                            po?.UnitProduksi?.namaRegional ||
                            "-"}
                        </div>
                      </td>
                    )}
                    {visibleCols.status && (
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-[10rem]">
                          <span
                            className={`inline-flex items-center gap-2 text-sm font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusChipClass(
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
                                className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${flag.className}`}
                              >
                                {flag.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                    )}
                    {visibleCols.actions && (
                      <td className="px-6 py-4 text-center align-top">
                        <div className="flex items-center justify-center gap-2">
                          {role === "rm" && group === "assign" ? (
                            <AssignDropdown
                              po={po}
                              units={units}
                              regional={regional}
                              onAssigned={(unit: any) => {
                                setAllPoData((prev) =>
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
                            <>
                              {(role === "pusat" || role === "rm") && (
                                <button
                                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                                  title="Edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const no = String(
                                      po?.noPo ||
                                        po?.nopo ||
                                        po?.poNumber ||
                                        "",
                                    ).trim();
                                    if (!no) return;
                                    setEditNoPo(no);
                                    setEditOpen(true);
                                  }}
                                >
                                  <Pencil
                                    size={14}
                                    className="text-amber-500"
                                  />
                                </button>
                              )}
                              <button
                                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                                title="View Detail"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(po);
                                }}
                              >
                                <Eye size={16} className="text-slate-600" />
                              </button>
                              {role === "pusat" && (
                                <>
                                  <button
                                    className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                                    title="Update"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDetail(po);
                                    }}
                                  >
                                    <RefreshCw
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  </button>
                                  <button
                                    className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                                    title="Extend"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDetail(po);
                                    }}
                                  >
                                    <CalendarClock
                                      size={14}
                                      className="text-emerald-600"
                                    />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            {!loading && pageRows.length === 0 && (
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
          const norm = (s: any) =>
            String(s ?? "")
              .trim()
              .toLowerCase();
          const updatedNo = norm(updated?.noPo || updated?.nopo || "");
          const originalNo = norm(updated?.__originalNoPo || "");
          if (!updatedNo) return;
          setAllPoData((prev) =>
            prev.map((x) => {
              const xNo = norm(x?.noPo || x?.nopo || x?.poNumber || "");
              return xNo === updatedNo || (originalNo && xNo === originalNo)
                ? {
                    ...x,
                    ...updated,
                    noPo: String(updated?.noPo || updated?.nopo || "").trim(),
                  }
                : x;
            }),
          );
          fetchTable().then((out) => {
            if (!out) return;
            if ((out as any).error) {
              setPoLoadError((out as any).error as string);
              return;
            }
            setAllPoData(out.list || []);
            setServerTotal(out.total || 0);
            setPoLoadError(null);
          });
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
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="Halaman Pertama"
            >
              «
            </button>
            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              title="Sebelumnya"
            >
              ‹
            </button>
            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              title="Selanjutnya"
            >
              ›
            </button>
            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              title="Halaman Terakhir"
            >
              »
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
