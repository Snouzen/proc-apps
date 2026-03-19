"use client";

import * as XLSX from "xlsx";
import { Download, Filter, RefreshCw, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { upperClean } from "@/lib/text";

type Row = {
  id: string;
  noPo: string;
  company: string;
  inisial: string;
  tujuan: string;
  tglPo: string;
  expiredTgl: string;
  siteArea: string;
  regional: string;
  noInvoice: string;
  linkPo: string;
  productList: string[];
  products: string;
  totalNominal: number;
  totalTagihan: number;
  statusKirim: boolean;
  statusSdif: boolean;
  statusPo: boolean;
  statusFp: boolean;
  statusKwi: boolean;
  statusInv: boolean;
  statusTagih: boolean;
  statusBayar: boolean;
  updatedAt: string;
  createdAt: string;
  submitDate: string;
};

type Column = {
  id: keyof Row;
  label: string;
  kind: "text" | "number" | "date" | "bool";
  defaultVisible: boolean;
  value: (r: Row) => unknown;
};

const toDate = (d: any) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const toYMD = (d: any) => {
  const dt = toDate(d);
  if (!dt) return "";
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const day = `${dt.getDate()}`.padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
};

const formatDateId = (d: any) => {
  const dt = toDate(d);
  if (!dt) return "-";
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export default function ReportPage() {
  const [raw, setRaw] = useState<any[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showColumns, setShowColumns] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [submitFrom, setSubmitFrom] = useState("");
  const [submitTo, setSubmitTo] = useState("");

  const columns: Column[] = useMemo(
    () => [
      {
        id: "noPo",
        label: "No PO",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.noPo,
      },
      {
        id: "company",
        label: "Company",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.company,
      },
      {
        id: "inisial",
        label: "Inisial",
        kind: "text",
        defaultVisible: false,
        value: (r) => r.inisial,
      },
      {
        id: "tujuan",
        label: "Tujuan",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.tujuan,
      },
      {
        id: "tglPo",
        label: "Tgl PO",
        kind: "date",
        defaultVisible: true,
        value: (r) => r.tglPo,
      },
      {
        id: "expiredTgl",
        label: "Expired",
        kind: "date",
        defaultVisible: true,
        value: (r) => r.expiredTgl,
      },
      {
        id: "siteArea",
        label: "Site Area",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.siteArea,
      },
      {
        id: "regional",
        label: "Regional",
        kind: "text",
        defaultVisible: false,
        value: (r) => r.regional,
      },
      {
        id: "noInvoice",
        label: "No Invoice",
        kind: "text",
        defaultVisible: false,
        value: (r) => r.noInvoice,
      },
      {
        id: "linkPo",
        label: "Link PO",
        kind: "text",
        defaultVisible: false,
        value: (r) => r.linkPo,
      },
      {
        id: "products",
        label: "Nama Produk",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.products,
      },
      {
        id: "totalNominal",
        label: "Total Nominal",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.totalNominal,
      },
      {
        id: "totalTagihan",
        label: "Total Tagihan",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.totalTagihan,
      },
      {
        id: "statusKirim",
        label: "Kirim",
        kind: "bool",
        defaultVisible: false,
        value: (r) => r.statusKirim,
      },
      {
        id: "statusPo",
        label: "PO",
        kind: "bool",
        defaultVisible: false,
        value: (r) => r.statusPo,
      },
      {
        id: "statusInv",
        label: "Inv",
        kind: "bool",
        defaultVisible: false,
        value: (r) => r.statusInv,
      },
      {
        id: "statusBayar",
        label: "Bayar",
        kind: "bool",
        defaultVisible: false,
        value: (r) => r.statusBayar,
      },
      {
        id: "updatedAt",
        label: "Updated",
        kind: "date",
        defaultVisible: false,
        value: (r) => r.updatedAt,
      },
      {
        id: "createdAt",
        label: "Created",
        kind: "date",
        defaultVisible: false,
        value: (r) => r.createdAt,
      },
      {
        id: "submitDate",
        label: "Submit Date",
        kind: "date",
        defaultVisible: true,
        value: (r) => r.submitDate,
      },
    ],
    [],
  );

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setVisibleCols((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      columns.forEach((c) => {
        next[String(c.id)] = c.defaultVisible;
      });
      return next;
    });
  }, [columns]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("includeUnknown", "true");
      params.set("includeItems", "true");
      params.set("limit", String(rowsPerPage));
      params.set("offset", String(Math.max(0, (page - 1) * rowsPerPage)));
      if (query.trim()) params.set("q", query.trim());
      if (tglFrom) params.set("tglFrom", tglFrom);
      if (tglTo) params.set("tglTo", tglTo);
      if (submitFrom) params.set("submitFrom", submitFrom);
      if (submitTo) params.set("submitTo", submitTo);
      params.set("sort", "createdAt_desc");

      const res = await fetch(`/api/po?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      const total = Number(data?.total) || 0;
      setRaw(list);
      setServerTotal(total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal load data";
      setError(msg);
      setRaw([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, rowsPerPage, query, tglFrom, tglTo, submitFrom, submitTo]);

  const rows: Row[] = useMemo(() => {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((po: any) => {
      const items = Array.isArray(po?.Items) ? po.Items : [];
      const productList = items
        .map((it: any) => upperClean(it?.Product?.name || ""))
        .filter((s: string) => s.trim().length > 0);
      const totalTagihan =
        Number(po?.totalTagihan) ||
        items.reduce(
          (acc: number, it: any) => acc + (Number(it?.rpTagih) || 0),
          0,
        );
      const totalNominal =
        Number(po?.totalNominal) ||
        items.reduce(
          (acc: number, it: any) => acc + (Number(it?.nominal) || 0),
          0,
        );
      return {
        id: String(po?.id || po?.noPo || crypto.randomUUID()),
        noPo: upperClean(po?.noPo || "-"),
        company: upperClean(po?.RitelModern?.namaPt || po?.company || "-"),
        inisial: upperClean(po?.RitelModern?.inisial || po?.inisial || ""),
        tujuan: upperClean(po?.tujuanDetail || po?.tujuan || ""),
        tglPo: toYMD(po?.tglPo || null),
        expiredTgl: toYMD(po?.expiredTgl || null),
        siteArea: upperClean(
          po?.UnitProduksi?.siteArea && po.UnitProduksi.siteArea !== "UNKNOWN"
            ? po.UnitProduksi.siteArea
            : "",
        ),
        regional: upperClean(
          po?.regional || po?.UnitProduksi?.namaRegional || "",
        ),
        noInvoice: upperClean(po?.noInvoice || ""),
        linkPo: String(po?.linkPo || ""),
        productList,
        products: productList.join(", "),
        totalNominal,
        totalTagihan,
        statusKirim: !!po?.statusKirim,
        statusSdif: !!po?.statusSdif,
        statusPo: !!po?.statusPo,
        statusFp: !!po?.statusFp,
        statusKwi: !!po?.statusKwi,
        statusInv: !!po?.statusInv,
        statusTagih: !!po?.statusTagih,
        statusBayar: !!po?.statusBayar,
        updatedAt: toYMD(po?.updatedAt || null),
        createdAt: toYMD(po?.createdAt || null),
        submitDate: toYMD(po?.createdAt || po?.updatedAt || po?.tglPo || null),
      };
    });
  }, [raw]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleCols[String(c.id)]),
    [columns, visibleCols],
  );

  const filteredRows = useMemo(() => {
    const q = norm(query);
    const from = tglFrom ? new Date(tglFrom) : null;
    const to = tglTo ? new Date(tglTo) : null;
    const inRange = (d: string) => {
      const dt = d ? new Date(d) : null;
      if (!dt || isNaN(dt.getTime())) return false;
      if (from && dt < from) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (dt > end) return false;
      }
      return true;
    };

    const activeFilters = Object.entries(colFilters).filter(
      ([, v]) => String(v || "").trim() !== "",
    );

    const applyColFilters = (r: Row) => {
      if (submitFrom || submitTo) {
        const d = r.submitDate ? new Date(r.submitDate) : null;
        if (!d || isNaN(d.getTime())) return false;
        if (submitFrom) {
          const sf = new Date(submitFrom);
          if (d < sf) return false;
        }
        if (submitTo) {
          const st = new Date(submitTo);
          st.setHours(23, 59, 59, 999);
          if (d > st) return false;
        }
      }
      if (activeFilters.length === 0) return true;
      for (const [key, val] of activeFilters) {
        if (key === "submitDate") continue;
        const col = columns.find((c) => String(c.id) === key);
        if (!col) continue;
        const rawVal = col.value(r);
        const needle = norm(val);
        if (!needle) continue;
        if (col.kind === "number") {
          const n = Number(rawVal) || 0;
          const s = String(val).trim();
          const mRange = s.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
          if (mRange) {
            const a = Number(mRange[1]);
            const b = Number(mRange[2]);
            const lo = Math.min(a, b);
            const hi = Math.max(a, b);
            if (!(n >= lo && n <= hi)) return false;
            continue;
          }
          const mOp = s.match(/^(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/);
          if (mOp) {
            const op = mOp[1];
            const x = Number(mOp[2]);
            if (op === ">=" && !(n >= x)) return false;
            if (op === "<=" && !(n <= x)) return false;
            if (op === ">" && !(n > x)) return false;
            if (op === "<" && !(n < x)) return false;
            if (op === "=" && !(n === x)) return false;
            continue;
          }
          if (!norm(String(n)).includes(needle)) return false;
          continue;
        }
        if (col.kind === "bool") {
          const b = !!rawVal;
          const s = needle;
          const want =
            s === "1" || s === "true" || s === "ya" || s === "yes" || s === "y";
          const wantFalse =
            s === "0" ||
            s === "false" ||
            s === "tidak" ||
            s === "no" ||
            s === "n";
          if (want && !b) return false;
          if (wantFalse && b) return false;
          if (!want && !wantFalse) {
            if (!norm(String(b)).includes(s)) return false;
          }
          continue;
        }
        if (!norm(String(rawVal ?? "")).includes(needle)) return false;
      }
      return true;
    };

    const applyQuery = (r: Row) => {
      if (!q) return true;
      const fields = [
        r.noPo,
        r.company,
        r.inisial,
        r.tujuan,
        r.products,
        r.siteArea,
        r.regional,
        r.noInvoice,
        r.linkPo,
      ];
      return fields.some((f) => norm(f).includes(q));
    };

    return rows
      .filter((r) => {
        if (tglFrom || tglTo) {
          if (!inRange(r.tglPo)) return false;
        }
        return applyQuery(r) && applyColFilters(r);
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        if (da !== db) return db - da;
        return norm(b.noPo).localeCompare(norm(a.noPo));
      });
  }, [rows, query, tglFrom, tglTo, colFilters, columns, submitFrom, submitTo]);

  useEffect(() => {
    setPage(1);
  }, [query, tglFrom, tglTo, rowsPerPage, colFilters, visibleCols]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / rowsPerPage));
  const pageRows = filteredRows;

  const exportExcel = () => {
    const productCol = columns.find((c) => String(c.id) === "products");
    const cols =
      visibleColumns.some((c) => String(c.id) === "products") || !productCol
        ? visibleColumns
        : [...visibleColumns, productCol];
    const data = filteredRows.flatMap((r) => {
      const products =
        Array.isArray(r.productList) && r.productList.length > 0
          ? r.productList
          : [""];
      return products.map((p) => {
        const row: Record<string, any> = {};
        cols.forEach((c) => {
          if (String(c.id) === "products") {
            row[c.label] = String(p || "");
            return;
          }
          const v = c.value(r);
          if (c.kind === "number") row[c.label] = Number(v) || 0;
          else if (c.kind === "bool") row[c.label] = !!v;
          else if (c.kind === "date") row[c.label] = v ? formatDateId(v) : "-";
          else row[c.label] = String(v ?? "");
        });
        return row;
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: range.e.r, c: range.e.c },
      }),
    };
    (ws as any)["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: "A2",
      activePane: "bottomRight",
    };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report-po-${toYMD(new Date())}.xlsx`);
  };

  const toggleCol = (id: string) => {
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800">Report PO</h1>
            <p className="text-sm text-slate-500">
              Filter per kolom, pilih kolom, lalu export sesuai tampilan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-slate-700 hover:bg-gray-50"
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-slate-700 hover:bg-gray-50"
            >
              <Filter size={16} />
              Filter
            </button>
            <button
              type="button"
              onClick={() => setShowColumns((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-slate-700 hover:bg-gray-50"
            >
              <Settings2 size={16} />
              Kolom
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 disabled:opacity-50"
              disabled={loading || visibleColumns.length === 0}
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari No PO, company, tujuan, site area, invoice..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Tgl PO From
              </label>
              <input
                type="date"
                value={tglFrom}
                onChange={(e) => setTglFrom(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                Tgl PO To
              </label>
              <input
                type="date"
                value={tglTo}
                onChange={(e) => setTglTo(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm"
              />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setTglFrom("");
                  setTglTo("");
                  setColFilters({});
                  setSubmitFrom("");
                  setSubmitTo("");
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-slate-700 hover:bg-gray-50"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {showColumns && (
          <div className="mt-5 border border-gray-100 rounded-2xl p-4 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-700">Pilih Kolom</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    columns.forEach((c) => {
                      next[String(c.id)] = true;
                    });
                    setVisibleCols(next);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 bg-white hover:bg-gray-50"
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    columns.forEach((c) => {
                      next[String(c.id)] = c.defaultVisible;
                    });
                    setVisibleCols(next);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 bg-white hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {columns.map((c) => (
                <button
                  type="button"
                  key={String(c.id)}
                  onClick={() => toggleCol(String(c.id))}
                  className={`px-3 py-2 rounded-xl text-xs font-black text-left border transition-colors ${
                    visibleCols[String(c.id)]
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-b border-gray-100">
          <div className="text-sm text-slate-600">
            {loading
              ? "Loading..."
              : error
                ? `Error: ${error}`
                : `Menampilkan ${pageRows.length} dari ${serverTotal} baris`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-2 py-1.5 rounded-xl border border-gray-200 text-sm"
            >
              {[25, 50, 100, 250].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-600">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
              <tr>
                {visibleColumns.map((c) => (
                  <th
                    key={String(c.id)}
                    className="px-4 py-3 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
              {showFilters && (
                <tr className="bg-white border-t border-slate-100">
                  {visibleColumns.map((c) => (
                    <th key={String(c.id)} className="px-3 py-2">
                      {c.id === "submitDate" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={submitFrom}
                            onChange={(e) => setSubmitFrom(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-slate-700 outline-none"
                          />
                          <span className="text-[10px] text-slate-400">to</span>
                          <input
                            type="date"
                            value={submitTo}
                            onChange={(e) => setSubmitTo(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-slate-700 outline-none"
                          />
                        </div>
                      ) : (
                        <input
                          value={colFilters[String(c.id)] || ""}
                          onChange={(e) =>
                            setColFilters((prev) => ({
                              ...prev,
                              [String(c.id)]: e.target.value,
                            }))
                          }
                          placeholder={
                            c.kind === "number"
                              ? "ex: >1000000, 10-20"
                              : "filter..."
                          }
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-slate-700 outline-none"
                        />
                      )}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 uppercase">
              {!loading && pageRows.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-slate-500"
                    colSpan={Math.max(1, visibleColumns.length)}
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    {visibleColumns.map((c) => {
                      const v = c.value(r);
                      const text =
                        c.kind === "number"
                          ? c.id === "totalNominal" || c.id === "totalTagihan"
                            ? formatCurrency(Number(v) || 0)
                            : formatNumber(Number(v) || 0)
                          : c.kind === "date"
                            ? v
                              ? formatDateId(v)
                              : "-"
                            : c.kind === "bool"
                              ? !!v
                                ? "Ya"
                                : "Tidak"
                              : String(v ?? "");
                      return (
                        <td
                          key={String(c.id)}
                          className={`px-4 py-3 whitespace-nowrap ${
                            c.kind === "number" ? "text-right" : ""
                          } ${
                            c.id === "expiredTgl"
                              ? "text-rose-600 font-bold"
                              : "text-slate-800"
                          }`}
                        >
                          {text || "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
