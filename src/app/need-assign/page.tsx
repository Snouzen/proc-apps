"use client";

import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/me";
import PODetailModal from "@/components/po-detail-modal";
import { Search } from "lucide-react";
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";

type Row = {
  id: string;
  noPo: string;
  company: string;
  regional: string | null;
  siteArea: string;
  tglPo: string | null;
  expiredTgl: string | null;
  noInvoice: string | null;
  tujuanDetail: string | null;
  linkPo: string | null;
  Items: any[];
  UnitProduksi?: any;
  RitelModern?: any;
};

export default function NeedAssignPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"pusat" | "rm" | null>(null);
  const [regional, setRegional] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [openDetail, setOpenDetail] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [units, setUnits] = useState<
    { idRegional: string; namaRegional: string; siteArea: string }[]
  >([]);
  const [edited, setEdited] = useState<
    Record<
      string,
      {
        regional?: string;
        siteArea?: string;
        saving?: boolean;
        error?: string | null;
        ok?: boolean;
      }
    >
  >({});

  useEffect(() => {
    (async () => {
      const me = await getMe();
      setRole(me?.role === "rm" ? "rm" : "pusat");
      setRegional(me?.regional ?? null);
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await fetch("/api/unit-produksi", {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json().catch(() => []);
        const list = Array.isArray(json) ? json : [];
        setUnits(
          list.map((u: any) => ({
            idRegional: u?.idRegional,
            namaRegional: u?.namaRegional,
            siteArea: u?.siteArea,
          })),
        );
      } catch {
        setUnits([]);
      }
    };
    run();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const newSearch = String(search || "").trim();
      if (newSearch !== debouncedSearch) {
        setDebouncedSearch(newSearch);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!role) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const run = async () => {
      setLoading(true);
      setIsTransitioning(true);
      try {
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        params.set("summary", "true");
        params.set("includeItems", "false");
        params.set("group", "assign");
        params.set("limit", String(rowsPerPage));
        params.set("offset", String(Math.max(0, (page - 1) * rowsPerPage)));
        if (role === "rm" && regional) params.set("regional", regional);
        if (debouncedSearch) params.set("q", debouncedSearch);
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
        setRows(list as Row[]);
        setTotal(Number(json?.total) || list.length);
        setError(null);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Gagal mengambil data PO";
        setError(msg);
      } finally {
        setLoading(false);
        setIsTransitioning(false);
      }
    };
    run();
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [role, regional, page, rowsPerPage, debouncedSearch]);

  const formatDate = (d: any) => {
    const date = d ? new Date(d) : null;
    if (!date || isNaN(date.getTime())) return "-";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleDateString("id-ID", { month: "short" });
    const year = date.getFullYear().toString();
    return `${day} ${month} ${year}`;
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
        if (role === "rm" && regional) params.set("regional", regional);
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
    setDetailData({
      id: fullPo?.id || "",
      noPo: fullPo?.noPo || "-",
      company: fullPo?.RitelModern?.namaPt || fullPo?.company || "Unknown",
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

  const filteredRows = useMemo(() => rows, [rows]);
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const keyify = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\bregional\b/g, "reg")
      .replace(/([a-z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([a-z])/g, "$1 $2")
      .replace(/\s+/g, " ");

  const siteOptionsByRegional = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const u of units) {
      const k = keyify(u.namaRegional || "");
      if (!k) continue;
      if (!map[k]) map[k] = [];
      if (u.siteArea) map[k].push(u.siteArea);
    }
    for (const k of Object.keys(map)) {
      map[k] = Array.from(new Set(map[k])).sort();
    }
    return map;
  }, [units]);
  const siteRegionalKeys = useMemo(
    () => Object.keys(siteOptionsByRegional),
    [siteOptionsByRegional],
  );

  const columns: ColumnDef<Row>[] = [
    {
      header: "No",
      id: "index",
      cell: ({ row }) => (
        <span className="font-bold text-black">
          {(page - 1) * rowsPerPage + row.index + 1}
        </span>
      ),
    },
    {
      header: "No PO",
      accessorKey: "noPo",
      cell: ({ row }) => (
        <span className="font-semibold text-black uppercase whitespace-nowrap">
          {row.original.noPo}
        </span>
      ),
    },
    {
      header: "Company",
      accessorKey: "company",
      cell: ({ row }) => (
        <div className="text-black font-medium whitespace-normal max-w-[200px] line-clamp-2">
          {row.original.company || row.original?.RitelModern?.namaPt || "-"}
        </div>
      ),
    },
    {
      header: "Tujuan (Toko/DC)",
      accessorKey: "tujuanDetail",
      cell: ({ row }) => (
        <div className="text-black font-medium whitespace-normal max-w-[150px] line-clamp-2">
          {row.original.tujuanDetail || "-"}
        </div>
      ),
    },
    {
      header: "Regional",
      accessorKey: "regional",
      cell: ({ row }) => {
        const noPo = row.original.noPo;
        const current =
          edited[noPo]?.regional ??
          (row.original.regional && row.original.regional !== "UNKNOWN"
            ? row.original.regional
            : "") ??
          "";
        if (role === "pusat") {
          return (
            <div className="flex items-center gap-2">
              <select
                value={current}
                onChange={(e) =>
                  setEdited((prev) => ({
                    ...prev,
                    [noPo]: {
                      ...(prev[noPo] || {}),
                      regional: e.target.value,
                      error: null,
                      ok: false,
                    },
                  }))
                }
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 min-w-48"
              >
                <option value="">
                  {row.original.regional ? "—" : "Pilih…"}
                </option>
                {Array.from(new Set(units.map((u) => u.namaRegional)))
                  .filter(Boolean)
                  .sort()
                  .map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            </div>
          );
        }
        const lockedRegional =
          (row.original.regional && row.original.regional !== "UNKNOWN"
            ? row.original.regional
            : null) ??
          regional ??
          "";
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">
            {lockedRegional || "-"}
          </span>
        );
      },
    },
    {
      header: "Site Area",
      accessorKey: "siteArea",
      cell: ({ row }) => {
        const noPo = row.original.noPo;
        const currRegionalRaw =
          edited[noPo]?.regional ?? row.original.regional ?? "";
        const effectiveRegional =
          (regional && regional !== "UNKNOWN" ? regional : null) ||
          (currRegionalRaw && currRegionalRaw !== "UNKNOWN"
            ? currRegionalRaw
            : "");
        const currentSite =
          edited[noPo]?.siteArea ?? row.original.siteArea ?? "";
        const regKey = keyify(effectiveRegional);
        const resolvedKey =
          regKey && siteOptionsByRegional[regKey]
            ? regKey
            : siteRegionalKeys.find(
                (k) => (regKey && k.includes(regKey)) || regKey.includes(k),
              ) || regKey;
        const options = resolvedKey
          ? siteOptionsByRegional[resolvedKey] || []
          : [];
        const disabled = !effectiveRegional || options.length === 0;
        // options already computed from effectiveRegional
        return (
          <div className="flex items-center gap-2">
            <select
              value={currentSite || ""}
              disabled={disabled}
              onChange={(e) =>
                setEdited((prev) => ({
                  ...prev,
                  [noPo]: {
                    ...(prev[noPo] || {}),
                    siteArea: e.target.value,
                    error: null,
                    ok: false,
                  },
                }))
              }
              className={`h-9 rounded-xl border px-3 text-sm min-w-40 ${
                disabled
                  ? "bg-slate-100 border-slate-200 text-slate-400"
                  : "bg-white border-slate-300 text-slate-800"
              }`}
            >
              <option value="">
                {row.original.siteArea
                  ? "—"
                  : disabled
                    ? effectiveRegional
                      ? "Tidak ada site area"
                      : "Regional terkunci"
                    : "Pilih…"}
              </option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      },
    },
    {
      header: "Tgl PO",
      accessorKey: "tglPo",
      cell: ({ row }) => (
        <span className="text-black font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
          {formatDate(row.original.tglPo)}
        </span>
      ),
    },
    {
      header: "Expired",
      accessorKey: "expiredTgl",
      cell: ({ row }) => (
        <span className="text-black font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
          {formatDate(row.original.expiredTgl)}
        </span>
      ),
    },
    {
      header: "No Invoice",
      accessorKey: "noInvoice",
      cell: ({ row }) => (
        <span className="text-black font-medium whitespace-nowrap text-[12px]">
          {row.original.noInvoice || "-"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => {
        const noPo = row.original.noPo;
        const st = edited[noPo] || {};
        const canAssign = !!st.siteArea;
        const onAssign = async () => {
          const reg =
            role === "pusat"
              ? edited[noPo]?.regional ||
                (row.original.regional && row.original.regional !== "UNKNOWN"
                  ? row.original.regional
                  : null)
              : (regional && regional !== "UNKNOWN" ? regional : null) ||
                (row.original.regional && row.original.regional !== "UNKNOWN"
                  ? row.original.regional
                  : null);
          if (!reg) {
            setEdited((prev) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), error: "Isi regional dulu" },
            }));
            return;
          }
          if (!st.siteArea) {
            setEdited((prev) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), error: "Pilih site area" },
            }));
            return;
          }
          setEdited((prev) => ({
            ...prev,
            [noPo]: { ...(prev[noPo] || {}), saving: true, error: null },
          }));
          try {
            const res = await fetch("/api/po/assign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ noPo, siteArea: st.siteArea }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok)
              throw new Error((json as any)?.error || res.statusText);
            // Update row locally
            setRows((prev) =>
              prev.map((r) =>
                r.noPo === noPo
                  ? {
                      ...r,
                      regional: reg || r.regional,
                      siteArea: st.siteArea || r.siteArea,
                    }
                  : r,
              ),
            );
            setEdited((prev) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), saving: false, ok: true },
            }));
          } catch (e: any) {
            setEdited((prev) => ({
              ...prev,
              [noPo]: {
                ...(prev[noPo] || {}),
                saving: false,
                error: e?.message || "Gagal assign",
              },
            }));
          }
        };
        return (
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <button
                disabled={!canAssign || st.saving}
                onClick={onAssign}
                className={`inline-flex h-9 px-3 items-center justify-center rounded-xl border text-xs font-bold whitespace-nowrap ${
                  !canAssign || st.saving
                    ? "border-slate-200 bg-slate-100 text-slate-400"
                    : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {st.saving ? "Saving…" : "Assign"}
              </button>
              <button
                className="inline-flex h-9 px-3 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold whitespace-nowrap"
                onClick={() => openModal(row.original)}
              >
                View
              </button>
            </div>
            {st.error && (
              <div className="mt-1 text-[11px] font-semibold text-rose-600">
                {st.error}
              </div>
            )}
            {st.ok && !st.error && (
              <div className="mt-1 text-[11px] font-semibold text-emerald-600">
                Assigned
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: {
        pageIndex: Math.max(0, page - 1),
        pageSize: rowsPerPage,
      },
    },
    manualPagination: true,
    pageCount: totalPages,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({
              pageIndex: Math.max(0, page - 1),
              pageSize: rowsPerPage,
            })
          : updater;
      setRowsPerPage(next.pageSize);
      setPage(next.pageIndex + 1);
    },
  });

  return (
    <main className="px-5 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Need To Assign</h1>
          <p className="text-sm text-slate-500">
            Menampilkan PO yang belum memiliki data regional dan belum expired.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No PO / Company / Inisial…"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800"
            />
          </div>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value) || 10);
              if (page !== 1) setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-160px)] min-h-[500px]">
        {error && (
          <div className="px-6 py-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">
            {error}
          </div>
        )}
        <div className="overflow-auto flex-1 relative">
          <table className="min-w-[920px] w-full text-left relative">
            <thead className="text-[11px] text-black font-bold uppercase tracking-wide sticky top-0 z-10 shadow-sm shadow-slate-200/50 bg-slate-50 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-slate-200">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-6 py-3 font-bold bg-slate-50 whitespace-nowrap"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              className={`divide-y divide-slate-100 text-sm transition-opacity duration-300 ${isTransitioning ? "opacity-50" : "opacity-100"}`}
            >
              {table.getRowModel().rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-6 py-3">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredRows.length === 0 && !loading && !isTransitioning && (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-slate-500"
                    colSpan={columns.length}
                  >
                    Tidak ada data Need To Assign.
                  </td>
                </tr>
              )}
              {(loading || isTransitioning) && (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-slate-800"
                    colSpan={columns.length}
                  >
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Showing {filteredRows.length} of {total} PO
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              disabled={page <= 1 || isTransitioning || loading}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50 transition-colors hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages || isTransitioning || loading}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50 transition-colors hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <PODetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={detailData}
      />
    </main>
  );
}
