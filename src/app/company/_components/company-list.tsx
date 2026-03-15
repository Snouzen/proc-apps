"use client";

import { useEffect, useMemo, useState } from "react";
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
import { LoaderThree } from "@/components/ui/loader";
import { getMe } from "@/lib/me";
import BulkUploadModal from "@/components/bulk-upload-modal";
import { useAutoRefreshTick } from "@/components/auto-refresh";

type GroupedPO = {
  company: string;
  pos: any[];
};

export default function CompanyList({
  focusCompany,
}: { focusCompany?: string } = {}) {
  const refreshTick = useAutoRefreshTick();
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
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const fetchData = async () => {
    setLoading((v) => v || groups.length === 0);
    try {
      const me = await getMe();
      let url = "/api/po";
      if (me?.role === "rm" && me?.regional) {
        url += `?regional=${encodeURIComponent(me.regional)}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const byCompany: Record<string, any[]> = {};
      for (const po of json) {
        const company = po?.RitelModern?.namaPt || "Unknown";
        if (!byCompany[company]) byCompany[company] = [];
        byCompany[company].push(po);
      }
      const g: GroupedPO[] = Object.entries(byCompany)
        .map(([k, v]) => ({ company: k, pos: v }))
        .sort((a, b) => a.company.localeCompare(b.company));
      setGroups(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTick]);

  const handlePOCreated = () => {
    fetchData();
  };

  const handleDelete = async (noPo: string) => {
    setDeleting(true);
    try {
      await fetch("/api/po", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPo }),
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
    return list.filter((po) => isInProgress(po));
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const companyName = String(g.company || "").toLowerCase();
      if (companyName.includes(q)) return true;
      const list = Array.isArray(g.pos) ? g.pos : [];
      return list.some((po: any) => {
        const noPo = String(po?.noPo || "").toLowerCase();
        if (noPo.includes(q)) return true;
        const inisial = String(po?.RitelModern?.inisial || "").toLowerCase();
        return inisial.includes(q);
      });
    });
  }, [groups, searchQuery]);

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
  }, [searchQuery, itemsPerPage]);

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

  const openModal = (po: any) => {
    const productNames = po.Items?.map((i: any) => i.Product?.name) || [];
    const productDisplay =
      productNames.length > 0
        ? productNames.length > 1
          ? `${productNames[0]} (+${productNames.length - 1} lainnya)`
          : productNames[0]
        : "-";
    const totalTagih =
      po.Items?.reduce(
        (acc: number, curr: any) => acc + (curr?.rpTagih || 0),
        0,
      ) || 0;
    setSelectedPO({
      ...po,
      company: po?.RitelModern?.namaPt || "Unknown",
      createdAt: po?.createdAt || null,
      updatedAt: po?.updatedAt || null,
      productName: productDisplay,
      regional: po?.regional || po?.UnitProduksi?.namaRegional || null,
      siteArea:
        po?.UnitProduksi?.siteArea && po.UnitProduksi.siteArea !== "UNKNOWN"
          ? po.UnitProduksi.siteArea
          : "-",
      Items: po?.Items || [],
      rpTagih: totalTagih,
      status: {
        kirim: !!po.statusKirim,
        sdif: !!po.statusSdif,
        po: !!po.statusPo,
        fp: !!po.statusFp,
        kwi: !!po.statusKwi,
        inv: !!po.statusInv,
        tagih: !!po.statusTagih,
        bayar: !!po.statusBayar,
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
          <div className="relative w-full sm:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nama company / No PO / inisial..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
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
                        {g.company}
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
                                  <div className="max-h-[360px] overflow-auto">
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
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                            Kg
                                          </th>
                                          <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                            Rp Tagih
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
                                          const rpTagih = sum(items, (it) =>
                                            Number(it?.rpTagih),
                                          );
                                          const rpNominal = sum(items, (it) =>
                                            Number(it?.nominal),
                                          );
                                          const totalRpTagih =
                                            rpTagih || rpNominal || 0;
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
                                              <td className="px-4 py-3 font-mono font-bold text-slate-800">
                                                {po.noPo}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                {tglPoText}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                {dueText}
                                              </td>
                                              <td
                                                className="px-4 py-3 text-slate-700 font-semibold max-w-[360px] truncate"
                                                title={uniqueProducts.join(
                                                  ", ",
                                                )}
                                              >
                                                {productText}
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                {n(Math.round(pcsKirim))}
                                              </td>
                                              <td className="px-4 py-3 text-slate-700">
                                                {po.tujuanDetail || "-"}
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                {n(Math.round(totalKg))}
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                {n(totalRpTagih)}
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
                                                  <Link
                                                    href={`/po?noPo=${encodeURIComponent(po.noPo)}&company=${encodeURIComponent(po?.RitelModern?.namaPt || "")}`}
                                                    title="Edit"
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                    className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                                                  >
                                                    <Pencil size={16} />
                                                  </Link>
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
                                          {alias}
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
                                        const q = String(
                                          inisialPoSearch[key] || "",
                                        )
                                          .trim()
                                          .toLowerCase();
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
                                                : "";
                                              return (
                                                noPo ||
                                                tujuan ||
                                                (products &&
                                                  products.includes(q))
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
                                                {selectedAlias}
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
                                                <input
                                                  type="date"
                                                  value={
                                                    inisialPoDateFrom[key] || ""
                                                  }
                                                  onChange={(e) => {
                                                    setInisialPoDateFrom(
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
                                                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                                                  title="Filter dari Tgl PO"
                                                />
                                                <input
                                                  type="date"
                                                  value={
                                                    inisialPoDateTo[key] || ""
                                                  }
                                                  onChange={(e) => {
                                                    setInisialPoDateTo(
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
                                                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                                                  title="Filter sampai Tgl PO"
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
                                              <div className="max-h-[360px] overflow-auto">
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
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                                        Kg
                                                      </th>
                                                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                                        Rp Tagih
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
                                                      const kgKirim = sum(
                                                        items,
                                                        (it) =>
                                                          Number(it?.pcsKirim) *
                                                          (Number(
                                                            it?.Product
                                                              ?.satuanKg,
                                                          ) || 1),
                                                      );
                                                      const kgPesan = sum(
                                                        items,
                                                        (it) =>
                                                          Number(it?.pcs) *
                                                          (Number(
                                                            it?.Product
                                                              ?.satuanKg,
                                                          ) || 1),
                                                      );
                                                      const totalKg =
                                                        kgKirim || kgPesan || 0;
                                                      const rpTagih = sum(
                                                        items,
                                                        (it) =>
                                                          Number(it?.rpTagih),
                                                      );
                                                      const rpNominal = sum(
                                                        items,
                                                        (it) =>
                                                          Number(it?.nominal),
                                                      );
                                                      const totalRpTagih =
                                                        rpTagih ||
                                                        rpNominal ||
                                                        0;
                                                      const n = (v: number) =>
                                                        v.toLocaleString(
                                                          "id-ID",
                                                        );
                                                      const pcsKirim = sum(
                                                        items,
                                                        (it) =>
                                                          Number(it?.pcsKirim),
                                                      );
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
                                                      const productText: string =
                                                        uniqueProducts.length >
                                                        0
                                                          ? uniqueProducts.length >
                                                            1
                                                            ? `${uniqueProducts[0]} (+${uniqueProducts.length - 1} lainnya)`
                                                            : uniqueProducts[0]
                                                          : "-";
                                                      return (
                                                        <tr
                                                          key={po.id}
                                                          className="hover:bg-slate-50/70 cursor-pointer"
                                                          title="Klik baris untuk lihat detail"
                                                          onClick={() =>
                                                            openModal(po)
                                                          }
                                                        >
                                                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                                                            {po.noPo}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                            {tglPoText}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                                            {dueText}
                                                          </td>
                                                          <td
                                                            className="px-4 py-3 text-slate-700 font-semibold max-w-[360px] truncate"
                                                            title={uniqueProducts.join(
                                                              ", ",
                                                            )}
                                                          >
                                                            {productText}
                                                          </td>
                                                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                            {n(
                                                              Math.round(
                                                                pcsKirim,
                                                              ),
                                                            )}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-700">
                                                            {po.tujuanDetail ||
                                                              "-"}
                                                          </td>
                                                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                            {n(
                                                              Math.round(
                                                                totalKg,
                                                              ),
                                                            )}
                                                          </td>
                                                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                                            {n(totalRpTagih)}
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
                                                              <Link
                                                                href={`/po?noPo=${encodeURIComponent(po.noPo)}&company=${encodeURIComponent(po?.RitelModern?.namaPt || "")}`}
                                                                title="Edit"
                                                                className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                                                onClick={(e) =>
                                                                  e.stopPropagation()
                                                                }
                                                              >
                                                                <Pencil
                                                                  size={16}
                                                                />
                                                              </Link>
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
