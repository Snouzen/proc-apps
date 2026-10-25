"use client";

// XLSX lazy-loaded on export (~200KB saved from initial bundle)
const getXLSX = () => import("xlsx");
import { Download, Pencil, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PODetailModal from "@/components/po-detail-modal";
import POEditModal from "@/components/po-edit-modal";
import { LoaderThree } from "@/components/ui/loader";
import { useAutoRefreshTick } from "@/components/auto-refresh";
import { PoDateBadge } from "@/components/PoDateBadge";

function mapPoToRows(poData: any[]) {
  const out: any[] = [];
  for (const po of poData) {
    const items = Array.isArray(po?.Items) ? po.Items : [];
    const base = {
      po,
      noPo: po?.noPo || "-",
      tglPo: po?.tglPo,
      expiredTgl: po?.expiredTgl,
      company: po?.RitelModern?.namaPt || "-",
      inisial: po?.RitelModern?.inisial || "-",
      regional: po?.regional || po?.UnitProduksi?.namaRegional || "-",
      siteArea:
        po?.UnitProduksi?.siteArea && po.UnitProduksi.siteArea !== "UNKNOWN"
          ? po.UnitProduksi.siteArea
          : "-",
      tujuan: po?.tujuanDetail || "-",
      noInvoice: po?.noInvoice || "",
    };
    if (items.length === 0) {
      const itemsCount = Number(po?.itemsCount) || 0;
      const firstProduct = String(po?.firstProductName || "").trim();
      const productDisplay =
        itemsCount > 0
          ? itemsCount > 1
            ? `${firstProduct || "Item"} (+${itemsCount - 1} lainnya)`
            : firstProduct || "Item"
          : "-";
      out.push({
        ...base,
        key: `${po?.id || po?.noPo || "po"}-empty`,
        product: productDisplay,
        pcs: Number(po?.pcsTotal) || 0,
        pcsKirim: Number(po?.pcsKirimTotal) || 0,
        hargaPcs: 0,
        discount: Number(po?.totalDiscount) || 0,
        nominal: Number(po?.totalNominal) || 0,
        rpTagih: Number(po?.totalTagihan) || 0,
      });
    } else {
      items.forEach((it: any, idx: number) => {
        const pcs = Number(it?.pcs) || 0;
        const pcsKirim = Number(it?.pcsKirim) || 0;
        const hargaPcs = Number(it?.hargaPcs) || 0;
        const discount = Number(it?.discount) || 0;
        const nominalFromDb = Number(it?.nominal);
        const rpTagihFromDb = Number(it?.rpTagih);
        const nominal = Number.isFinite(nominalFromDb)
          ? nominalFromDb
          : Math.max(0, hargaPcs * pcs - discount) || 0;
        const rpTagih = Number.isFinite(rpTagihFromDb)
          ? rpTagihFromDb
          : Math.max(0, hargaPcs * pcsKirim - discount) || 0;
        out.push({
          ...base,
          key: `${po?.id || po?.noPo || "po"}-${it?.id || idx}`,
          product: it?.Product?.name || it?.namaProduk || "-",
          pcs,
          pcsKirim,
          hargaPcs,
          discount,
          nominal,
          rpTagih,
        });
      });
    }
  }
  return out;
}

export default function PurchaseOrderDetail() {
  const params = useParams<{ id: string }>();
  const company = decodeURIComponent(params.id);
  const [loading, setLoading] = useState(true);
  const [poData, setPoData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editNoPo, setEditNoPo] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const formatDate = (d: any) => {
    const dt = toDate(d);
    if (!dt) return "-";
    return dt.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const norm = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  // Server-side Fetch with Search and Pagination
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("summary", "true");
        params.set("includeUnknown", "true");
        params.set("company", company);
        if (search.trim()) params.set("q", search.trim());
        params.set("limit", String(itemsPerPage));
        params.set("offset", String((page - 1) * itemsPerPage));

        const res = await fetch(`/api/po?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!mounted) return;
        if (!res.ok || !data) {
          const msg =
            (data as any)?.error || res.statusText || "Gagal mengambil data PO";
          throw new Error(msg);
        }
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : [];
        const total =
          typeof (data as any)?.total === "number"
            ? (data as any).total
            : list.length;
        setPoData(list);
        setTotalCount(total);
        setLoadError(null);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Gagal mengambil data PO";
        if (msg.toLowerCase().includes("unauthorized")) {
          setLoadError(null);
        } else {
          setLoadError(msg);
        }
        setPoData([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [company, search, page, itemsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [search, itemsPerPage]);

  const rows = useMemo(() => mapPoToRows(poData), [poData]);
  const pageRows = rows;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const start = (page - 1) * itemsPerPage;

  const onExport = async () => {
    setIsExporting(true);
    try {
      const allList: any[] = [];
      let offset = 0;
      const batchSize = 2000;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams();
        params.set("summary", "true");
        params.set("includeUnknown", "true");
        params.set("company", company);
        if (search.trim()) params.set("q", search.trim());
        params.set("limit", String(batchSize));
        params.set("offset", String(offset));

        const res = await fetch(`/api/po?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Gagal mengambil data untuk export (HTTP ${res.status}). Proses dibatalkan.`);
        }
        const data = await res.json();
        const pageItems = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : [];
        allList.push(...pageItems);

        const total = typeof data?.total === "number" ? data.total : undefined;
        if (pageItems.length < batchSize || (total !== undefined && allList.length >= total)) {
          hasMore = false;
        } else {
          offset += pageItems.length;
        }
      }

      if (allList.length === 0) {
        alert("Tidak ada data untuk diekspor");
        return;
      }

      const exportRows = mapPoToRows(allList);
      const exportData = exportRows.map((r) => ({
        "No PO": r.noPo,
        Company: r.company,
        Inisial: r.inisial,
        "Tgl PO": formatDate(r.tglPo),
        "Expired PO": formatDate(r.expiredTgl),
        Regional: r.regional,
        "Site Area": r.siteArea,
        Tujuan: r.tujuan,
        Produk: r.product,
        "PCS PO": r.pcs,
        "PCS Kirim": r.pcsKirim,
        "Harga/PCS": r.hargaPcs,
        Discount: r.discount,
        Nominal: r.nominal,
        "No Invoice": r.noInvoice || "",
      }));
      const XLSX = await getXLSX();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PO");
      const dateStamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `PO-${company}-${dateStamp}.xlsx`);
    } catch (e: any) {
      console.error("Export error:", e);
      alert(e?.message || "Gagal melakukan export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const openModal = async (po: any) => {
    const nopo = String(po?.noPo || "").trim();
    let fullPo: any = po;
    if (nopo) {
      try {
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        params.set("noPo", nopo);
        params.set("includeItems", "true");
        params.set("limit", "1");
        params.set("offset", "0");
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
    setSelectedPO({
      id: fullPo?.id || "",
      noPo: fullPo?.noPo || "-",
      company: fullPo?.RitelModern?.namaPt || "Unknown",
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
    setOpenDetail(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{company}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Daftar Purchase Order lengkap per company
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search No PO / Tujuan / Produk / Site Area / Invoice..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
            />
          </div>
          <button
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shrink-0"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 sm:px-0 pb-3">
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Total:{" "}
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {totalCount}
            </span>{" "}
            rows
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">data</span>
          </div>
        </div>
        {loadError && !loadError.toLowerCase().includes("unauthorized") && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Gagal load data: {loadError}
          </div>
        )}

        {loading ? (
          <div className="py-16">
            <LoaderThree label="Loading PO" />
          </div>
        ) : pageRows.length === 0 ? (
          <div className="text-sm text-slate-500 px-2 py-6">Tidak ada data</div>
        ) : (
          <>
            {/* Mobile Card List View */}
            <div className="md:hidden space-y-3">
              {pageRows.map((r, idx) => {
                const n = (v: number) => v.toLocaleString("id-ID");
                return (
                  <div
                    key={`card-${r.key || r.noPo}-${idx}`}
                    onClick={() => openModal(r.po)}
                    className="p-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100 truncate block">
                          {r.noPo}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {r.inisial} • {r.siteArea}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditNoPo(r.noPo);
                            setEditOpen(true);
                          }}
                          className="p-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <PoDateBadge 
                        dateNode={formatDate(r.tglPo)}
                        type="TAGIH"
                        buktiData={r.po?.buktiTagih}
                      />
                      <PoDateBadge 
                        dateNode={formatDate(r.expiredTgl)}
                        type="PAID"
                        buktiData={r.po?.buktiBayar}
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {r.product}
                      </p>
                      {r.tujuan && r.tujuan !== "-" && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          Tujuan: {r.tujuan}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 rounded-xl text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">PCS Kirim / PO</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 break-words [overflow-wrap:anywhere]">
                          {n(r.pcsKirim)} / {n(r.pcs)}
                        </span>
                      </div>
                      <div className="text-left sm:text-right min-w-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] text-indigo-500 uppercase font-bold block">Rp Tagih</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 break-words [overflow-wrap:anywhere] text-sm sm:text-xs">
                          Rp {n(r.rpTagih)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[1400px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    <tr>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        No PO
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        Tgl PO
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        Expired
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        Inisial
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        Regional
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        Site Area
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        Tujuan
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50">
                        Produk
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                        PCS PO
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                        PCS Kirim
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                        Harga/PCS
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                        Discount
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                        Nominal (PO)
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right text-indigo-600">
                        RpTagih (Invoice)
                      </th>
                      <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.map((r, idx) => {
                      const n = (v: number) => v.toLocaleString("id-ID");
                      return (
                        <tr
                          key={r.key || `${r.noPo}-${idx}`}
                          className="hover:bg-slate-50/70 cursor-pointer"
                          title="Klik baris untuk lihat detail"
                          onClick={() => openModal(r.po)}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {r.noPo}
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            <PoDateBadge 
                              dateNode={formatDate(r.tglPo)}
                              type="TAGIH"
                              buktiData={r.po?.buktiTagih}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            <PoDateBadge 
                              dateNode={formatDate(r.expiredTgl)}
                              type="PAID"
                              buktiData={r.po?.buktiBayar}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                            {r.inisial}
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {r.regional}
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {r.siteArea}
                          </td>
                          <td
                            className="px-4 py-3 text-slate-700 max-w-[260px] truncate"
                            title={r.tujuan}
                          >
                            {r.tujuan}
                          </td>
                          <td
                            className="px-4 py-3 text-slate-700 font-semibold max-w-[360px] truncate"
                            title={r.product}
                          >
                            {r.product}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                            {n(r.pcs)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                            {n(r.pcsKirim)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                            {n(r.hargaPcs)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                            {n(r.discount || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                            {n(r.nominal)}
                          </td>
                          <td className="px-4 py-3 text-right text-indigo-700 font-bold">
                            {n(r.rpTagih)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditNoPo(r.noPo);
                                  setEditOpen(true);
                                }}
                                className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                                title="Edit"
                              >
                                <Pencil size={16} />
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

            {totalCount > itemsPerPage && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 sm:px-2 py-4 mt-2">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Showing {start + 1} -{" "}
                  {Math.min(start + itemsPerPage, totalCount)} of{" "}
                  {totalCount}
                </p>
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-center"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-center"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PODetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={selectedPO}
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
            prev.map((x) =>
              String(x?.noPo || "").trim() === updatedNo ||
              (originalNo && String(x?.noPo || "").trim() === originalNo)
                ? updated
                : x,
            ),
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
    </div>
  );
}
