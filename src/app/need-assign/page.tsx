"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMe } from "@/lib/me";
import PODetailModal from "@/components/po-detail-modal";
import { Search, ChevronDown, X } from "lucide-react";
import {
  ColumnDef,
  getCoreRowModel,
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

// UI FIX: Modern Custom Select Component Wrapper
function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  disabled = false,
  className = "",
  align = "left",
  onClear,
}: {
  value: string | number;
  onChange: (val: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: "left" | "right";
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label || placeholder;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/20 ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-white border-slate-300 text-slate-800 hover:border-blue-400 shadow-sm"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <div className="flex items-center gap-1.5 ml-2">
          {onClear && value && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onClear();
                }
              }}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {open && !disabled && (
        <div
          className={`absolute z-[9999] mt-1 min-w-[200px] max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.length > 0 ? (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(String(opt.value));
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 font-medium ${
                  String(opt.value) === String(value)
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">
              Tidak ada data
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const lastCtrlRef = useRef<AbortController | null>(null);

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
        if (page !== 1) {
          setIsTransitioning(true);
          setPage(1);
        }
      }
    }, 500);
    return () => clearTimeout(t);
  }, [search, debouncedSearch, page]);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchData = useCallback(async () => {
    if (!role) return;
    if (typeof document !== "undefined" && !document.hasFocus()) return;
    setLoading(true);
    setIsTransitioning(true);
    if (lastCtrlRef.current) {
      try {
        lastCtrlRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    lastCtrlRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 10000);
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
      const list = Array.isArray((json as any)?.data)
        ? (json as any).data
        : Array.isArray(json)
          ? (json as any)
          : [];
      setRows(list as Row[]);
      setTotal(Number((json as any)?.total) || list.length);
      setError(null);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Gagal mengambil data PO";
      setError(msg);
    } finally {
      clearTimeout(timer);
      setLoading(false);
      setIsTransitioning(false);
    }
  }, [debouncedSearch, page, regional, role, rowsPerPage]);

  useEffect(() => {
    if (!role) return;
    if (typeof document !== "undefined" && !document.hasFocus()) return;
    fetchData();
  }, [fetchData, role, debouncedSearch, page, rowsPerPage, regional]);

  useEffect(() => {
    return () => {
      if (lastCtrlRef.current) {
        try {
          lastCtrlRef.current.abort();
        } catch {}
      }
    };
  }, []);

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
        <span className="text-black font-bold">
          {(page - 1) * rowsPerPage + row.index + 1}
        </span>
      ),
    },
    {
      header: "No PO",
      accessorKey: "noPo",
      cell: ({ row }) => (
        <div
          className="font-semibold text-black uppercase max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.original.noPo || "-")}
        >
          {row.original.noPo || "-"}
        </div>
      ),
    },
    {
      header: "Company",
      accessorKey: "company",
      cell: ({ row }) => (
        <div
          className="text-slate-800 font-medium max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(
            row.original.company || row.original?.RitelModern?.namaPt || "-",
          )}
        >
          {row.original.company || row.original?.RitelModern?.namaPt || "-"}
        </div>
      ),
    },
    {
      header: "Tujuan (Toko/DC)",
      accessorKey: "tujuanDetail",
      cell: ({ row }) => (
        <div
          className="text-slate-800 font-medium max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.original.tujuanDetail || "-")}
        >
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
              {/* UI FIX: Modern Custom Select */}
              <CustomSelect
                value={current}
                onChange={(val) =>
                  setEdited((prev) => ({
                    ...prev,
                    [noPo]: {
                      ...(prev[noPo] || {}),
                      regional: val,
                      error: null,
                      ok: false,
                    },
                  }))
                }
                placeholder={row.original.regional ? "—" : "Pilih…"}
                options={Array.from(new Set(units.map((u) => u.namaRegional)))
                  .filter(Boolean)
                  .sort()
                  .map((opt) => ({ value: opt, label: opt }))}
                onClear={() =>
                  setEdited((prev) => ({
                    ...prev,
                    [noPo]: {
                      ...(prev[noPo] || {}),
                      regional: "",
                      siteArea: "", // Reset site area too if regional cleared
                      error: null,
                    },
                  }))
                }
                className="min-w-[220px]"
              />
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
            {/* UI FIX: Modern Custom Select */}
            <CustomSelect
              value={currentSite || ""}
              disabled={disabled}
              onChange={(val) =>
                setEdited((prev) => ({
                  ...prev,
                  [noPo]: {
                    ...(prev[noPo] || {}),
                    siteArea: val,
                    error: null,
                    ok: false,
                  },
                }))
              }
              placeholder={
                row.original.siteArea
                  ? "—"
                  : disabled
                    ? effectiveRegional
                      ? "Tidak ada site area"
                      : "Regional terkunci"
                    : "Pilih…"
              }
              options={options.map((opt) => ({ value: opt, label: opt }))}
              onClear={() =>
                setEdited((prev) => ({
                  ...prev,
                  [noPo]: {
                    ...(prev[noPo] || {}),
                    siteArea: "",
                    error: null,
                  },
                }))
              }
              className="min-w-40"
            />
          </div>
        );
      },
    },
    {
      header: "Tgl PO",
      accessorKey: "tglPo",
      cell: ({ row }) => (
        <span className="text-slate-800 font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
          {formatDate(row.original.tglPo)}
        </span>
      ),
    },
    {
      header: "Expired",
      accessorKey: "expiredTgl",
      cell: ({ row }) => (
        <span className="text-slate-800 font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
          {formatDate(row.original.expiredTgl)}
        </span>
      ),
    },
    {
      header: "No Invoice",
      accessorKey: "noInvoice",
      cell: ({ row }) => (
        <span className="text-slate-800 font-medium whitespace-nowrap text-[12px]">
          {row.original.noInvoice || "-"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => {
        const noPo = row.original.noPo;
        const st = edited[noPo] || {};
        
        // 1. Bersihkan nilai dan buat perbandingan dengan data original
        const selectedReg = st.regional !== undefined ? st.regional : row.original.regional;
        const selectedSite = st.siteArea !== undefined ? st.siteArea : row.original.siteArea;
        
        const cleanStr = (val: any) => {
          if (!val) return "";
          const str = String(val).trim();
          if (str.toLowerCase() === "unknown" || str.toLowerCase() === "pilih..." || str.toLowerCase().includes("unit produksi")) return "";
          return str;
        };
        
        const currentReg = cleanStr(selectedReg);
        const currentSite = cleanStr(selectedSite);
        
        const originalReg = cleanStr(row.original.regional);
        const originalSite = cleanStr(row.original.siteArea);
        
        // 2. Cek apakah ada perubahan data pengisian
        const hasChanges = currentReg !== originalReg || currentSite !== originalSite;
        
        // 3. Cek validasi minimum berdasar role
        const isValid = role === "pusat" ? currentReg !== "" : currentReg !== "" && currentSite !== "";
        
        // 4. Tombol disabled check
        const isButtonDisabled = !isValid || !hasChanges || !!st.saving;

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

          // Validation logic based on role
          if (!reg) {
            setEdited((prev) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), error: "Isi regional dulu" },
            }));
            return;
          }

          if (role === "rm" && !st.siteArea) {
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
              body: JSON.stringify({ 
                noPo, 
                regional: reg,
                siteArea: st.siteArea === "Pilih..." || !st.siteArea ? null : st.siteArea 
              }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok)
              throw new Error((json as any)?.error || res.statusText);
            
            // UI Improvement: Auto-Hide (Optimistic Update)
            setRows((prev) => prev.filter((r) => r.noPo !== noPo));
            setTotal((prev) => Math.max(0, prev - 1));

            setEdited((prev) => {
              const next = { ...prev };
              delete next[noPo];
              return next;
            });
            
            // alert("PO berhasil di-assign!"); // Fallback as toast library not found
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
                disabled={isButtonDisabled}
                onClick={onAssign}
                className={`inline-flex h-9 px-3 items-center justify-center rounded-xl border text-xs font-bold whitespace-nowrap transition-colors duration-150 ${
                  isButtonDisabled
                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                    : "border-blue-200 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
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
      setIsTransitioning(true);
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
          {/* UI FIX: Modern Custom Select */}
          <CustomSelect
            value={rowsPerPage}
            onChange={(val) => {
              setIsTransitioning(true);
              setRowsPerPage(Number(val) || 10);
              if (page !== 1) setPage(1);
            }}
            options={[
              { value: 10, label: "10 rows" },
              { value: 25, label: "25 rows" },
              { value: 50, label: "50 rows" },
            ]}
            className="w-32"
            align="right"
          />
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
            <thead className="text-[11px] text-slate-800 uppercase tracking-wide sticky top-0 z-10 shadow-sm shadow-slate-200/50 bg-slate-50 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-slate-200">
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
              className={`divide-y divide-slate-100 text-sm text-black transition-opacity duration-300 ${isTransitioning ? "opacity-50" : "opacity-100"}`}
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
              disabled={page <= 1 || isTransitioning}
              onClick={() => {
                setIsTransitioning(true);
                setPage((p) => Math.max(1, p - 1));
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages || isTransitioning}
              onClick={() => {
                setIsTransitioning(true);
                setPage((p) => Math.min(totalPages, p + 1));
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
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
