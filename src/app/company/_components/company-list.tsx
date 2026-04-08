"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Upload,
  Pencil,
  Trash2,
  CalendarClock,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import PODetailModal from "@/components/po-detail-modal";
import POEditModal from "@/components/po-edit-modal";
import { LoaderThree } from "@/components/ui/loader";
import { getMe, getMeSync } from "@/lib/me";
import BulkUploadModal from "@/components/bulk-upload-modal";
import DateInputHybrid from "@/components/DateInputHybrid";

type GroupedPO = {
  company: string;
  pos: any[];
};

const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export default function CompanyList({
  focusCompany,
}: { focusCompany?: string } = {}) {
  const session = getMeSync();
  const role = session?.role || "pusat"; // Default to pusat as safety or for initial server render (client component)
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupedPO[]>([]);
  const [openCompanies, setOpenCompanies] = useState<Record<string, boolean>>(
    {},
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [badgeModeByCompany, setBadgeModeByCompany] = useState<
    Record<string, null | "expired" | "active" | "almost" | "complete">
  >({});
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editNoPo, setEditNoPo] = useState<string | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inisialPage, setInisialPage] = useState<Record<string, number>>({});
  const [activeInisial, setActiveInisial] = useState<
    Record<string, string | null>
  >({});
  const [inisialPoSearch, setInisialPoSearch] = useState<
    Record<string, string>
  >({});
  const [inisialPoDateFrom, setInisialPoDateFrom] = useState<
    Record<string, string>
  >({});
  const [inisialPoDateTo, setInisialPoDateTo] = useState<
    Record<string, string>
  >({});
  const [inisialPoSort, setInisialPoSort] = useState<
    Record<string, "newest" | "oldest">
  >({});
  const [poPage, setPoPage] = useState<Record<string, number>>({});
  const [poRowsPerPage, setPoRowsPerPage] = useState<Record<string, number>>(
    {},
  );
  const lastCtrlRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (typeof document !== "undefined" && !document.hasFocus()) return;
    setLoading(true);
    if (lastCtrlRef.current) {
      try {
        lastCtrlRef.current.abort();
      } catch {}
    }
    const ctrl = new AbortController();
    lastCtrlRef.current = ctrl;
    const timer = window.setTimeout(() => ctrl.abort(), 10000);
    try {
      const me = await getMe();
      let url = "/api/po";
      url += `?summary=true&includeUnknown=true`;
      if (me?.role === "rm" && me?.regional) {
        url += `&regional=${encodeURIComponent(me.regional)}`;
      }
      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (json as any)?.error || res.statusText || "Gagal mengambil data PO";
        throw new Error(msg);
      }
      const list = Array.isArray(json)
        ? json
        : Array.isArray((json as any)?.data)
          ? (json as any).data
          : [];
      const byCompany: Record<string, any[]> = {};
      for (const po of list) {
        const company = po?.RitelModern?.namaPt || "Unknown";
        if (!byCompany[company]) byCompany[company] = [];
        byCompany[company].push(po);
      }
      const g: GroupedPO[] = Object.entries(byCompany)
        .map(([k, v]) => ({ company: k, pos: v }))
        .sort((a, b) => a.company.localeCompare(b.company));
      setGroups(g);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error(e);
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialLoad) return;
    if (typeof document !== "undefined" && !document.hasFocus()) {
      const onFocus = () => {
        fetchData().finally(() => setIsInitialLoad(false));
      };
      window.addEventListener("focus", onFocus, { once: true });
      return () => window.removeEventListener("focus", onFocus);
    }
    fetchData().finally(() => setIsInitialLoad(false));
  }, [fetchData, isInitialLoad]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (isInitialLoad) return;
    if (typeof document !== "undefined" && !document.hasFocus()) return;
    fetchData();
  }, [debouncedSearch, fetchData, isInitialLoad, currentPage]);

  const handlePOCreated = () => {
    fetchData();
  };

  const handleDelete = async (noPo: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/po?noPo=${encodeURIComponent(noPo)}`, {
        method: "DELETE",
      });
      fetchData();
      setConfirmDelete(null);
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus PO");
    } finally {
      setDeleting(false);
    }
  };

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const isCompleted = (po: any) =>
    String(po?.noInvoice ?? "").trim().length > 0;
  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const filterPosByMode = (
    pos: any[],
    mode: null | "expired" | "active" | "almost" | "complete",
  ) => {
    const list = Array.isArray(pos) ? pos : [];
    if (!mode) return list;
    if (mode === "complete") return list.filter((po) => isCompleted(po));
    const isInProgress = (po: any) => !isCompleted(po);
    if (mode === "expired") {
      return list.filter((po) => {
        if (!isInProgress(po)) return false;
        const du = daysUntil(toDate(po?.expiredTgl));
        return du != null && du < 0;
      });
    }
    if (mode === "almost") {
      return list.filter((po) => {
        if (!isInProgress(po)) return false;
        const du = daysUntil(toDate(po?.expiredTgl));
        return du != null && du >= 0 && du <= 3;
      });
    }
    return list.filter((po) => {
      if (!isInProgress(po)) return false;
      const du = daysUntil(toDate(po?.expiredTgl));
      return du != null && du >= 0;
    });
  };

  const globalQ = useMemo(() => norm(debouncedSearch), [debouncedSearch]);
  const highlightTerm = useMemo(
    () => String(searchQuery ?? "").trim(),
    [searchQuery],
  );

  const getHighlightedText = useCallback((text: any, highlight: string) => {
    const raw = String(text ?? "");
    const h = String(highlight ?? "").trim();
    if (!h) return raw;
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    const parts = raw.split(re);
    return parts.map((part, idx) => {
      const isMatch = part.toLowerCase() === h.toLowerCase();
      return isMatch ? (
        <mark
          key={`${idx}-${part}`}
          className="bg-yellow-300 text-black rounded-sm px-0.5 font-semibold"
        >
          {part}
        </mark>
      ) : (
        <span key={`${idx}-${part}`}>{part}</span>
      );
    });
  }, []);

  const poMatchesQ = useCallback((po: any, q: string) => {
    if (!q) return false;
    const noPo = norm(po?.noPo || "");
    if (noPo.includes(q)) return true;
    const noInvoice = norm(po?.noInvoice || "");
    if (noInvoice.includes(q)) return true;
    const firstProduct = norm(po?.firstProductName || "");
    if (firstProduct && firstProduct.includes(q)) return true;
    const inisial = norm(po?.RitelModern?.inisial || "");
    if (inisial && inisial.includes(q)) return true;
    return false;
  }, []);

  const filteredGroups = useMemo(() => {
    const q = globalQ;
    if (!q) return groups;
    return groups.filter((g) => {
      const companyName = String(g.company || "").toLowerCase();
      if (companyName.includes(q)) return true;
      const list = Array.isArray(g.pos) ? g.pos : [];
      return list.some((po: any) => {
        return poMatchesQ(po, q);
      });
    });
  }, [groups, globalQ, poMatchesQ]);

  const autoExpand = useMemo(() => {
    const q = globalQ;
    if (!q) return null;
    const perPage = 5;
    const open: Record<string, boolean> = {};
    const active: Record<string, string | null> = {};
    const pageByCompany: Record<string, number> = {};
    for (const g of groups) {
      const pos = Array.isArray(g.pos) ? g.pos : [];
      const groupsByInisial: Record<string, any[]> = {};
      for (const po of pos) {
        const alias = (po?.RitelModern?.inisial as string) || "—";
        if (!groupsByInisial[alias]) groupsByInisial[alias] = [];
        groupsByInisial[alias].push(po);
      }
      const aliases = Object.keys(groupsByInisial).sort((a, b) =>
        a.localeCompare(b),
      );
      const matchingAliases = aliases.filter((alias) =>
        (groupsByInisial[alias] || []).some((po) => poMatchesQ(po, q)),
      );
      if (matchingAliases.length === 0) continue;
      const chosen = matchingAliases[0];
      open[g.company] = true;
      active[g.company] = chosen;
      const idx = Math.max(0, aliases.indexOf(chosen));
      pageByCompany[g.company] = Math.floor(idx / perPage) + 1;
    }
    return { open, active, pageByCompany };
  }, [globalQ, groups, poMatchesQ]);

  useEffect(() => {
    if (!autoExpand) return;
    setOpenCompanies((prev) => ({ ...prev, ...autoExpand.open }));
    setActiveInisial((prev) => ({ ...prev, ...autoExpand.active }));
    setInisialPage((prev) => ({ ...prev, ...autoExpand.pageByCompany }));
  }, [autoExpand]);

  const totalUniquePo = useMemo(() => {
    const set = new Set<string>();
    for (const g of filteredGroups) {
      const list = Array.isArray(g.pos) ? g.pos : [];
      for (const po of list) {
        const noPo = String(po?.noPo || "").trim();
        if (noPo) set.add(noPo);
      }
    }
    return set.size;
  }, [filteredGroups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = useMemo(
    () => filteredGroups.slice(indexOfFirst, indexOfLast),
    [filteredGroups, indexOfFirst, indexOfLast],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / itemsPerPage),
  );

  const toggleCompany = (name: string) =>
    setOpenCompanies((prev) => ({ ...prev, [name]: !prev[name] }));
  useEffect(() => {
    if (!focusCompany) return;
    setSearchQuery(focusCompany);
    setCurrentPage(1);
    setOpenCompanies((prev) => ({ ...prev, [focusCompany]: true }));
    const t = setTimeout(() => {
      const el = document.getElementById(
        `company-${encodeURIComponent(focusCompany)}`,
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [focusCompany, groups]);

  const openModal = async (po: any) => {
    const nopo = String(po?.noPo || "").trim();
    let fullPo = po;
    if (nopo) {
      try {
        const me = await getMe();
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        params.set("noPo", nopo);
        params.set("includeItems", "true");
        params.set("limit", "1");
        params.set("offset", "0");
        if (me?.role === "rm" && me?.regional) {
          params.set("regional", me.regional);
        }
        const res = await fetch(`/api/po?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        const first = Array.isArray((json as any)?.data)
          ? (json as any).data[0]
          : Array.isArray(json)
            ? (json as any)[0]
            : null;
        if (first) fullPo = first;
      } catch {}
    }

    const items = Array.isArray(fullPo?.Items) ? fullPo.Items : [];
    const productNames = items
      .map((i: any) => i?.Product?.name)
      .filter(Boolean);
    const productDisplay =
      productNames.length > 0
        ? productNames.length > 1
          ? `${productNames[0]} (+${productNames.length - 1} lainnya)`
          : productNames[0]
        : "-";
    const totalTagih =
      items.reduce((acc: number, curr: any) => acc + (curr?.rpTagih || 0), 0) ||
      0;

    const isShipped = items.some((it: any) => (Number(it?.pcsKirim) || 0) > 0);

    setSelectedPO({
      ...fullPo,
      company: fullPo?.RitelModern?.namaPt || fullPo?.company || "Unknown",
      createdAt: fullPo?.createdAt || null,
      updatedAt: fullPo?.updatedAt || null,
      productName: productDisplay,
      regional: fullPo?.regional || fullPo?.UnitProduksi?.namaRegional || null,
      siteArea:
        fullPo?.UnitProduksi?.siteArea &&
        fullPo.UnitProduksi.siteArea !== "UNKNOWN"
          ? fullPo.UnitProduksi.siteArea
          : "-",
      Items: items,
      rpTagih: totalTagih,
      status: {
        kirim: !!fullPo.statusKirim || isShipped,
        sdif: !!fullPo.statusSdif,
        po: !!fullPo.statusPo,
        fp: !!fullPo.statusFp,
        kwi: !!fullPo.statusKwi,
        inv: !!fullPo.statusInv,
        tagih: !!fullPo.statusTagih,
        bayar: !!fullPo.statusBayar,
      },
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company</h1>
          <p className="text-sm text-slate-500">
            Monitoring daftar PO per company
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nama company / No PO / No Invoice / inisial..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex flex-col gap-2 sm:items-end w-full md:w-auto">
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setIsBulkOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border-slate-200 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
              >
                <Upload size={18} />
                Bulk Upload
              </button>
              <Link
                href="/po"
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
              >
                <Plus size={18} />
                Add PO
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 sm:p-4">
        <div className="flex items-center justify-end px-2 sm:px-0 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const next = Number(e.target.value);
                setItemsPerPage(next);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-slate-500">data</span>
          </div>
        </div>
        {loading ? (
          <div className="py-16">
            <LoaderThree label="Loading PO" />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-sm text-slate-500 px-2 py-6">Tidak ada data</div>
        ) : (
          <>
            <ul className="space-y-3">
              {currentItems.map((g) => {
                const open = !!openCompanies[g.company];
                return (
                  <li
                    key={g.company}
                    id={`company-${encodeURIComponent(g.company)}`}
                    className="rounded-2xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCompany(g.company)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-bold tracking-wide text-left">
                        {getHighlightedText(g.company, highlightTerm)}
                      </span>
                      {(() => {
                        const pos = Array.isArray(g.pos) ? g.pos : [];
                        const completed = filterPosByMode(
                          pos,
                          "complete",
                        ).length;
                        const almost = filterPosByMode(pos, "almost").length;
                        const expired = filterPosByMode(pos, "expired").length;
                        const active = filterPosByMode(pos, "active").length;
                        const badgeClass =
                          "flex items-center justify-between gap-2 w-[118px] px-3 py-1.5 rounded-full bg-white/10 border border-white/15";
                        const labelClass =
                          "text-[10px] font-black uppercase tracking-widest text-white/70 whitespace-nowrap";
                        const valueBase =
                          "min-w-9 px-2 py-0.5 rounded-full text-xs font-black text-center tabular-nums";
                        const makeBadgeHandlers = (
                          mode: "expired" | "active" | "almost" | "complete",
                          count: number,
                        ) => ({
                          title:
                            mode === "expired"
                              ? "Klik untuk lihat PO Expired"
                              : mode === "active"
                                ? "Klik untuk lihat PO In Progress"
                                : mode === "almost"
                                  ? "Klik untuk lihat PO Almost Expired (H-3)"
                                  : "Klik untuk lihat PO Completed",
                          className: `${badgeClass} ${
                            count > 0
                              ? "cursor-pointer hover:bg-white/15 hover:border-white/25"
                              : "opacity-60 cursor-default"
                          } ${
                            badgeModeByCompany[g.company] === mode
                              ? "ring-2 ring-white/20"
                              : ""
                          }`,
                          onMouseDown: (e: any) => {
                            e.preventDefault();
                            e.stopPropagation();
                          },
                          onClick: (e: any) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (count <= 0) return;
                            setOpenCompanies((prev) => ({
                              ...prev,
                              [g.company]: true,
                            }));
                            setBadgeModeByCompany((prev) => ({
                              ...prev,
                              [g.company]:
                                prev[g.company] === mode ? null : mode,
                            }));
                          },
                        });
                        return (
                          <div className="flex items-center gap-3 shrink-0">
                            <Link
                              href={`/company/${encodeURIComponent(g.company)}`}
                              title="View all PO"
                              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 hover:border-white/25"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/80 whitespace-nowrap">
                                View all
                              </span>
                              <ArrowUpRight size={14} />
                            </Link>
                            <div className="hidden md:flex flex-wrap justify-end gap-2 max-w-[640px]">
                              <div {...makeBadgeHandlers("active", active)}>
                                <span className={labelClass}>Active</span>
                                <span
                                  className={`${valueBase} bg-white text-slate-900`}
                                >
                                  {active}
                                </span>
                              </div>
                              <div {...makeBadgeHandlers("expired", expired)}>
                                <span className={labelClass}>Expired</span>
                                <span
                                  className={`${valueBase} bg-rose-200 text-rose-900`}
                                >
                                  {expired}
                                </span>
                              </div>
                              <div {...makeBadgeHandlers("almost", almost)}>
                                <span className={labelClass}>H-3</span>
                                <span
                                  className={`${valueBase} bg-amber-200 text-amber-900`}
                                >
                                  {almost}
                                </span>
                              </div>
                              <div
                                {...makeBadgeHandlers("complete", completed)}
                              >
                                <span className={labelClass}>Complete</span>
                                <span
                                  className={`${valueBase} bg-emerald-200 text-emerald-900`}
                                >
                                  {completed}
                                </span>
                              </div>
                              <div className={badgeClass}>
                                <span className={labelClass}>Total</span>
                                <span
                                  className={`${valueBase} bg-white/90 text-slate-900`}
                                >
                                  {pos.length}
                                </span>
                              </div>
                            </div>
                            {open ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </div>
                        );
                      })()}
                    </button>
                    {open && (
                      <div className="p-3 bg-white">
                        {badgeModeByCompany[g.company] ? (
                          (() => {
                            const all = Array.isArray(g.pos) ? g.pos : [];
                            const mode = badgeModeByCompany[g.company];
                            const list = filterPosByMode(all, mode);
                            if (list.length === 0) {
                              return (
                                <div className="text-sm text-slate-500">
                                  Tidak ada PO
                                </div>
                              );
                            }
                            const key = `${g.company}|mode:${mode}`;
                            const pp = poPage[key] || 1;
                            const perPo = poRowsPerPage[key] || 10;
                            const totalPoPages = Math.max(
                              1,
                              Math.ceil(list.length / perPo),
                            );
                            const startPo = (pp - 1) * perPo;
                            const slice = list.slice(startPo, startPo + perPo);
                            const title =
                              mode === "expired"
                                ? "Expired"
                                : mode === "active"
                                  ? "Active"
                                  : mode === "almost"
                                    ? "Almost Expired (H-3)"
                                    : "Complete";
                            return (
                              <>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <div className="text-xs font-bold text-slate-600">
                                    Filter:{" "}
                                    {mode === "expired"
                                      ? "Expired"
                                      : mode === "active"
                                        ? "Active"
                                        : mode === "almost"
                                          ? "Almost Expired (H-3)"
                                          : "Complete"}
                                  </div>
                                  <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50"
                                    onClick={() =>
                                      setBadgeModeByCompany((prev) => ({
                                        ...prev,
                                        [g.company]: null,
                                      }))
                                    }
                                  >
                                    Show all
                                  </button>
                                </div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="text-xs font-bold text-slate-600">
                                    Daftar PO: {title}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">
                                      Tampilkan
                                    </span>
                                    <select
                                      value={perPo}
                                      onChange={(e) => {
                                        const next = Number(e.target.value);
                                        setPoRowsPerPage((prev) => ({
                                          ...prev,
                                          [key]: next,
                                        }));
                                        setPoPage((prev) => ({
                                          ...prev,
                                          [key]: 1,
                                        }));
                                      }}
                                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                                    >
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                    </select>
                                    <span className="text-xs text-slate-500">
                                      data
                                    </span>
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                  <div className="max-h-[360px] overflow-auto scrollbar-hide">
                                    <table className="w-full min-w-[1280px] text-left">
                                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                        <tr>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                            No PO
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                            Tgl PO
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                            Due Date
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                            Produk
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                            Pcs Kirim
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                            Tujuan
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-left">
                                            UNIT PRODUKSI
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-left">
                                            SITE AREA
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                            Kg
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                            Discount
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                            Nominal
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                            Aksi
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-sm uppercase">
                                        {slice.map((po: any) => {
                                          const items = Array.isArray(po?.Items)
                                            ? po.Items
                                            : [];
                                          const sum = (
                                            arr: any[],
                                            f: (x: any) => number,
                                          ) =>
                                            arr.reduce(
                                              (acc, it) => acc + (f(it) || 0),
                                              0,
                                            );
                                          const kgKirim = sum(items, (it) => {
                                            return (
                                              Number(it?.pcsKirim) *
                                              (Number(it?.Product?.satuanKg) ||
                                                1)
                                            );
                                          });
                                          const kgPesan = sum(items, (it) => {
                                            return (
                                              Number(it?.pcs) *
                                              (Number(it?.Product?.satuanKg) ||
                                                1)
                                            );
                                          });
                                          const totalKg =
                                            kgKirim || kgPesan || 0;
                                          const rpDiscount = sum(items, (it) =>
                                            Number(it?.discount),
                                          );
                                          const rpNominal = sum(items, (it) =>
                                            Number(it?.nominal),
                                          );
                                          const n = (v: number) =>
                                            v.toLocaleString("id-ID");
                                          const pcsKirim = sum(items, (it) =>
                                            Number(it?.pcsKirim),
                                          );
                                          const tglPoDate = toDate(po?.tglPo);
                                          const tglPoText = tglPoDate
                                            ? tglPoDate.toLocaleDateString(
                                                "id-ID",
                                                {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                                },
                                              )
                                            : "-";
                                          const due = toDate(po?.expiredTgl);
                                          const dueText = due
                                            ? due.toLocaleDateString("id-ID", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                              })
                                            : "-";
                                          const productNames: string[] = items
                                            .map((it: any) => it?.Product?.name)
                                            .filter(Boolean)
                                            .map(String);
                                          const uniqueProducts: string[] =
                                            Array.from(new Set(productNames));
                                          const productText: string =
                                            uniqueProducts.length > 0
                                              ? uniqueProducts.length > 1
                                                ? `${uniqueProducts[0]} (+${uniqueProducts.length - 1} lainnya)`
                                                : uniqueProducts[0]
                                              : "-";
                                          return (
                                            <tr
                                              key={po.id}
                                              className="hover:bg-slate-50/70 cursor-pointer"
                                              title="Klik baris untuk lihat detail"
                                              onClick={() => openModal(po)}
                                            >
                                              <td
                                                className="px-4 py-3 font-mono font-bold text-slate-800 max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                                title={String(po?.noPo || "-")}
                                              >
                                                <div className="">
                                                  {getHighlightedText(
                                                    po.noPo,
                                                    highlightTerm,
                                                  )}
                                                </div>
                                                {String(
                                                  po?.noInvoice || "",
                                                ).trim() && (
                                                  <div
                                                    className="mt-1 text-[10px] font-semibold text-slate-500 max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                                    title={String(
                                                      po?.noInvoice || "-",
                                                    )}
                                                  >
                                                    INV:{" "}
                                                    {getHighlightedText(
                                                      String(
                                                        po?.noInvoice || "",
                                                      ),
                                                      highlightTerm,
                                                    )}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                {tglPoText}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                {dueText}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700 font-semibold">
                                                <div
                                                  className="max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                                  title={uniqueProducts.join(
                                                    ", ",
                                                  )}
                                                >
                                                  {getHighlightedText(
                                                    productText,
                                                    highlightTerm,
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                {n(Math.round(pcsKirim))}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700">
                                                <div
                                                  className="max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                                  title={String(
                                                    po.tujuanDetail || "-",
                                                  )}
                                                >
                                                  {getHighlightedText(
                                                    po.tujuanDetail || "-",
                                                    highlightTerm,
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                {(!po.regional || po.regional.toLowerCase() === 'unknown') ? "-" : po.regional}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                {(!po?.UnitProduksi?.siteArea || po.UnitProduksi.siteArea.toLowerCase().includes('unit produksi') || po.UnitProduksi.siteArea.toLowerCase() === 'unknown') ? "-" : po.UnitProduksi.siteArea}
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                {n(Math.round(totalKg))}
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                {n(rpDiscount || 0)}
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                {n(rpNominal || 0)}
                                              </td>
                                              <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                  <button
                                                    title="Extend"
                                                    className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                    }}
                                                  >
                                                    <CalendarClock size={16} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    title="Edit"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditNoPo(po.noPo);
                                                      setEditOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                                                  >
                                                    <Pencil size={16} />
                                                  </button>
                                                  {role === "pusat" && (
                                                    <button
                                                      title="Delete"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDelete(po.noPo);
                                                      }}
                                                      className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                                                    >
                                                      <Trash2 size={16} />
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                {list.length > perPo && (
                                  <div className="flex items-center justify-between mt-3">
                                    <p className="text-xs text-slate-500">
                                      Showing {startPo + 1}-
                                      {Math.min(startPo + perPo, list.length)}{" "}
                                      of {list.length} PO
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          setPoPage((prev) => ({
                                            ...prev,
                                            [key]: Math.max(pp - 1, 1),
                                          }))
                                        }
                                        disabled={pp === 1}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                      >
                                        Previous
                                      </button>
                                      <button
                                        onClick={() =>
                                          setPoPage((prev) => ({
                                            ...prev,
                                            [key]: Math.min(
                                              pp + 1,
                                              totalPoPages,
                                            ),
                                          }))
                                        }
                                        disabled={pp === totalPoPages}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                      >
                                        Next
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()
                        ) : g.pos.length === 0 ? (
                          <div className="text-sm text-slate-500">
                            Belum ada PO
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const groupsByInisial: Record<string, any[]> = {};
                              g.pos.forEach((po: any) => {
                                const alias =
                                  (po?.RitelModern?.inisial as string) || "—";
                                if (!groupsByInisial[alias]) {
                                  groupsByInisial[alias] = [];
                                }
                                groupsByInisial[alias].push(po);
                              });
                              const aliases = Object.keys(groupsByInisial).sort(
                                (a, b) => a.localeCompare(b),
                              );
                              const perPage = 5;
                              const ip = inisialPage[g.company] || 1;
                              const start = (ip - 1) * perPage;
                              const pageAliases = aliases.slice(
                                start,
                                start + perPage,
                              );
                              const totalPages = Math.max(
                                1,
                                Math.ceil(aliases.length / perPage),
                              );
                              const selectedAlias =
                                activeInisial[g.company] || null;

                              return (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {pageAliases.map((alias) => (
                                      <button
                                        key={alias}
                                        onClick={() =>
                                          setActiveInisial((prev) => ({
                                            ...prev,
                                            [g.company]:
                                              prev[g.company] === alias
                                                ? null
                                                : alias,
                                          }))
                                        }
                                        className={`text-left rounded-xl border p-3 hover:shadow transition-all ${
                                          selectedAlias === alias
                                            ? "border-amber-300 bg-amber-50/50"
                                            : "border-slate-200 bg-white"
                                        }`}
                                        title="Pilih inisial untuk lihat daftar PO"
                                      >
                                        <div className="text-xs font-black tracking-widest text-slate-600 uppercase">
                                          {getHighlightedText(
                                            alias,
                                            highlightTerm,
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          {groupsByInisial[alias].length} PO
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                  {aliases.length > perPage && (
                                    <div className="flex items-center justify-between mt-3">
                                      <p className="text-xs text-slate-500">
                                        Showing {start + 1}-
                                        {Math.min(
                                          start + perPage,
                                          aliases.length,
                                        )}{" "}
                                        of {aliases.length} inisial
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() =>
                                            setInisialPage((prev) => ({
                                              ...prev,
                                              [g.company]: Math.max(ip - 1, 1),
                                            }))
                                          }
                                          disabled={ip === 1}
                                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                        >
                                          Previous
                                        </button>
                                        <button
                                          onClick={() =>
                                            setInisialPage((prev) => ({
                                              ...prev,
                                              [g.company]: Math.min(
                                                ip + 1,
                                                totalPages,
                                              ),
                                            }))
                                          }
                                          disabled={ip === totalPages}
                                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                        >
                                          Next
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {selectedAlias && (
                                    <div className="mt-3 border-t border-slate-100 pt-3">
                                      {(() => {
                                        const key = `${g.company}|${selectedAlias}`;
                                        const pp = poPage[key] || 1;
                                        const perPo = poRowsPerPage[key] || 10;
                                        const list =
                                          groupsByInisial[selectedAlias];
                                        const qLocal = String(
                                          inisialPoSearch[key] || "",
                                        )
                                          .trim()
                                          .toLowerCase();
                                        const q = qLocal || globalQ;
                                        const fromYMD = String(
                                          inisialPoDateFrom[key] || "",
                                        ).trim();
                                        const toYMD = String(
                                          inisialPoDateTo[key] || "",
                                        ).trim();
                                        const sortMode: "newest" | "oldest" =
                                          inisialPoSort[key] || "newest";
                                        const filteredList = q
                                          ? list.filter((po: any) => {
                                              const noPo = String(
                                                po?.noPo || "",
                                              )
                                                .toLowerCase()
                                                .includes(q);
                                              const noInvoice = String(
                                                po?.noInvoice || "",
                                              )
                                                .toLowerCase()
                                                .includes(q);
                                              const tujuan = String(
                                                po?.tujuanDetail || "",
                                              )
                                                .toLowerCase()
                                                .includes(q);
                                              const products = Array.isArray(
                                                po?.Items,
                                              )
                                                ? po.Items.map(
                                                    (it: any) =>
                                                      it?.Product?.name,
                                                  )
                                                    .filter(Boolean)
                                                    .map(String)
                                                    .join(" ")
                                                    .toLowerCase()
                                                : String(
                                                    po?.firstProductName || "",
                                                  )
                                                    .trim()
                                                    .toLowerCase();
                                              const inisial = String(
                                                po?.RitelModern?.inisial ||
                                                  po?.inisial ||
                                                  "",
                                              )
                                                .toLowerCase()
                                                .includes(q);
                                              const company = String(
                                                po?.RitelModern?.namaPt ||
                                                  po?.company ||
                                                  "",
                                              )
                                                .toLowerCase()
                                                .includes(q);
                                              return (
                                                noPo ||
                                                noInvoice ||
                                                tujuan ||
                                                (products &&
                                                  products.includes(q)) ||
                                                inisial ||
                                                company
                                              );
                                            })
                                          : list;
                                        const filteredByDate =
                                          fromYMD || toYMD
                                            ? filteredList.filter((po: any) => {
                                                const d = toDate(po?.tglPo);
                                                if (!d) return false;
                                                const t = d.getTime();
                                                if (fromYMD) {
                                                  const from = new Date(
                                                    `${fromYMD}T00:00:00`,
                                                  ).getTime();
                                                  if (t < from) return false;
                                                }
                                                if (toYMD) {
                                                  const to = new Date(
                                                    `${toYMD}T23:59:59`,
                                                  ).getTime();
                                                  if (t > to) return false;
                                                }
                                                return true;
                                              })
                                            : filteredList;
                                        const sortedList = [
                                          ...filteredByDate,
                                        ].sort((a: any, b: any) => {
                                          const da =
                                            toDate(a?.tglPo)?.getTime() ||
                                            toDate(a?.createdAt)?.getTime() ||
                                            0;
                                          const db =
                                            toDate(b?.tglPo)?.getTime() ||
                                            toDate(b?.createdAt)?.getTime() ||
                                            0;
                                          if (da !== db) {
                                            return sortMode === "newest"
                                              ? db - da
                                              : da - db;
                                          }
                                          return String(
                                            a?.noPo || "",
                                          ).localeCompare(
                                            String(b?.noPo || ""),
                                          );
                                        });
                                        const totalPoPages = Math.max(
                                          1,
                                          Math.ceil(sortedList.length / perPo),
                                        );
                                        const startPo = (pp - 1) * perPo;
                                        const slice = sortedList.slice(
                                          startPo,
                                          startPo + perPo,
                                        );
                                        return (
                                          <>
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2">
                                              <div className="text-xs font-bold text-slate-600">
                                                Daftar PO untuk inisial:{" "}
                                                {getHighlightedText(
                                                  selectedAlias,
                                                  highlightTerm,
                                                )}
                                              </div>
                                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <div className="relative w-full sm:w-72">
                                                  <Search
                                                    size={16}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                  />
                                                  <input
                                                    value={
                                                      inisialPoSearch[key] || ""
                                                    }
                                                    onChange={(e) => {
                                                      setInisialPoSearch(
                                                        (prev) => ({
                                                          ...prev,
                                                          [key]: e.target.value,
                                                        }),
                                                      );
                                                      setPoPage((prev) => ({
                                                        ...prev,
                                                        [key]: 1,
                                                      }));
                                                    }}
                                                    placeholder="Search No PO / Tujuan / Produk..."
                                                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                                  />
                                                </div>
                                                <DateInputHybrid
                                                  value={
                                                    inisialPoDateFrom[key] || ""
                                                  }
                                                  onChange={(v) => {
                                                    setInisialPoDateFrom(
                                                      (prev) => ({
                                                        ...prev,
                                                        [key]: v,
                                                      }),
                                                    );
                                                    setPoPage((prev) => ({
                                                      ...prev,
                                                      [key]: 1,
                                                    }));
                                                  }}
                                                  className="w-[120px]"
                                                  placeholder="Dari Tgl PO"
                                                  maxDate={inisialPoDateTo[key]}
                                                />
                                                <DateInputHybrid
                                                  value={
                                                    inisialPoDateTo[key] || ""
                                                  }
                                                  onChange={(v) => {
                                                    setInisialPoDateTo(
                                                      (prev) => ({
                                                        ...prev,
                                                        [key]: v,
                                                      }),
                                                    );
                                                    setPoPage((prev) => ({
                                                      ...prev,
                                                      [key]: 1,
                                                    }));
                                                  }}
                                                  className="w-[120px]"
                                                  placeholder="Sampai Tgl PO"
                                                  minDate={
                                                    inisialPoDateFrom[key]
                                                  }
                                                />
                                                <select
                                                  value={
                                                    inisialPoSort[key] ||
                                                    "newest"
                                                  }
                                                  onChange={(e) => {
                                                    const v =
                                                      e.target.value ===
                                                      "oldest"
                                                        ? "oldest"
                                                        : "newest";
                                                    setInisialPoSort(
                                                      (prev) => ({
                                                        ...prev,
                                                        [key]: v,
                                                      }),
                                                    );
                                                    setPoPage((prev) => ({
                                                      ...prev,
                                                      [key]: 1,
                                                    }));
                                                  }}
                                                  className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                                                  title="Urutkan berdasarkan Tgl PO"
                                                >
                                                  <option value="newest">
                                                    Newest
                                                  </option>
                                                  <option value="oldest">
                                                    Oldest
                                                  </option>
                                                </select>
                                                <span className="text-xs text-slate-500">
                                                  Tampilkan
                                                </span>
                                                <select
                                                  value={perPo}
                                                  onChange={(e) => {
                                                    const next = Number(
                                                      e.target.value,
                                                    );
                                                    setPoRowsPerPage(
                                                      (prev) => ({
                                                        ...prev,
                                                        [key]: next,
                                                      }),
                                                    );
                                                    setPoPage((prev) => ({
                                                      ...prev,
                                                      [key]: 1,
                                                    }));
                                                  }}
                                                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                                                >
                                                  <option value={10}>10</option>
                                                  <option value={25}>25</option>
                                                  <option value={50}>50</option>
                                                </select>
                                                <span className="text-xs text-slate-500">
                                                  data
                                                </span>
                                              </div>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                              <div className="max-h-[360px] overflow-auto scrollbar-hide">
                                                <table className="w-full min-w-[1280px] text-left">
                                                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                    <tr>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                                        No PO
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                                        Tgl PO
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                                        Due Date
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                                        Produk
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                                        Pcs Kirim
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                                        Tujuan
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-left">
                                                        UNIT PRODUKSI
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-left">
                                                        SITE AREA
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                                        Kg
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                                        Discount
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                                        Nominal
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                                        Aksi
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100 text-sm uppercase">
                                                    {slice.map((po: any) => {
                                                      const items =
                                                        Array.isArray(po?.Items)
                                                          ? po.Items
                                                          : [];
                                                      const sum = (
                                                        arr: any[],
                                                        f: (x: any) => number,
                                                      ) =>
                                                        arr.reduce(
                                                          (acc, it) =>
                                                            acc + (f(it) || 0),
                                                          0,
                                                        );
                                                      const hasItems =
                                                        items.length > 0;
                                                      const kgKirim = hasItems
                                                        ? sum(
                                                            items,
                                                            (it) =>
                                                              Number(
                                                                it?.pcsKirim,
                                                              ) *
                                                              (Number(
                                                                it?.Product
                                                                  ?.satuanKg,
                                                              ) || 1),
                                                          )
                                                        : 0;
                                                      const kgPesan = hasItems
                                                        ? sum(
                                                            items,
                                                            (it) =>
                                                              Number(it?.pcs) *
                                                              (Number(
                                                                it?.Product
                                                                  ?.satuanKg,
                                                              ) || 1),
                                                          )
                                                        : 0;
                                                      const totalKg = hasItems
                                                        ? kgKirim ||
                                                          kgPesan ||
                                                          0
                                                        : Number(
                                                            po?.totalKgKirim ||
                                                              po?.totalKg ||
                                                              0,
                                                          ) || 0;
                                                      const rpDiscount =
                                                        hasItems
                                                          ? sum(items, (it) =>
                                                              Number(
                                                                it?.discount,
                                                              ),
                                                            )
                                                          : Number(
                                                              po?.totalDiscount ||
                                                                0,
                                                            ) || 0;
                                                      const rpNominal = hasItems
                                                        ? sum(items, (it) =>
                                                            Number(it?.nominal),
                                                          )
                                                        : Number(
                                                            po?.totalNominal ||
                                                              0,
                                                          ) || 0;
                                                      const n = (v: number) =>
                                                        v.toLocaleString(
                                                          "id-ID",
                                                        );
                                                      const pcsKirim = hasItems
                                                        ? sum(items, (it) =>
                                                            Number(
                                                              it?.pcsKirim,
                                                            ),
                                                          )
                                                        : Number(
                                                            po?.pcsKirimTotal ||
                                                              0,
                                                          ) || 0;
                                                      const tglPoDate = toDate(
                                                        po?.tglPo,
                                                      );
                                                      const tglPoText =
                                                        tglPoDate
                                                          ? tglPoDate.toLocaleDateString(
                                                              "id-ID",
                                                              {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                              },
                                                            )
                                                          : "-";
                                                      const due = toDate(
                                                        po?.expiredTgl,
                                                      );
                                                      const dueText = due
                                                        ? due.toLocaleDateString(
                                                            "id-ID",
                                                            {
                                                              day: "2-digit",
                                                              month: "short",
                                                              year: "numeric",
                                                            },
                                                          )
                                                        : "-";
                                                      const productNames: string[] =
                                                        items
                                                          .map(
                                                            (it: any) =>
                                                              it?.Product?.name,
                                                          )
                                                          .filter(Boolean)
                                                          .map(String);
                                                      const uniqueProducts: string[] =
                                                        Array.from(
                                                          new Set(productNames),
                                                        );
                                                      const productCount =
                                                        hasItems
                                                          ? uniqueProducts.length
                                                          : Number(
                                                              po?.itemsCount,
                                                            ) || 0;
                                                      const firstProduct =
                                                        hasItems
                                                          ? uniqueProducts[0]
                                                          : String(
                                                              po?.firstProductName ||
                                                                "",
                                                            ).trim();
                                                      const productText: string =
                                                        productCount > 0
                                                          ? productCount > 1
                                                            ? `${firstProduct || "Item"} (+${productCount - 1} lainnya)`
                                                            : firstProduct ||
                                                              "Item"
                                                          : "-";
                                                      const isHit =
                                                        !!q &&
                                                        (poMatchesQ(po, q) ||
                                                          String(
                                                            po?.tujuanDetail ||
                                                              "",
                                                          )
                                                            .toLowerCase()
                                                            .includes(q) ||
                                                          String(productText)
                                                            .toLowerCase()
                                                            .includes(q));
                                                      return (
                                                        <tr
                                                          key={po.id}
                                                          className={`hover:bg-slate-50/70 cursor-pointer ${
                                                            isHit
                                                              ? "bg-amber-50/60"
                                                              : ""
                                                          }`}
                                                          title="Klik baris untuk lihat detail"
                                                          onClick={() =>
                                                            openModal(po)
                                                          }
                                                        >
                                                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                                                            <div className="max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide">
                                                              {getHighlightedText(
                                                                po.noPo,
                                                                highlightTerm,
                                                              )}
                                                            </div>
                                                            {String(
                                                              po?.noInvoice ||
                                                                "",
                                                            ).trim() && (
                                                              <div className="mt-1 text-[10px] font-semibold text-slate-500 max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide">
                                                                INV:{" "}
                                                                {getHighlightedText(
                                                                  String(
                                                                    po?.noInvoice ||
                                                                      "",
                                                                  ),
                                                                  highlightTerm,
                                                                )}
                                                              </div>
                                                            )}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                            {tglPoText}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                            {dueText}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700 font-semibold">
                                                            <div
                                                              className="max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                                              title={
                                                                hasItems
                                                                  ? uniqueProducts.join(
                                                                      ", ",
                                                                    )
                                                                  : productText
                                                              }
                                                            >
                                                              {getHighlightedText(
                                                                productText,
                                                                highlightTerm,
                                                              )}
                                                            </div>
                                                          </td>
                                                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                            {n(
                                                              Math.round(
                                                                pcsKirim,
                                                              ),
                                                            )}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700">
                                                            <div
                                                              className="max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                                              title={String(
                                                                po.tujuanDetail ||
                                                                  "-",
                                                              )}
                                                            >
                                                              {getHighlightedText(
                                                                po.tujuanDetail ||
                                                                  "-",
                                                                highlightTerm,
                                                              )}
                                                            </div>
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                            {(!po.regional || po.regional.toLowerCase() === 'unknown') ? "-" : po.regional}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                            {(!po?.UnitProduksi?.siteArea || po.UnitProduksi.siteArea.toLowerCase().includes('unit produksi') || po.UnitProduksi.siteArea.toLowerCase() === 'unknown') ? "-" : po.UnitProduksi.siteArea}
                                                          </td>
                                                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                            {n(
                                                              Math.round(
                                                                totalKg,
                                                              ),
                                                            )}
                                                          </td>
                                                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                            {n(rpDiscount || 0)}
                                                          </td>
                                                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                            {n(rpNominal || 0)}
                                                          </td>
                                                          <td className="px-4 py-3">
                                                            <div className="flex justify-end gap-1">
                                                              <button
                                                                title="Extend"
                                                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                                onClick={(
                                                                  e,
                                                                ) => {
                                                                  e.stopPropagation();
                                                                }}
                                                              >
                                                                <CalendarClock
                                                                  size={16}
                                                                />
                                                              </button>
                                                              <button
                                                                type="button"
                                                                title="Edit"
                                                                className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                                                onClick={(
                                                                  e,
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  setEditNoPo(
                                                                    po.noPo,
                                                                  );
                                                                  setEditOpen(
                                                                    true,
                                                                  );
                                                                }}
                                                              >
                                                                <Pencil
                                                                  size={16}
                                                                />
                                                              </button>
                                                              {role === "pusat" && (
                                                                <button
                                                                  title="Delete"
                                                                  className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                                                                  onMouseDown={(
                                                                    e,
                                                                  ) =>
                                                                    e.stopPropagation()
                                                                  }
                                                                  onClick={(
                                                                    e,
                                                                  ) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDelete(
                                                                      po.noPo,
                                                                    );
                                                                  }}
                                                                >
                                                                  <Trash2
                                                                    size={16}
                                                                  />
                                                                </button>
                                                              )}
                                                            </div>
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                            {sortedList.length > perPo ? (
                                              <div className="flex items-center justify-between mt-3">
                                                <p className="text-xs text-slate-500">
                                                  Showing {startPo + 1}-
                                                  {Math.min(
                                                    startPo + perPo,
                                                    sortedList.length,
                                                  )}{" "}
                                                  of {sortedList.length} PO
                                                </p>
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() =>
                                                      setPoPage((prev) => ({
                                                        ...prev,
                                                        [key]: Math.max(
                                                          pp - 1,
                                                          1,
                                                        ),
                                                      }))
                                                    }
                                                    disabled={pp === 1}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                                  >
                                                    Previous
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      setPoPage((prev) => ({
                                                        ...prev,
                                                        [key]: Math.min(
                                                          pp + 1,
                                                          totalPoPages,
                                                        ),
                                                      }))
                                                    }
                                                    disabled={
                                                      pp === totalPoPages
                                                    }
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                                  >
                                                    Next
                                                  </button>
                                                </div>
                                              </div>
                                            ) : null}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {filteredGroups.length > itemsPerPage ? (
              <div className="flex items-center justify-between px-2 py-4 mt-2">
                <p className="text-sm text-slate-500">
                  Showing {indexOfFirst + 1} -{" "}
                  {Math.min(indexOfLast, filteredGroups.length)} of{" "}
                  {filteredGroups.length} • Total PO: {totalUniquePo}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <PODetailModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={selectedPO}
      />
      <POEditModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditNoPo(null);
        }}
        noPo={editNoPo}
        returnMode="full"
        onSaved={(updated) => {
          const updatedNo = String(updated?.noPo || "").trim();
          const originalNo = String(updated?.__originalNoPo || "").trim();
          if (!updatedNo) return;
          const companyKey = String(updated?.RitelModern?.namaPt || "").trim();
          setGroups((prev) =>
            prev.map((g) => {
              if (!companyKey || g.company !== companyKey) return g;
              return {
                ...g,
                pos: (Array.isArray(g.pos) ? g.pos : []).map((p) =>
                  String(p?.noPo || "").trim() === updatedNo ||
                  (originalNo && String(p?.noPo || "").trim() === originalNo)
                    ? updated
                    : p,
                ),
              };
            }),
          );
          setSelectedPO((prev: any) =>
            prev &&
            (String(prev?.noPo || "").trim() === updatedNo ||
              (originalNo && String(prev?.noPo || "").trim() === originalNo))
              ? updated
              : prev,
          );
        }}
      />

      <BulkUploadModal
        open={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={handlePOCreated}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Hapus PO?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Anda yakin ingin menghapus PO <strong>{confirmDelete}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={deleting}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
