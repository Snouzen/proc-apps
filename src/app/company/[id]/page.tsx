"use client";

import {
  ArrowLeft,
  Download,
  Eye,
  Search,
  Trash2,
  X,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import * as XLSX from "xlsx";

type PurchaseRow = {
  id: string;
  noPo: string;
  tglPo: string | null;
  expiredTgl: string | null;
  linkPo: string | null;
  noInvoice: string | null;
  tujuanDetail: string | null;
  regional?: string | null;
  statusKirim?: boolean;
  statusSdif?: boolean;
  statusPo?: boolean;
  statusFp?: boolean;
  statusKwi?: boolean;
  statusInv?: boolean;
  statusTagih?: boolean;
  statusBayar?: boolean;
  Items: {
    pcs: number;
    pcsKirim: number;
    hargaKg?: number;
    hargaPcs: number;
    nominal: number;
    rpTagih: number;
    Product?: { name: string; satuanKg?: number };
  }[];
  UnitProduksi?: { siteArea: string };
  RitelModern?: { namaPt: string; inisial?: string | null };
};

export default function CompanyDetail() {
  const params = useParams<{ id: string }>();
  const company = useMemo(
    () => decodeURIComponent(params.id ?? ""),
    [params.id],
  );
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [productDetail, setProductDetail] = useState<{
    poNo: string;
    company: string;
    items: {
      pcs: number;
      hargaPcs: number;
      Product?: { name: string; satuanKg?: number };
    }[];
  } | null>(null);
  const closeDetail = () => setProductDetail(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [colFilters, setColFilters] = useState<{
    noPo: string[];
    tglPo: string[];
    expiredTgl: string[];
    area: string[];
    inisial: string[];
    tujuan: string[];
    kgMin?: number;
    kgMax?: number;
    tagihMin?: number;
    tagihMax?: number;
  }>({
    noPo: [],
    tglPo: [],
    expiredTgl: [],
    area: [],
    inisial: [],
    tujuan: [],
    kgMin: undefined,
    kgMax: undefined,
    tagihMin: undefined,
    tagihMax: undefined,
  });

  const filteredRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const base = rows.filter((r) => {
      const inHeader =
        r.noPo?.toLowerCase().includes(q) ||
        (r.tujuanDetail ?? "").toLowerCase().includes(q) ||
        (r.UnitProduksi?.siteArea ?? "").toLowerCase().includes(q) ||
        (r.RitelModern?.namaPt ?? "").toLowerCase().includes(q) ||
        (r.RitelModern?.inisial ?? "").toLowerCase().includes(q);
      if (inHeader) return true;
      const names = (r.Items || [])
        .map((i) => i.Product?.name ?? "")
        .join(" ")
        .toLowerCase();
      return names.includes(q);
    });
    return base.filter((r) => {
      const fNoPo = colFilters.noPo.length
        ? colFilters.noPo.includes(r.noPo)
        : true;
      const tglStr = r.tglPo
        ? new Date(r.tglPo).toLocaleDateString("id-ID")
        : "-";
      const fTglPo = colFilters.tglPo.length
        ? colFilters.tglPo.includes(tglStr)
        : true;
      const expStr = r.expiredTgl
        ? new Date(r.expiredTgl).toLocaleDateString("id-ID")
        : "-";
      const fExp = colFilters.expiredTgl.length
        ? colFilters.expiredTgl.includes(expStr)
        : true;
      const areaStr = r.UnitProduksi?.siteArea ?? "-";
      const fArea = colFilters.area.length
        ? colFilters.area.includes(areaStr)
        : true;
      const iniStr = r.RitelModern?.inisial ?? "-";
      const fIni = colFilters.inisial.length
        ? colFilters.inisial.includes(iniStr)
        : true;
      const tujuanStr = r.tujuanDetail ?? "-";
      const fTujuan = colFilters.tujuan.length
        ? colFilters.tujuan.includes(tujuanStr)
        : true;
      const totalKg = (r.Items || []).reduce((acc, i) => {
        const satuan = Number(i?.Product?.satuanKg || 0) || 0;
        const pcs = Number(i?.pcs || 0) || 0;
        return acc + (satuan > 0 ? pcs * satuan : 0);
      }, 0);
      const totalTagih = (r.Items || []).reduce((acc, i) => {
        const hargaPcs = Number(i?.hargaPcs || 0) || 0;
        const pcsKirim = Number(i?.pcsKirim || 0) || 0;
        const rt =
          typeof i?.rpTagih === "number" && isFinite(i.rpTagih)
            ? Number(i.rpTagih)
            : hargaPcs * pcsKirim;
        return acc + rt;
      }, 0);
      const fKgMin =
        typeof colFilters.kgMin === "number"
          ? totalKg >= (colFilters.kgMin as number)
          : true;
      const fKgMax =
        typeof colFilters.kgMax === "number"
          ? totalKg <= (colFilters.kgMax as number)
          : true;
      const fTagMin =
        typeof colFilters.tagihMin === "number"
          ? totalTagih >= (colFilters.tagihMin as number)
          : true;
      const fTagMax =
        typeof colFilters.tagihMax === "number"
          ? totalTagih <= (colFilters.tagihMax as number)
          : true;
      return (
        fNoPo &&
        fTglPo &&
        fExp &&
        fArea &&
        fIni &&
        fTujuan &&
        fKgMin &&
        fKgMax &&
        fTagMin &&
        fTagMax
      );
    });
  }, [rows, filterText, colFilters]);

  function fmtBool(v?: boolean) {
    return v ? "TRUE" : "FALSE";
  }
  function fmtDateStr(d?: string | null) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function toNumber(n: any) {
    const v = Number(n);
    return isFinite(v) ? v : 0;
  }
  const exportReport = () => {
    const data = (filterText ? filteredRows : rows).flatMap((r) => {
      const base = {
        "Nama Company": r.RitelModern?.namaPt ?? company,
        "Nomor PO": r.noPo,
        "Tanggal PO": fmtDateStr(r.tglPo),
        "Link PO": r.linkPo ?? "",
        "Tanggal Expired PO": fmtDateStr(r.expiredTgl),
        "Site Area": r.UnitProduksi?.siteArea ?? "",
        "Nomor Invoice": r.noInvoice ?? "",
        Tujuan: r.tujuanDetail ?? "",
        "SDI/F": fmtBool(r.statusSdif),
        PO: fmtBool(r.statusPo),
        FP: fmtBool(r.statusFp),
        KWI: fmtBool(r.statusKwi),
        Inv: fmtBool(r.statusInv),
        Tagih: fmtBool(r.statusTagih),
        Bayar: fmtBool(r.statusBayar),
      };
      if (!r.Items || r.Items.length === 0) {
        return [
          {
            ...base,
            "Nama Produk": "",
            kg: 0,
            pcs: 0,
            "harga per kg": 0,
            "harga per pcs": 0,
            nominal: 0,
            kirim: fmtBool(r.statusKirim),
            "pcs kirim": 0,
            "rp tagih": 0,
          },
        ];
      }
      return r.Items.map((it) => {
        const satuan = toNumber(it?.Product?.satuanKg ?? 0);
        const pcs = toNumber(it?.pcs ?? 0);
        const hargaPcs = toNumber(it?.hargaPcs ?? 0);
        const hargaKg =
          typeof it?.hargaKg === "number" && isFinite(it.hargaKg)
            ? it.hargaKg
            : satuan > 0
              ? hargaPcs / satuan
              : 0;
        const kg = satuan > 0 ? pcs * satuan : 0;
        const pcsKirim = toNumber(it?.pcsKirim ?? 0);
        const nominal =
          typeof it?.nominal === "number" && isFinite(it.nominal)
            ? it.nominal
            : hargaPcs * pcs;
        const rpTagih =
          typeof it?.rpTagih === "number" && isFinite(it.rpTagih)
            ? it.rpTagih
            : hargaPcs * pcsKirim;
        return {
          ...base,
          "Nama Produk": it?.Product?.name ?? "",
          kg,
          pcs,
          "harga per kg": hargaKg,
          "harga per pcs": hargaPcs,
          nominal,
          kirim: fmtBool(r.statusKirim),
          "pcs kirim": pcsKirim,
          "rp tagih": rpTagih,
        };
      });
    });
    const headers = [
      "Nama Company",
      "Nomor PO",
      "Tanggal PO",
      "Link PO",
      "Tanggal Expired PO",
      "Site Area",
      "Nama Produk",
      "Nomor Invoice",
      "Tujuan",
      "kg",
      "pcs",
      "harga per kg",
      "harga per pcs",
      "nominal",
      "kirim",
      "pcs kirim",
      "rp tagih",
      "SDI/F",
      "PO",
      "FP",
      "KWI",
      "Inv",
      "Tagih",
      "Bayar",
    ];
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const safeName = company.replace(/[\\/:*?"<>|]/g, "_");
    XLSX.writeFile(wb, `report-${safeName}.xlsx`);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/po?company=${encodeURIComponent(company)}&includeUnknown=true`,
        );
        const data = await res.json();
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : data?.data || []);
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (company) load();
    return () => {
      mounted = false;
    };
  }, [company]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/company"
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 ">{company}</h1>
          <p className="text-sm text-gray-500">
            Total {rows.length} PO Records
          </p>
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold text-slate-800">Purchase Order Details</h2>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Cari PO, tujuan, invoice, site area, produk..."
                className="bg-transparent outline-none text-sm text-black min-w-[260px]"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                aria-label="Search"
              />
            </div>
            <button
              onClick={exportReport}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all"
            >
              <Download size={16} /> Export Report
            </button>
          </div>
        </div>
        <div className="overflow-x-auto overflox-y-hidden max-h-[600px]">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-20 bg-gray-50">
              <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="px-4 py-4 font-bold sticky left-0 bg-gray-50 z-30">
                  No
                </th>
                <th className="px-4 py-4 font-bold sticky left-10 bg-gray-50 z-30">
                  <div className="relative inline-flex items-center gap-2">
                    <span>Nomor PO</span>
                    <button
                      onClick={() =>
                        setOpenFilter(openFilter === "noPo" ? null : "noPo")
                      }
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <Filter size={12} />
                    </button>
                    {openFilter === "noPo" && (
                      <div className="absolute top-6 left-0 z-40 bg-white border border-gray-200 rounded-xl shadow-xl w-56">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                            placeholder="Cari opsi..."
                          />
                        </div>
                        <div className="max-h-48 overflow-auto">
                          {Array.from(new Set(rows.map((r) => r.noPo)))
                            .sort((a, b) => a.localeCompare(b))
                            .filter((v) =>
                              v
                                .toLowerCase()
                                .includes(filterQuery.toLowerCase()),
                            )
                            .map((v) => (
                              <label
                                key={v}
                                className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={colFilters.noPo.includes(v)}
                                  onChange={() =>
                                    setColFilters({
                                      ...colFilters,
                                      noPo: colFilters.noPo.includes(v)
                                        ? colFilters.noPo.filter((x) => x !== v)
                                        : [...colFilters.noPo, v],
                                    })
                                  }
                                />
                                <span className="truncate">{v}</span>
                              </label>
                            ))}
                        </div>
                        <div className="flex items-center justify-between p-2 border-t border-gray-100">
                          <button
                            onClick={() =>
                              setColFilters({ ...colFilters, noPo: [] })
                            }
                            className="px-2 py-1 text-xs rounded bg-gray-100"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => setOpenFilter(null)}
                            className="px-2 py-1 text-xs rounded bg-slate-800 text-white"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
                <th className="px-4 py-4">Tgl Po</th>
                <th className="px-4 py-4 text-red-500">Tgl Expired</th>
                <th className="px-4 py-4">Area</th>
                <th className="px-4 py-4">Inisial</th>
                <th className="px-4 py-4">Tujuan</th>
                <th className="px-4 py-4 text-right">Kg</th>
                <th className="px-4 py-4 text-right">Rp Tagih</th>
                <th className="px-4 py-4 text-center">Produk</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[13px]">
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Belum ada PO untuk company ini.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const items = r.Items || [];
                  const totalKg = items.reduce((acc, i) => {
                    const satuan = Number(i?.Product?.satuanKg || 0) || 0;
                    const pcs = Number(i?.pcs || 0) || 0;
                    return acc + (satuan > 0 ? pcs * satuan : 0);
                  }, 0);
                  const totalTagih = items.reduce((acc, i) => {
                    const hargaPcs = Number(i?.hargaPcs || 0) || 0;
                    const pcsKirim = Number(i?.pcsKirim || 0) || 0;
                    const rt =
                      typeof i?.rpTagih === "number" && isFinite(i.rpTagih)
                        ? Number(i.rpTagih)
                        : hargaPcs * pcsKirim;
                    return acc + rt;
                  }, 0);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-4 sticky left-0 bg-white">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-800 sticky left-10 bg-white">
                        {r.noPo}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {r.tglPo
                          ? new Date(r.tglPo).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                      <td className="px-4 py-4 text-red-500 font-medium">
                        {r.expiredTgl
                          ? new Date(r.expiredTgl).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                      <td className="px-4 py-4">
                        {r.UnitProduksi?.siteArea ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        {r.RitelModern?.inisial ?? "-"}
                      </td>
                      <td className="px-4 py-4">{r.tujuanDetail ?? "-"}</td>
                      <td className="px-4 py-4 text-right">
                        {totalKg ? totalKg.toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {totalTagih ? totalTagih.toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-slate-600">
                          {items.length} Produk
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setProductDetail({ poNo: r.noPo, company, items })
                            }
                            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                            title="Detail Produk"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(r.noPo)}
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                            title="Hapus PO"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !deleting && setConfirmDelete(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-rose-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Hapus PO {confirmDelete}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus PO dan seluruh itemnya.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!confirmDelete) return;
                  setDeleting(true);
                  try {
                    const res = await fetch("/api/po", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ noPo: confirmDelete }),
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      alert(j?.error || "Gagal menghapus PO");
                    } else {
                      setRows((prev) =>
                        prev.filter((x) => x.noPo !== confirmDelete),
                      );
                    }
                  } catch {
                    alert("Gagal menghapus PO");
                  } finally {
                    setDeleting(false);
                    setConfirmDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Product Detail Modal */}
      {productDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeDetail}
          />
          <div className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  Produk untuk {productDetail.poNo}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Company: {productDetail.company}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-auto max-h-[70vh]">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">Nama Produk</th>
                    <th className="px-3 py-2 text-right">Kg</th>
                    <th className="px-3 py-2 text-right">Pcs</th>
                    <th className="px-3 py-2 text-right">Harga/Kg</th>
                    <th className="px-3 py-2 text-right">Harga/Pcs</th>
                    <th className="px-3 py-2 text-right">Nominal</th>
                    <th className="px-3 py-2 text-right">Pcs Kirim</th>
                    <th className="px-3 py-2 text-right">Rp Tagih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[13px]">
                  {productDetail.items.map((it: any, i: number) => {
                    const name = it?.Product?.name || "-";
                    const satuanKg = Number(it?.Product?.satuanKg || 0) || 0;
                    const pcs = Number(it?.pcs || 0);
                    const kg = pcs * satuanKg;
                    const hargaPcs = Number(it?.hargaPcs || 0);
                    const hargaKg =
                      typeof it?.hargaKg === "number" && isFinite(it.hargaKg)
                        ? it.hargaKg
                        : satuanKg > 0
                          ? hargaPcs / satuanKg
                          : 0;
                    const nominal =
                      typeof it?.nominal === "number" && isFinite(it.nominal)
                        ? it.nominal
                        : hargaPcs * pcs;
                    const pcsKirim = Number(it?.pcsKirim || 0);
                    const rpTagih =
                      typeof it?.rpTagih === "number" && isFinite(it.rpTagih)
                        ? it.rpTagih
                        : hargaPcs * pcsKirim;
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 font-bold text-slate-800">
                          {name}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {kg ? kg.toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {pcs ? pcs.toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {hargaKg ? hargaKg.toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {hargaPcs ? hargaPcs.toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {nominal ? nominal.toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {pcsKirim ? pcsKirim.toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {rpTagih ? rpTagih.toLocaleString("id-ID") : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
