"use client";

// XLSX lazy-loaded on export (~200KB saved from initial bundle)
const getXLSX = () => import("xlsx");
import {
  Download,
  Filter,
  RefreshCw,
  Settings2,
  X,
  ChevronDown,
  Check,
  Search,
  ExternalLink,
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { upperClean } from "@/lib/text";
import DateInputHybrid from "@/components/DateInputHybrid";
import { GlobalPagination } from "@/components/global-pagination";
import { getMe } from "@/lib/me";

type Row = {
  no: number;
  id: string;
  noPo: string;
  company: string;
  inisial: string;
  regional: string;
  siteArea: string;
  tglPo: string;
  tglkirim: string;
  expiredTgl: string;

  noInvoice: string;
  buktiTagih: string;
  buktiBayar: string;

  namaSupir: string;
  platNomor: string;
  tujuanDetail: string;
  remarks: string;
  linkPo: string;

  statusKirim: boolean;
  statusSdif: boolean;
  statusPo: boolean;
  statusFp: boolean;
  statusKwi: boolean;
  statusInv: boolean;
  statusTagih: boolean;
  statusBayar: boolean;

  namaProduk: string;
  pcs: number;
  pcsKirim: number;
  satuanKg: number;
  kg: number;
  hargaPcs: number;
  hargaKg: number;
  nominal: number;
  discount: number;
  rpTagih: number;

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

const formatDateExcel = (dateValue: any) => {
  if (!dateValue || dateValue === "-") return "-";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

const EXCLUDED_FILTER_COLS = [
  "tglPo",
  "tglkirim",
  "expiredTgl",
  "createdAt",
  "updatedAt",
  "submitDate",
  "no",
  "linkPo",
  "pcs",
  "pcsKirim",
  "satuanKg",
  "kg",
  "hargaPcs",
  "hargaKg",
  "nominal",
  "discount",
  "rpTagih",
  "statusKirim",
  "statusSdif",
  "statusPo",
  "statusFp",
  "statusKwi",
  "statusInv",
  "statusTagih",
  "statusBayar",
];

function MultiSelectFilterDropdown({
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOptions = options.filter(
    (o) => o && o.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <div className={`relative w-full ${open ? "z-50" : "z-0"}`} ref={wrapperRef}>
      <div
        className={`relative flex min-h-[38px] flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-xl border ${open ? "border-emerald-500 bg-white dark:bg-slate-800" : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"} ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50" : "hover:border-gray-300 dark:hover:border-slate-700 cursor-text transition-colors"}`}
        onClick={() => !disabled && setOpen(true)}
      >
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 w-full mb-1">
            {value.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-md max-w-full overflow-hidden">
                <span className="truncate max-w-[150px]">{v}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(value.filter((val) => val !== v));
                    }}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between w-full">
          <input
            type="text"
            className="flex-1 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal min-w-[50px]"
            placeholder={value.length === 0 ? (placeholder || "Ketik atau pilih...") : "Tambah lagi..."}
            value={inputValue}
            disabled={disabled}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => !disabled && setOpen(true)}
          />
          {!disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0 px-1"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
          <ul className="flex flex-col gap-0.5">
            {value.length > 0 && (
              <li
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer flex items-center transition-colors border-b border-gray-50 dark:border-slate-700 mb-1"
                onClick={() => {
                  setInputValue("");
                  onChange([]);
                }}
              >
                <div className="flex items-center gap-2">
                  <X size={14} />
                  Hapus Semua Pilihan ({value.length})
                </div>
              </li>
            )}

            {inputValue && !options.some((o) => o?.toLowerCase() === inputValue.toLowerCase()) && (
              <li
                className="px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer flex items-center transition-colors mt-1"
                onClick={() => {
                  if (!value.includes(inputValue)) {
                    onChange([...value, inputValue]);
                  }
                  setInputValue("");
                }}
              >
                <div className="flex items-center gap-2">
                  <Search size={14} />
                  <span>Tambah <q>{inputValue}</q></span>
                </div>
              </li>
            )}

            {filteredOptions.length > 0 ? (
              <>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                {filteredOptions.map((opt, i) => {
                  const isSelected = value.includes(opt);
                  return (
                    <li
                      key={i}
                      onClick={() => {
                        if (isSelected) {
                          onChange(value.filter((v) => v !== opt));
                        } else {
                          onChange([...value, opt]);
                        }
                        setInputValue("");
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{opt}</span>
                      </div>
                    </li>
                  );
                })}
              </>
            ) : (
              !inputValue && <li className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">Tidak ada data yang tersedia</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const [raw, setRaw] = useState<any[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showColumns, setShowColumns] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [debouncedColFiltersJson, setDebouncedColFiltersJson] =
    useState<string>("{}");
  const [submitFrom, setSubmitFrom] = useState("");
  const [submitTo, setSubmitTo] = useState("");
  const [pcsKirim, setPcsKirim] = useState("");
  const [masterCombinations, setMasterCombinations] = useState<any[]>([]);
  const lastCtrlRef = useRef<AbortController | null>(null);

  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);
  const [userSiteArea, setUserSiteArea] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        if (me?.authenticated) {
          setRole(me.role as any);
          setUserRegional(me.regional || null);

          const rawEmailPrefix = me.email
            ? me.email.split("@")[0].toUpperCase()
            : "";

          // Logika cerdas: sesuaikan format 'SPBDKI' menjadi 'SPB DKI' agar match dengan DB
          let formattedSiteArea = rawEmailPrefix;
          if (rawEmailPrefix.startsWith("SPB") && rawEmailPrefix.length > 3) {
            formattedSiteArea = "SPB " + rawEmailPrefix.substring(3);
          } else if (
            rawEmailPrefix.startsWith("SPP") &&
            rawEmailPrefix.length > 3
          ) {
            formattedSiteArea = "SPP " + rawEmailPrefix.substring(3);
          }

          const finalSiteArea = me.siteArea || formattedSiteArea;
          setUserSiteArea(finalSiteArea);

          if (me.role === "sitearea") {
            setColFilters((prev) => ({
              ...prev,
              regional: me.regional ? [me.regional] : [],
              siteArea: finalSiteArea ? [finalSiteArea] : [],
            }));
          } else if (me.role === "rm") {
            setColFilters((prev) => ({
              ...prev,
              regional: me.regional ? [me.regional] : [],
            }));
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/po/dict", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setMasterCombinations(data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const columns: Column[] = useMemo(
    () => [
      {
        id: "no",
        label: "No",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.no,
      },
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
        defaultVisible: true,
        value: (r) => r.inisial,
      },
      {
        id: "regional",
        label: "Regional",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.regional,
      },
      {
        id: "siteArea",
        label: "Site Area",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.siteArea,
      },
      {
        id: "tglPo",
        label: "Tgl PO",
        kind: "date",
        defaultVisible: true,
        value: (r) => r.tglPo,
      },
      {
        id: "tglkirim",
        label: "Tgl Kirim",
        kind: "date",
        defaultVisible: true,
        value: (r) => r.tglkirim,
      },
      {
        id: "expiredTgl",
        label: "Expired",
        kind: "date",
        defaultVisible: true,
        value: (r) => r.expiredTgl,
      },
      {
        id: "noInvoice",
        label: "No Invoice",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.noInvoice,
      },
      {
        id: "buktiTagih",
        label: "Bukti Tagih",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.buktiTagih,
      },
      {
        id: "buktiBayar",
        label: "Bukti Bayar",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.buktiBayar,
      },
      {
        id: "linkPo",
        label: "Link PO",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.linkPo,
      },
      {
        id: "namaSupir",
        label: "Nama Supir",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.namaSupir,
      },
      {
        id: "platNomor",
        label: "Plat Nomor",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.platNomor,
      },
      {
        id: "tujuanDetail",
        label: "Tujuan Detail",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.tujuanDetail,
      },
      {
        id: "remarks",
        label: "Remarks",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.remarks,
      },
      {
        id: "statusKirim",
        label: "Kirim",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusKirim,
      },
      {
        id: "statusPo",
        label: "PO",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusPo,
      },
      {
        id: "statusInv",
        label: "Inv",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusInv,
      },
      {
        id: "statusBayar",
        label: "Bayar",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusBayar,
      },
      {
        id: "statusSdif",
        label: "SDIF",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusSdif,
      },
      {
        id: "statusFp",
        label: "FP",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusFp,
      },
      {
        id: "statusKwi",
        label: "Kwi",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusKwi,
      },
      {
        id: "statusTagih",
        label: "Tagih",
        kind: "bool",
        defaultVisible: true,
        value: (r) => r.statusTagih,
      },
      {
        id: "namaProduk",
        label: "Produk",
        kind: "text",
        defaultVisible: true,
        value: (r) => r.namaProduk,
      },
      {
        id: "pcs",
        label: "PCS",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.pcs,
      },
      {
        id: "pcsKirim",
        label: "PCS Kirim",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.pcsKirim,
      },
      {
        id: "satuanKg",
        label: "Berat Satuan (Kg)",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.satuanKg,
      },
      {
        id: "kg",
        label: "Total Kg",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.kg,
      },
      {
        id: "hargaPcs",
        label: "Harga/Pcs",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.hargaPcs,
      },
      {
        id: "hargaKg",
        label: "Harga/Kg",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.hargaKg,
      },
      {
        id: "discount",
        label: "Diskon",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.discount,
      },
      {
        id: "nominal",
        label: "Nominal",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.nominal,
      },
      {
        id: "rpTagih",
        label: "Rp Tagih",
        kind: "number",
        defaultVisible: true,
        value: (r) => r.rpTagih,
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

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(String(query || "").trim());
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => {
      const activeFilters = Object.entries(colFilters).filter(
        ([, v]) => Array.isArray(v) && v.length > 0,
      );
      if (activeFilters.length > 0) {
        setDebouncedColFiltersJson(
          JSON.stringify(Object.fromEntries(activeFilters)),
        );
      } else {
        setDebouncedColFiltersJson("");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [colFilters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (lastCtrlRef.current) {
      try {
        lastCtrlRef.current.abort();
      } catch {}
    }
    const ctrl = new AbortController();
    lastCtrlRef.current = ctrl;
    try {
      const params = new URLSearchParams();
      params.set("includeUnknown", "true");
      params.set("includeItems", "true");
      params.set("limit", String(rowsPerPage));
      params.set("offset", String(Math.max(0, (page - 1) * rowsPerPage)));
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (tglFrom) params.set("tglFrom", tglFrom);
      if (tglTo) params.set("tglTo", tglTo);
      if (submitFrom) params.set("submitFrom", submitFrom);
      if (submitTo) params.set("submitTo", submitTo);
      if (pcsKirim.trim()) params.set("pcsKirim", pcsKirim.trim());

      if (role === "sitearea" && userSiteArea) {
        params.set("siteArea", userSiteArea);
        if (userRegional) params.set("regional", userRegional);
      } else if (role === "rm" && userRegional) {
        params.set("regional", userRegional);
      }

      if (debouncedColFiltersJson) {
        params.set("colFilters", debouncedColFiltersJson);
      }

      params.set("sort", "createdAt_desc");

      const res = await fetch(`/api/po?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      setRaw(list);
      requestAnimationFrame(() => {
        setServerTotal(Number(data?.total) || 0);
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Gagal load data";
      setError(msg);
      setRaw([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedColFiltersJson,
    debouncedQuery,
    page,
    rowsPerPage,
    submitFrom,
    submitTo,
    tglFrom,
    tglTo,
    pcsKirim,
    role,
    userRegional,
    userSiteArea,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (lastCtrlRef.current) {
        try {
          lastCtrlRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const rows: Row[] = useMemo(() => {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.flatMap((po: any, poIndex: number) => {
      const items =
        Array.isArray(po?.Items) && po.Items.length > 0 ? po.Items : [null];

      return items.map((it: any, itemIndex: number) => {
        return {
          no: (page - 1) * rowsPerPage + poIndex + 1,
          id:
            String(po?.id || po?.noPo || crypto.randomUUID()) + `-${itemIndex}`,

          noPo: upperClean(po?.noPo || "-"),
          company: upperClean(po?.RitelModern?.namaPt || po?.company || "-"),
          inisial: upperClean(po?.RitelModern?.inisial || po?.inisial || "-"),
          regional: (po?.regional || po?.UnitProduksi?.namaRegional || "-")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, " "),
          siteArea: upperClean(
            po?.UnitProduksi?.siteArea &&
              po.UnitProduksi.siteArea.toUpperCase() !== "UNKNOWN"
              ? po.UnitProduksi.siteArea
              : "-",
          ),

          tglPo: toYMD(po?.tglPo),
          tglkirim: toYMD(po?.tglkirim),
          expiredTgl: toYMD(po?.expiredTgl),

          noInvoice: upperClean(po?.noInvoice || ""),
          buktiTagih: po?.buktiTagih || "-",
          buktiBayar: po?.buktiBayar || "-",
          linkPo: String(po?.linkPo || "-"),

          namaSupir: po?.namaSupir || "-",
          platNomor: po?.platNomor || "-",
          tujuanDetail: po?.tujuanDetail || po?.tujuan || "-",
          remarks: po?.remarks || "-",

          statusKirim: !!po?.statusKirim,
          statusSdif: !!po?.statusSdif,
          statusPo: !!po?.statusPo,
          statusFp: !!po?.statusFp,
          statusKwi: !!po?.statusKwi,
          statusInv: !!po?.statusInv,
          statusTagih: !!po?.statusTagih,
          statusBayar: !!po?.statusBayar,

          namaProduk: it?.Product?.name || it?.namaProduk || "-",
          pcs: Number(it?.pcs) || 0,
          pcsKirim: Number(it?.pcsKirim) || 0,
          satuanKg: Number(it?.Product?.satuanKg) || 0,
          kg: (Number(it?.pcs) || 0) * (Number(it?.Product?.satuanKg) || 0),
          hargaPcs: Number(it?.hargaPcs) || 0,
          hargaKg: Number(it?.hargaKg) || 0,
          nominal:
            Number(it?.nominal) ||
            (Number(it?.pcs) || 0) * (Number(it?.hargaPcs) || 0),
          discount: Number(it?.discount) || 0,
          rpTagih: Number(it?.rpTagih) || 0,

          updatedAt: toYMD(po?.updatedAt),
          createdAt: toYMD(po?.createdAt),
          submitDate: toYMD(po?.createdAt || po?.updatedAt || po?.tglPo),
        };
      });
    });
  }, [raw, page, rowsPerPage]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleCols[String(c.id)]),
    [columns, visibleCols],
  );

  useEffect(() => {
    setPage(1);
  }, [
    debouncedQuery,
    tglFrom,
    tglTo,
    rowsPerPage,
    debouncedColFiltersJson,
    visibleCols,
    submitFrom,
    submitTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / rowsPerPage));
  const filteredRows = useMemo(() => {
    const q = upperClean(debouncedQuery);
    const filters: Record<string, string> = (() => {
      try {
        const obj = JSON.parse(debouncedColFiltersJson || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    })();
    const list = Array.isArray(rows) ? rows : [];
    if (!q && Object.keys(filters).length === 0) return list;
    return list.filter((r) => {
      if (q) {
        const hay = [
          r.noPo,
          r.company,
          r.inisial,
          r.tujuanDetail,
          r.siteArea,
          r.regional,
          r.noInvoice,
          r.namaProduk,
          r.namaSupir,
          r.platNomor,
        ]
          .map((x) => upperClean(x))
          .join(" ");
        if (!hay.includes(q)) return false;
      }
      for (const [k, vArr] of Object.entries(filters)) {
        if (!Array.isArray(vArr) || vArr.length === 0) continue;
        const key = String(k);
        const cell = upperClean(String((r as any)[key] ?? ""));
        
        // Multi-select acts as OR logic
        const match = vArr.some(v => cell.includes(upperClean(v)));
        if (!match) return false;
      }
      return true;
    });
  }, [debouncedColFiltersJson, debouncedQuery, rows]);
  const pageRows = filteredRows;

  const getOptionsForColumn = useCallback(
    (colId: string) => {
      const mappedColId = colId === "namaProduk" ? "products" : colId === "tujuanDetail" ? "tujuan" : colId;

      const activeFilters = Object.entries(colFilters).filter(
        ([k, v]) =>
          String(k) !== String(colId) && Array.isArray(v) && v.length > 0,
      );

      const validCombos = masterCombinations.filter((combo) => {
        return activeFilters.every(([k, vArr]) => {
          const comboKey = k === "namaProduk" ? "products" : k === "tujuanDetail" ? "tujuan" : k;
          const comboVal = combo[comboKey];
          
          if (Array.isArray(comboVal)) {
            // If combo value is array, check if any of its elements match ANY of the selected filter values
            return vArr.some((fv) => {
              const filterValue = upperClean(fv);
              return filterValue ? comboVal.some((p) => upperClean(String(p)).includes(filterValue)) : true;
            });
          } else {
            return vArr.some((fv) => {
              const filterValue = upperClean(fv);
              return filterValue ? upperClean(String(comboVal || "")).includes(filterValue) : true;
            });
          }
        });
      });

      const uniqueValues = new Set<string>();
      validCombos.forEach((combo) => {
        const val = combo[mappedColId];
        if (Array.isArray(val)) {
          val.forEach((v) => {
            const str = String(v || "").trim();
            if (str) uniqueValues.add(str);
          });
        } else {
          const str = String(val ?? "").trim();
          if (str) uniqueValues.add(str);
        }
      });

      const rawList = Array.from(uniqueValues);
      const isNumber =
        columns.find((c) => String(c.id) === colId)?.kind === "number";
      if (isNumber) {
        rawList.sort((a, b) => Number(a) - Number(b));
      } else {
        rawList.sort((a, b) => a.localeCompare(b));
      }

      return rawList;
    },
    [masterCombinations, colFilters, columns],
  );

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setTglFrom("");
    setTglTo("");
    setColFilters((prev) => {
      const next: Record<string, string[]> = {};
      if (role === "sitearea") {
        next.regional = userRegional ? [userRegional] : [];
        next.siteArea = userSiteArea ? [userSiteArea] : [];
      } else if (role === "rm") {
        next.regional = userRegional ? [userRegional] : [];
      }
      return next;
    });
    setSubmitFrom("");
    setSubmitTo("");
    setPage(1);
  }, [role, userRegional, userSiteArea]);

  const exportExcel = async () => {
    setExporting(true);
    const productCol = columns.find((c) => String(c.id) === "products");
    const cols =
      visibleColumns.some((c) => String(c.id) === "products") || !productCol
        ? visibleColumns
        : [...visibleColumns, productCol];
    try {
      const baseParams = new URLSearchParams();
      baseParams.set("includeUnknown", "true");
      baseParams.set("includeItems", "true");
      if (query.trim()) baseParams.set("q", query.trim());
      if (tglFrom) baseParams.set("tglFrom", tglFrom);
      if (tglTo) baseParams.set("tglTo", tglTo);
      if (submitFrom) baseParams.set("submitFrom", submitFrom);
      if (submitTo) baseParams.set("submitTo", submitTo);

      const activeFilters = Object.entries(colFilters).filter(
        ([, v]) => Array.isArray(v) && v.length > 0,
      );
      if (activeFilters.length > 0) {
        const filterObj = Object.fromEntries(activeFilters);
        baseParams.set("colFilters", JSON.stringify(filterObj));
      }

      baseParams.set("sort", "createdAt_desc");

      if (serverTotal > 5000) {
        const columnsConfig = cols.map((c) => ({ id: c.id, label: c.label }));
        baseParams.set("cols", JSON.stringify(columnsConfig));

        const url = `/api/po/export?${baseParams.toString()}`;
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `report-po-${toYMD(new Date())}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        setExporting(false);
        return;
      }

      const chunk = 500;
      const total = Math.max(0, Number(serverTotal) || 0);
      const pages = total > 0 ? Math.ceil(total / chunk) : 1;
      const all: any[] = [];
      for (let i = 0; i < pages; i++) {
        const params = new URLSearchParams(baseParams);
        params.set("limit", String(chunk));
        params.set("offset", String(i * chunk));
        const res = await fetch(`/api/po?${params.toString()}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.data) ? json.data : [];
        all.push(...list);
        if (list.length < chunk) break;
      }

      let currentRowNo = 0;
      const mapped: Row[] = (Array.isArray(all) ? all : []).flatMap(
        (po: any) => {
          const items =
            Array.isArray(po?.Items) && po.Items.length > 0 ? po.Items : [null];

          return items.map((it: any, itemIndex: number) => {
            currentRowNo += 1;
            return {
              no: currentRowNo,
              id:
                String(po?.id || po?.noPo || crypto.randomUUID()) +
                `-${itemIndex}`,

              noPo: upperClean(po?.noPo || "-"),
              company: upperClean(
                po?.RitelModern?.namaPt || po?.company || "-",
              ),
              inisial: upperClean(
                po?.RitelModern?.inisial || po?.inisial || "",
              ),
              regional: upperClean(
                po?.regional || po?.UnitProduksi?.namaRegional || "",
              ),
              siteArea: upperClean(
                po?.UnitProduksi?.siteArea &&
                  po.UnitProduksi.siteArea !== "UNKNOWN"
                  ? po.UnitProduksi.siteArea
                  : "",
              ),

              tglPo: toYMD(po?.tglPo),
              tglkirim: toYMD(po?.tglkirim),
              expiredTgl: toYMD(po?.expiredTgl),

              noInvoice: upperClean(po?.noInvoice || ""),
              buktiTagih: po?.buktiTagih || "-",
              buktiBayar: po?.buktiBayar || "-",
              linkPo: String(po?.linkPo || "-"),

              namaSupir: po?.namaSupir || "-",
              platNomor: po?.platNomor || "-",
              tujuanDetail: po?.tujuanDetail || po?.tujuan || "-",
              remarks: po?.remarks || "-",

              statusKirim: !!po?.statusKirim,
              statusSdif: !!po?.statusSdif,
              statusPo: !!po?.statusPo,
              statusFp: !!po?.statusFp,
              statusKwi: !!po?.statusKwi,
              statusInv: !!po?.statusInv,
              statusTagih: !!po?.statusTagih,
              statusBayar: !!po?.statusBayar,

              namaProduk: it?.Product?.name || it?.namaProduk || "-",
              pcs: Number(it?.pcs) || 0,
              pcsKirim: Number(it?.pcsKirim) || 0,
              satuanKg: Number(it?.Product?.satuanKg) || 0,
              kg: (Number(it?.pcs) || 0) * (Number(it?.Product?.satuanKg) || 0),
              hargaPcs: Number(it?.hargaPcs) || 0,
              hargaKg: Number(it?.hargaKg) || 0,
              nominal:
                Number(it?.nominal) ||
                (Number(it?.pcs) || 0) * (Number(it?.hargaPcs) || 0),
              discount: Number(it?.discount) || 0,
              rpTagih: Number(it?.rpTagih) || 0,

              updatedAt: toYMD(po?.updatedAt),
              createdAt: toYMD(po?.createdAt),
              submitDate: toYMD(po?.createdAt || po?.updatedAt || po?.tglPo),
            };
          });
        },
      );

      const data = mapped.map((r) => {
        const row: Record<string, any> = {};
        cols.forEach((c) => {
          const v = c.value(r);
          if (c.kind === "number") row[c.label] = Number(v) || 0;
          else if (c.kind === "bool") row[c.label] = !!v;
          else if (c.kind === "date") {
            const dt = toDate(v);
            row[c.label] = dt ? dt : "-";
          } else row[c.label] = String(v ?? "");
        });
        return row;
      });
      const XLSX = await getXLSX();
      const ws = XLSX.utils.json_to_sheet(data, { cellDates: true });

      // Apply dd/mm/yyyy format to date cells
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell || cell.t !== 'd') continue;
          cell.z = 'dd/mm/yyyy';
        }
      }

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
    } finally {
      setExporting(false);
    }
  };

  const toggleCol = (id: string) => {
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Report PO</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filter per kolom, pilih kolom, lalu export sesuai tampilan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              <Filter size={16} />
              Filter
            </button>
            <button
              type="button"
              onClick={() => setShowColumns((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              <Settings2 size={16} />
              Kolom
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 disabled:opacity-50"
              disabled={loading || exporting || visibleColumns.length === 0}
            >
              <Download size={16} />
              {exporting ? "Exporting..." : "Export"}
            </button>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              Terfilter: {formatNumber(serverTotal || 0)}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm dark:shadow-none mb-6">
            <div className="col-span-full flex items-center justify-between mb-2 border-b border-gray-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                Filter Data Dinamis
              </h3>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/20 transition-colors"
              >
                <X size={14} />
                Clear All
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Pencarian Umum
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari PO, company, invoice..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-xl outline-none text-sm text-slate-700 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-500 font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">
                Tgl PO From
              </label>
              <DateInputHybrid
                value={tglFrom}
                onChange={setTglFrom}
                placeholder="Pilih Tanggal..."
                maxDate={tglTo}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">
                Tgl PO To
              </label>
              <DateInputHybrid
                value={tglTo}
                onChange={setTglTo}
                placeholder="Pilih Tanggal..."
                minDate={tglFrom}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">
                Tanggal Submit
              </label>
              <div className="flex items-center gap-2">
                <DateInputHybrid
                  value={submitFrom}
                  onChange={setSubmitFrom}
                  placeholder="Dari..."
                  className="w-full"
                  maxDate={submitTo}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">to</span>
                <DateInputHybrid
                  value={submitTo}
                  onChange={setSubmitTo}
                  placeholder="Sampai..."
                  className="w-full"
                  minDate={submitFrom}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                PCS Kirim
              </label>
              <input
                type="number"
                value={pcsKirim}
                onChange={(e) => setPcsKirim(e.target.value)}
                placeholder="Filter PCS..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-xl outline-none text-sm text-slate-700 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-500 font-semibold"
              />
            </div>

            {columns.map((c) => {
              const colId = String(c.id);
              if (EXCLUDED_FILTER_COLS.includes(colId)) return null;

              const isRegional = colId === "regional";
              const isSiteArea = colId === "siteArea";

              let isLocked = false;
              if (role === "sitearea" && (isRegional || isSiteArea))
                isLocked = true;
              if (role === "rm" && isRegional) isLocked = true;

              return (
                <div key={colId} className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                    {c.label}
                  </label>
                  <MultiSelectFilterDropdown
                    value={colFilters[colId] || []}
                    onChange={(val) =>
                      setColFilters((prev) => ({
                        ...prev,
                        [colId]: val,
                      }))
                    }
                    options={getOptionsForColumn(colId)}
                    placeholder={`Filter ${c.label}...`}
                    disabled={isLocked}
                  />
                </div>
              );
            })}
          </div>
        )}

        {showColumns && (
          <div className="mt-5 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">Pilih Kolom</p>
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
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
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
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
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
                      ? "bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        <div className="px-6 py-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-b border-gray-100 dark:border-slate-800">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {loading
              ? "Loading..."
              : error
                ? `Error: ${error}`
                : `Menampilkan ${pageRows.length} dari ${serverTotal} baris`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-2 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm outline-none"
            >
              {[25, 50, 100, 250].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-slate-800">
              <tr>
                {visibleColumns.map((c) => {
                  const isItemField = [
                    "namaProduk",
                    "pcs",
                    "pcsKirim",
                    "satuanKg",
                    "kg",
                    "hargaPcs",
                    "hargaKg",
                    "discount",
                    "nominal",
                    "rpTagih",
                  ].includes(String(c.id));
                  return (
                    <th
                      key={String(c.id)}
                      className={`px-4 py-3 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 ${isItemField ? "text-indigo-600 dark:text-indigo-400" : ""}`}
                    >
                      {c.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 uppercase">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {visibleColumns.map((c) => (
                      <td
                        key={`${i}-${String(c.id)}`}
                        className="px-4 py-3 whitespace-nowrap"
                      >
                        <div className="h-4 w-full min-w-[60px] bg-slate-100 dark:bg-slate-800 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-8 text-slate-500 dark:text-slate-400"
                    colSpan={Math.max(1, visibleColumns.length)}
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-[12px] border-b border-slate-50 dark:border-slate-800/50"
                  >
                    {visibleColumns.map((c) => {
                      const v = c.value(r);
                      const isStatus =
                        c.kind === "bool" ||
                        c.id.toString().startsWith("status");
                      const isItemField = [
                        "namaProduk",
                        "pcs",
                        "pcsKirim",
                        "satuanKg",
                        "kg",
                        "hargaPcs",
                        "hargaKg",
                        "discount",
                        "nominal",
                        "rpTagih",
                      ].includes(String(c.id));

                      const text =
                        c.kind === "number"
                          ? c.id === "nominal" ||
                            c.id === "rpTagih" ||
                            c.id === "hargaPcs" ||
                            c.id === "hargaKg" ||
                            c.id === "discount"
                            ? formatCurrency(Number(v) || 0)
                            : formatNumber(Number(v) || 0)
                          : c.kind === "date"
                            ? v
                              ? formatDateId(v)
                              : "-"
                            : String(v ?? "-") || "-";

                      const filterVal = colFilters[String(c.id)] || [];
                      const highlightTerm =
                        query && filterVal.length === 0 && c.kind === "text"
                          ? query
                          : filterVal;

                      return (
                        <td
                          key={String(c.id)}
                          className={`px-4 py-3 whitespace-nowrap ${
                            isItemField ? "bg-indigo-50/30 dark:bg-indigo-500/5" : ""
                          } ${
                            c.kind === "number" && c.id !== "no"
                              ? "text-right"
                              : ""
                          } ${c.id === "no" ? "text-center font-semibold text-slate-500 dark:text-slate-400" : ""} ${
                            c.id === "expiredTgl"
                              ? "text-rose-600 dark:text-rose-400 font-bold"
                              : c.id !== "no"
                                ? "text-slate-800 dark:text-slate-200"
                                : ""
                          }`}
                        >
                          {c.id === "linkPo" ? (
                            v && String(v).trim() && String(v) !== "-" ? (
                              <a
                                href={String(v)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                              >
                                <ExternalLink size={16} />
                              </a>
                            ) : (
                              "-"
                            )
                          ) : isStatus ? (
                            <StatusBadge
                              label={c.label.toUpperCase()}
                              checked={!!v}
                            />
                          ) : c.kind === "text" && highlightTerm ? (
                            <HighlightText
                              text={text}
                              highlight={highlightTerm}
                            />
                          ) : (
                            text
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 mb-2 px-2">
          <GlobalPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemsCount={pageRows.length}
            totalItems={serverTotal}
            itemName="baris"
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-lg font-black text-[9px] border ${
        checked
          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
          : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800"
      }`}
    >
      {label}
    </span>
  );
}

function HighlightText({
  text,
  highlight,
}: {
  text: string;
  highlight: string | string[];
}) {
  const hArr = Array.isArray(highlight) ? highlight : [highlight];
  const validH = hArr.map(h => String(h || "").trim()).filter(Boolean);
  if (validH.length === 0) return <>{text}</>;
  
  const escaped = validH.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            className="bg-yellow-200 dark:bg-yellow-500/20 text-yellow-900 dark:text-yellow-200 px-0.5 rounded"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
