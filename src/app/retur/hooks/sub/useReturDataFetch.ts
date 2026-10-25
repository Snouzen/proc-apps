import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getMe } from "@/lib/me";

interface UseReturDataFetchParams {
  page: number;
  setPage: (p: number) => void;
  rowsPerPage: number;
  debouncedSearch: string;
  selectedRetailerId: string | null;
  setIsGroupedMode: (v: boolean) => void;
  filterInisial: string;
  filterToko: string;
  filterLokasi: string;
  dateFrom: string | null;
  dateTo: string | null;
  selectedStatus: string | null;
}

export function useReturDataFetch({
  page,
  setPage,
  rowsPerPage,
  debouncedSearch,
  selectedRetailerId,
  setIsGroupedMode,
  filterInisial,
  filterToko,
  filterLokasi,
  dateFrom,
  dateTo,
  selectedStatus,
}: UseReturDataFetchParams) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [totalNominal, setTotalNominal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | "magang" | null>(null);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);
  
  const [retailers, setRetailers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  const [stats, setStats] = useState({
    sudah_diambil: 0,
    belum_diambil: 0,
    dimusnahkan: 0,
    total: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ritel").then(res => res.json()),
      fetch("/api/product").then(res => res.json()),
      fetch("/api/unit-produksi").then(res => res.json()),
      getMe()
    ]).then(([ritelJson, productJson, unitJson, me]) => {
      setRetailers(Array.isArray(ritelJson) ? ritelJson : (ritelJson?.data || []));
      setProducts(Array.isArray(productJson) ? productJson : (productJson?.data || []));
      setUnits(Array.isArray(unitJson) ? unitJson : (unitJson?.data || []));
      if (me?.authenticated) {
        let r = (me.role as any) || null;
        if (r === "pic_site") r = "sitearea";
        setRole(r as any);
        setUserRegional(me.regional || null);
        const parsedUnits = Array.isArray(unitJson) ? unitJson : (unitJson?.data || []);
        if (me.siteArea) {
          setUserArea(me.siteArea);
        } else if ((r === "sitearea") && me.email) {
          const emailPrefix = (me.email.split("@")[0] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const matchedUnit = parsedUnits.find((u: any) => {
            const sa = (u.siteArea || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return sa === emailPrefix;
          });
          setUserArea(matchedUnit?.siteArea || null);
        } else {
          setUserArea(null);
        }
      }
    });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedRetailerId) params.set("retailerId", selectedRetailerId);
      if (filterInisial) params.set("inisial", filterInisial);
      if (filterToko) params.set("toko", filterToko);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/retur/stats?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch (err) {
      console.error("Fetch Stats Error:", err);
    }
  }, [debouncedSearch, selectedRetailerId, filterInisial, filterToko, filterLokasi, dateFrom, dateTo]);

  const fetchRetur = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (data.length > 0) {
      setIsFetchingPage(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("page", String(page)); 
      params.set("limit", String(rowsPerPage));
      
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedRetailerId) params.set("retailerId", selectedRetailerId);
      
      if (filterInisial) params.set("inisial", filterInisial);
      if (filterToko) params.set("toko", filterToko);
      if (filterLokasi) params.set("lokasi", filterLokasi);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (selectedStatus) params.set("status", selectedStatus);

      const res = await fetch(`/api/retur?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });
      const json = await res.json();
      
      if (res.ok) {
        setIsGroupedMode(json.isGrouped);
        setData(json.data || []);
        setTotal(json.total || 0);
        setTotalQty(json.totalQty || 0);
        setTotalNominal(json.totalNominal || 0);
        setAvailableLocations(json.availableLocations || []);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Fetch Retur Error:", err);
      }
    } finally {
      setLoading(false);
      setIsFetchingPage(false);
      fetchStats();
    }
  }, [page, debouncedSearch, rowsPerPage, selectedRetailerId, filterInisial, filterToko, filterLokasi, dateFrom, dateTo, selectedStatus, fetchStats, setIsGroupedMode]);

  useEffect(() => {
    fetchRetur();
    fetchStats();
  }, [fetchRetur, fetchStats]);

  useEffect(() => {
    setData([]);
    setPage(1);
  }, [selectedRetailerId, setPage]);

  const filteredData = useMemo(() => data, [data]);
  const paginatedData = useMemo(() => data, [data]);
  const totalPages = Math.ceil(total / rowsPerPage);

  return {
    data,
    setData,
    total,
    totalQty,
    totalNominal,
    loading,
    isFetchingPage,
    setIsFetchingPage,
    role,
    userArea,
    userRegional,
    retailers,
    products,
    units,
    availableLocations,
    stats,
    abortControllerRef,
    fetchStats,
    fetchRetur,
    filteredData,
    paginatedData,
    totalPages,
  };
}
