import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { upperClean } from "@/lib/text";
import { getMe } from "@/lib/me";

// Lazy-loaded XLSX
const getXLSX = () => import("xlsx");

export type Row = {
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

export type Column = {
  id: keyof Row | string;
  label: string;
  kind: "text" | "number" | "date" | "bool";
  defaultVisible: boolean;
  value: (r: Row) => unknown;
};

export const toDate = (d: any) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

export const toYMD = (d: any) => {
  const dt = toDate(d);
  if (!dt) return "";
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const day = `${dt.getDate()}`.padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
};

export const formatDateId = (d: any) => {
  const dt = toDate(d);
  if (!dt) return "-";
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

export const EXCLUDED_FILTER_COLS = [
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

export function useReport() {
  const [raw, setRaw] = useState<any[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [debouncedColFiltersJson, setDebouncedColFiltersJson] = useState<string>("{}");
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

          const rawEmailPrefix = me.email ? me.email.split("@")[0].toUpperCase() : "";
          let formattedSiteArea = rawEmailPrefix;
          if (rawEmailPrefix.startsWith("SPB") && rawEmailPrefix.length > 3) {
            formattedSiteArea = "SPB " + rawEmailPrefix.substring(3);
          } else if (rawEmailPrefix.startsWith("SPP") && rawEmailPrefix.length > 3) {
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
        if (mounted && Array.isArray(data)) setMasterCombinations(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const columns: Column[] = useMemo(() => [
    { id: "no", label: "No", kind: "number", defaultVisible: true, value: (r) => r.no },
    { id: "noPo", label: "No PO", kind: "text", defaultVisible: true, value: (r) => r.noPo },
    { id: "company", label: "Company", kind: "text", defaultVisible: true, value: (r) => r.company },
    { id: "inisial", label: "Inisial", kind: "text", defaultVisible: true, value: (r) => r.inisial },
    { id: "regional", label: "Regional", kind: "text", defaultVisible: true, value: (r) => r.regional },
    { id: "siteArea", label: "Site Area", kind: "text", defaultVisible: true, value: (r) => r.siteArea },
    { id: "tglPo", label: "Tgl PO", kind: "date", defaultVisible: true, value: (r) => r.tglPo },
    { id: "tglkirim", label: "Tgl Kirim", kind: "date", defaultVisible: true, value: (r) => r.tglkirim },
    { id: "expiredTgl", label: "Expired", kind: "date", defaultVisible: true, value: (r) => r.expiredTgl },
    { id: "noInvoice", label: "No Invoice", kind: "text", defaultVisible: true, value: (r) => r.noInvoice },
    { id: "buktiTagih", label: "Bukti Tagih", kind: "text", defaultVisible: true, value: (r) => r.buktiTagih },
    { id: "buktiBayar", label: "Bukti Bayar", kind: "text", defaultVisible: true, value: (r) => r.buktiBayar },
    { id: "linkPo", label: "Link PO", kind: "text", defaultVisible: true, value: (r) => r.linkPo },
    { id: "namaSupir", label: "Nama Supir", kind: "text", defaultVisible: true, value: (r) => r.namaSupir },
    { id: "platNomor", label: "Plat Nomor", kind: "text", defaultVisible: true, value: (r) => r.platNomor },
    { id: "tujuanDetail", label: "Tujuan Detail", kind: "text", defaultVisible: true, value: (r) => r.tujuanDetail },
    { id: "remarks", label: "Remarks", kind: "text", defaultVisible: true, value: (r) => r.remarks },
    { id: "statusKirim", label: "Kirim", kind: "bool", defaultVisible: true, value: (r) => r.statusKirim },
    { id: "statusPo", label: "PO", kind: "bool", defaultVisible: true, value: (r) => r.statusPo },
    { id: "statusInv", label: "Inv", kind: "bool", defaultVisible: true, value: (r) => r.statusInv },
    { id: "statusBayar", label: "Bayar", kind: "bool", defaultVisible: true, value: (r) => r.statusBayar },
    { id: "statusSdif", label: "SDIF", kind: "bool", defaultVisible: true, value: (r) => r.statusSdif },
    { id: "statusFp", label: "FP", kind: "bool", defaultVisible: true, value: (r) => r.statusFp },
    { id: "statusKwi", label: "Kwi", kind: "bool", defaultVisible: true, value: (r) => r.statusKwi },
    { id: "statusTagih", label: "Tagih", kind: "bool", defaultVisible: true, value: (r) => r.statusTagih },
    { id: "namaProduk", label: "Produk", kind: "text", defaultVisible: true, value: (r) => r.namaProduk },
    { id: "pcs", label: "PCS", kind: "number", defaultVisible: true, value: (r) => r.pcs },
    { id: "pcsKirim", label: "PCS Kirim", kind: "number", defaultVisible: true, value: (r) => r.pcsKirim },
    { id: "satuanKg", label: "Berat Satuan (Kg)", kind: "number", defaultVisible: true, value: (r) => r.satuanKg },
    { id: "kg", label: "Total Kg", kind: "number", defaultVisible: true, value: (r) => r.kg },
    { id: "hargaPcs", label: "Harga/Pcs", kind: "number", defaultVisible: true, value: (r) => r.hargaPcs },
    { id: "hargaKg", label: "Harga/Kg", kind: "number", defaultVisible: true, value: (r) => r.hargaKg },
    { id: "discount", label: "Diskon", kind: "number", defaultVisible: true, value: (r) => r.discount },
    { id: "nominal", label: "Nominal", kind: "number", defaultVisible: true, value: (r) => r.nominal },
    { id: "rpTagih", label: "Rp Tagih", kind: "number", defaultVisible: true, value: (r) => r.rpTagih },
  ], []);

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setVisibleCols((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      columns.forEach((c) => { next[String(c.id)] = c.defaultVisible; });
      return next;
    });
  }, [columns]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(String(query || "").trim()); }, 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => {
      const activeFilters = Object.entries(colFilters).filter(([, v]) => Array.isArray(v) && v.length > 0);
      if (activeFilters.length > 0) {
        setDebouncedColFiltersJson(JSON.stringify(Object.fromEntries(activeFilters)));
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
      try { lastCtrlRef.current.abort(); } catch {}
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
      requestAnimationFrame(() => { setServerTotal(Number(data?.total) || 0); });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal load data");
      setRaw([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedColFiltersJson, debouncedQuery, page, rowsPerPage, submitFrom, submitTo, tglFrom, tglTo, pcsKirim, role, userRegional, userSiteArea]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    return () => {
      if (lastCtrlRef.current) {
        try { lastCtrlRef.current.abort(); } catch {}
      }
    };
  }, []);

  const rows: Row[] = useMemo(() => {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.flatMap((po: any, poIndex: number) => {
      const items = Array.isArray(po?.Items) && po.Items.length > 0 ? po.Items : [null];
      return items.map((it: any, itemIndex: number) => ({
        no: (page - 1) * rowsPerPage + poIndex + 1,
        id: String(po?.id || po?.noPo || crypto.randomUUID()) + `-${itemIndex}`,
        noPo: upperClean(po?.noPo || "-"),
        company: upperClean(po?.RitelModern?.namaPt || po?.company || "-"),
        inisial: upperClean(po?.RitelModern?.inisial || po?.inisial || "-"),
        regional: (po?.regional || po?.UnitProduksi?.namaRegional || "-").trim().toUpperCase().replace(/\s+/g, " "),
        siteArea: upperClean(po?.UnitProduksi?.siteArea && po.UnitProduksi.siteArea.toUpperCase() !== "UNKNOWN" ? po.UnitProduksi.siteArea : "-"),
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
        nominal: Number(it?.nominal) || (Number(it?.pcs) || 0) * (Number(it?.hargaPcs) || 0),
        discount: Number(it?.discount) || 0,
        rpTagih: Number(it?.rpTagih) || 0,
        updatedAt: toYMD(po?.updatedAt),
        createdAt: toYMD(po?.createdAt),
        submitDate: toYMD(po?.createdAt || po?.updatedAt || po?.tglPo),
      }));
    });
  }, [raw, page, rowsPerPage]);

  const visibleColumns = useMemo(() => columns.filter((c) => visibleCols[String(c.id)]), [columns, visibleCols]);

  useEffect(() => { setPage(1); }, [debouncedQuery, tglFrom, tglTo, rowsPerPage, debouncedColFiltersJson, visibleCols, submitFrom, submitTo]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / rowsPerPage));
  const filteredRows = useMemo(() => {
    const q = upperClean(debouncedQuery);
    const filters: Record<string, string[]> = (() => {
      try {
        const obj = JSON.parse(debouncedColFiltersJson || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch { return {}; }
    })();
    const list = Array.isArray(rows) ? rows : [];
    if (!q && Object.keys(filters).length === 0) return list;
    return list.filter((r) => {
      if (q) {
        const hay = [r.noPo, r.company, r.inisial, r.tujuanDetail, r.siteArea, r.regional, r.noInvoice, r.namaProduk, r.namaSupir, r.platNomor].map((x) => upperClean(x)).join(" ");
        if (!hay.includes(q)) return false;
      }
      for (const [k, vArr] of Object.entries(filters)) {
        if (!Array.isArray(vArr) || vArr.length === 0) continue;
        const key = String(k);
        const cell = upperClean(String((r as any)[key] ?? ""));
        const match = vArr.some(v => cell.includes(upperClean(v)));
        if (!match) return false;
      }
      return true;
    });
  }, [debouncedColFiltersJson, debouncedQuery, rows]);

  const pageRows = filteredRows;

  const getOptionsForColumn = useCallback((colId: string) => {
    const mappedColId = colId === "namaProduk" ? "products" : colId === "tujuanDetail" ? "tujuan" : colId;
    const activeFilters = Object.entries(colFilters).filter(([k, v]) => String(k) !== String(colId) && Array.isArray(v) && v.length > 0);
    const validCombos = masterCombinations.filter((combo) => {
      return activeFilters.every(([k, vArr]) => {
        const comboKey = k === "namaProduk" ? "products" : k === "tujuanDetail" ? "tujuan" : k;
        const comboVal = combo[comboKey];
        if (Array.isArray(comboVal)) {
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
        val.forEach((v) => { const str = String(v || "").trim(); if (str) uniqueValues.add(str); });
      } else {
        const str = String(val ?? "").trim();
        if (str) uniqueValues.add(str);
      }
    });

    const rawList = Array.from(uniqueValues);
    const isNumber = columns.find((c) => String(c.id) === colId)?.kind === "number";
    if (isNumber) {
      rawList.sort((a, b) => Number(a) - Number(b));
    } else {
      rawList.sort((a, b) => a.localeCompare(b));
    }
    return rawList;
  }, [masterCombinations, colFilters, columns]);

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
    const cols = visibleColumns.some((c) => String(c.id) === "products") || !productCol ? visibleColumns : [...visibleColumns, productCol];
    try {
      const baseParams = new URLSearchParams();
      baseParams.set("includeUnknown", "true");
      baseParams.set("includeItems", "true");
      if (query.trim()) baseParams.set("q", query.trim());
      if (tglFrom) baseParams.set("tglFrom", tglFrom);
      if (tglTo) baseParams.set("tglTo", tglTo);
      if (submitFrom) baseParams.set("submitFrom", submitFrom);
      if (submitTo) baseParams.set("submitTo", submitTo);

      const activeFilters = Object.entries(colFilters).filter(([, v]) => Array.isArray(v) && v.length > 0);
      if (activeFilters.length > 0) {
        baseParams.set("colFilters", JSON.stringify(Object.fromEntries(activeFilters)));
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
        const res = await fetch(`/api/po?${params.toString()}`, { cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.data) ? json.data : [];
        all.push(...list);
        if (list.length < chunk) break;
      }

      let currentRowNo = 0;
      const mapped: Row[] = (Array.isArray(all) ? all : []).flatMap((po: any) => {
        const items = Array.isArray(po?.Items) && po.Items.length > 0 ? po.Items : [null];
        return items.map((it: any, itemIndex: number) => {
          currentRowNo += 1;
          return {
            no: currentRowNo,
            id: String(po?.id || po?.noPo || crypto.randomUUID()) + `-${itemIndex}`,
            noPo: upperClean(po?.noPo || "-"),
            company: upperClean(po?.RitelModern?.namaPt || po?.company || "-"),
            inisial: upperClean(po?.RitelModern?.inisial || po?.inisial || ""),
            regional: upperClean(po?.regional || po?.UnitProduksi?.namaRegional || ""),
            siteArea: upperClean(po?.UnitProduksi?.siteArea && po.UnitProduksi.siteArea !== "UNKNOWN" ? po.UnitProduksi.siteArea : ""),
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
            nominal: Number(it?.nominal) || (Number(it?.pcs) || 0) * (Number(it?.hargaPcs) || 0),
            discount: Number(it?.discount) || 0,
            rpTagih: Number(it?.rpTagih) || 0,
            updatedAt: toYMD(po?.updatedAt),
            createdAt: toYMD(po?.createdAt),
            submitDate: toYMD(po?.createdAt || po?.updatedAt || po?.tglPo),
          };
        });
      });

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

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell || cell.t !== 'd') continue;
          cell.z = 'dd/mm/yyyy';
        }
      }

      ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
      (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomRight" };
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

  return {
    raw,
    serverTotal,
    loading,
    exporting,
    error,
    query, setQuery,
    tglFrom, setTglFrom,
    tglTo, setTglTo,
    showFilters, setShowFilters,
    showColumns, setShowColumns,
    rowsPerPage, setRowsPerPage,
    page, setPage,
    colFilters, setColFilters,
    submitFrom, setSubmitFrom,
    submitTo, setSubmitTo,
    pcsKirim, setPcsKirim,
    role,
    userRegional,
    userSiteArea,
    columns,
    visibleColumns,
    visibleCols, setVisibleCols,
    pageRows,
    totalPages,
    getOptionsForColumn,
    clearAllFilters,
    exportExcel,
    toggleCol,
    fetchData,
  };
}
