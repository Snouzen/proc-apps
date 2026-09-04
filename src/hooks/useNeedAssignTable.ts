import { useState, useCallback, useEffect, useRef } from "react";
import { RoleType } from "./useAuthData";

export interface NeedAssignRow {
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
  remarks: string | null;
  buktiTagih?: string | null;
  buktiBayar?: string | null;
  pcsTotal?: number | null;
  firstProductName?: string | null;
  itemsCount?: number | null;
  Items: any[];
  UnitProduksi?: any;
  RitelModern?: any;
}

export interface EditedState {
  regional?: string;
  siteArea?: string;
  saving?: boolean;
  error?: string | null;
  ok?: boolean;
}

interface UseNeedAssignTableProps {
  role: RoleType;
  regional: string | null;
}

export function useNeedAssignTable({ role, regional }: UseNeedAssignTableProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NeedAssignRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [edited, setEdited] = useState<Record<string, EditedState>>({});
  
  const lastCtrlRef = useRef<AbortController | null>(null);

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

  const fetchData = useCallback(async () => {
    if (!role) return;
    if (typeof document !== "undefined" && !document.hasFocus()) return;
    
    setLoading(true);
    setIsTransitioning(true);
    
    if (lastCtrlRef.current) {
      try { lastCtrlRef.current.abort(); } catch {}
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
        throw new Error((json as any)?.error || res.statusText || "Gagal mengambil data PO");
      }
      
      const list = Array.isArray((json as any)?.data)
        ? (json as any).data
        : Array.isArray(json)
          ? (json as any)
          : [];
          
      setRows(list as NeedAssignRow[]);
      setTotal(Number((json as any)?.total) || list.length);
      setError(null);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal mengambil data PO");
    } finally {
      clearTimeout(timer);
      setLoading(false);
      setIsTransitioning(false);
    }
  }, [debouncedSearch, page, regional, role, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (lastCtrlRef.current) {
        try { lastCtrlRef.current.abort(); } catch {}
      }
    };
  }, []);

  return {
    loading,
    rows, setRows,
    error,
    page, setPage,
    rowsPerPage, setRowsPerPage,
    total, setTotal,
    search, setSearch,
    debouncedSearch,
    isTransitioning,
    edited, setEdited,
    fetchData
  };
}
