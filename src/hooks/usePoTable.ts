import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { RoleType } from "./useAuthData";

interface UsePoTableProps {
  role: RoleType;
  regional: string | null;
  siteArea: string | null;
  initialGroup?: "all" | "active" | "assign" | "almost_expired" | "expired" | "completed";
}

export function usePoTable({ role, regional, siteArea, initialGroup = "all" }: UsePoTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [group, setGroup] = useState<"all" | "active" | "assign" | "almost_expired" | "expired" | "completed">(initialGroup);
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [rowsPerPage, setRowsPerPage] = useState(() => Number(searchParams.get("limit")) || 10);
  
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortDesc, setSortDesc] = useState(true);
  const [alphaSort, setAlphaSort] = useState<"none" | "asc" | "desc">("none");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [regionalFilter, setRegionalFilter] = useState("");
  const [siteAreaFilter, setSiteAreaFilter] = useState("");

  const [poLoadError, setPoLoadError] = useState<string | null>(null);
  const [allPoData, setAllPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Sync page and limit to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (Number(params.get("page")) !== page) {
      params.set("page", page.toString());
      changed = true;
    }
    if (Number(params.get("limit")) !== rowsPerPage) {
      params.set("limit", rowsPerPage.toString());
      changed = true;
    }

    if (changed) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [page, rowsPerPage, pathname, router, searchParams]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo, regionalFilter, siteAreaFilter, group, alphaSort, sortDesc, columnFilters, sorting]);

  const fetchTable = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("includeUnknown", "true");
      params.set("summary", "true");
      params.set("includeItems", "false");
      params.set("group", group);
      params.set("limit", String(rowsPerPage));
      params.set("offset", String(Math.max(0, (page - 1) * rowsPerPage)));
      
      if ((role === "rm" || role === "sitearea") && regional) {
        params.set("regional", regional);
      }
      if (role === "sitearea" && siteArea) {
        params.set("siteArea", siteArea);
      }
      if (regionalFilter) params.set("regional", regionalFilter);
      if (siteAreaFilter) params.set("siteArea", siteAreaFilter);
      if (dateFrom) params.set("tglFrom", dateFrom);
      if (dateTo) params.set("tglTo", dateTo);
      if (debouncedSearch) params.set("q", debouncedSearch);
      
      if (columnFilters.length > 0) {
        const filtersRecord: Record<string, string[]> = {};
        for (const f of columnFilters) {
          filtersRecord[f.id] = [String(f.value)];
        }
        params.set("colFilters", JSON.stringify(filtersRecord));
      }
      
      let sort = alphaSort !== "none"
        ? alphaSort === "asc"
          ? "company_asc"
          : "company_desc"
        : sortDesc
          ? "tglPo_desc"
          : "tglPo_asc";
          
      if (sorting.length > 0) {
        sort = `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`;
      }
      
      params.set("sort", sort);
      
      const res = await fetch(`/api/po?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        signal,
      });
      
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        throw new Error((json as any)?.error || res.statusText || "Gagal mengambil data PO");
      }
      
      let list: any[] = [];
      if (Array.isArray((json as any)?.data)) list = (json as any).data;
      else if (Array.isArray((json as any)?.rows)) list = (json as any).rows;
      else if (Array.isArray((json as any)?.items)) list = (json as any).items;
      else if (Array.isArray(json)) list = json as any[];
      else if (json && typeof json === "object") {
        const arrLike = Object.values(json).find((v) => Array.isArray(v));
        if (Array.isArray(arrLike)) list = arrLike as any[];
      }
      
      const total = Number((json as any)?.total) || list.length;
      return { list, total };
    } catch (e) {
      return { list: [], total: 0, error: e instanceof Error ? e.message : "Gagal mengambil data PO" };
    }
  }, [
    role, regional, group, dateFrom, dateTo, debouncedSearch,
    regionalFilter, siteAreaFilter, siteArea, page, rowsPerPage,
    sortDesc, alphaSort, columnFilters, sorting,
  ]);

  useEffect(() => {
    if (!role) return;
    let active = true;
    const controller = new AbortController();
    
    if (allPoData.length === 0) {
      setLoading(true);
    } else {
      setIsFetchingPage(true);
    }

    const timer = setTimeout(() => {
      if (active) {
        fetchTable(controller.signal).then((out) => {
          if (!active || !out) return;
          if ((out as any).error) {
            setPoLoadError((out as any).error as string);
          } else {
            setAllPoData(out.list || []);
            setServerTotal(out.total || 0);
            setPoLoadError(null);
          }
          setLoading(false);
          setIsFetchingPage(false);
        });
      }
    }, 100);
    
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    role, group, dateFrom, dateTo, debouncedSearch,
    regionalFilter, siteAreaFilter, sortDesc, alphaSort,
    page, rowsPerPage, fetchTable,
  ]);

  const handleSearchChange = useCallback((v: string) => setDebouncedSearch(v), []);

  const handleFilterChange = useCallback((next: any) => {
    if (typeof next.dateFrom === "string") setDateFrom(next.dateFrom);
    if (typeof next.dateTo === "string") setDateTo(next.dateTo);
    if (typeof next.regionalValue === "string") setRegionalFilter(next.regionalValue);
    if (typeof next.siteAreaValue === "string") setSiteAreaFilter(next.siteAreaValue);
  }, []);

  return {
    group, setGroup,
    page, setPage,
    rowsPerPage, setRowsPerPage,
    dateFrom, dateTo,
    sortDesc, setSortDesc,
    alphaSort, setAlphaSort,
    debouncedSearch, handleSearchChange,
    regionalFilter, siteAreaFilter, handleFilterChange,
    poLoadError, setPoLoadError,
    allPoData, setAllPoData,
    loading, isFetchingPage,
    serverTotal, setServerTotal,
    fetchTable,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
  };
}
