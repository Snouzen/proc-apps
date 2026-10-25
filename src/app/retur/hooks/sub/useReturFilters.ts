import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

export function useReturFilters(retailers: any[] = []) {
  const searchParams = useSearchParams();
  const initialRitelId = searchParams.get("ritelId");

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [isGroupedMode, setIsGroupedMode] = useState(true);
  const [filterInisial, setFilterInisial] = useState("");
  const [filterToko, setFilterToko] = useState("");
  const [filterLokasi, setFilterLokasi] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (initialRitelId) {
      setSelectedRetailerId(initialRitelId);
      setIsGroupedMode(false);
    }
  }, [initialRitelId]);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setSelectedStatus(statusParam.toUpperCase());
      setPage(1);
    }
  }, [searchParams]);

  const filterOptions = useMemo(() => {
    if (!selectedRetailerId || retailers.length === 0) return { inisials: [], tokos: [] };
    const r = retailers.find(x => x.id === selectedRetailerId);
    if (!r) return { inisials: [], tokos: [] };
    
    const pt = r.namaPt.trim().toLowerCase();
    const related = retailers.filter(x => x.namaPt.trim().toLowerCase() === pt);
    
    return {
      inisials: Array.from(new Set(related.map(x => x.inisial).filter(Boolean))) as string[],
      tokos: Array.from(new Set(related.map(x => x.tujuan).filter(Boolean))) as string[],
    };
  }, [selectedRetailerId, retailers]);

  return {
    searchParams,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    search,
    setSearch,
    debouncedSearch,
    selectedRetailerId,
    setSelectedRetailerId,
    isGroupedMode,
    setIsGroupedMode,
    filterInisial,
    setFilterInisial,
    filterToko,
    setFilterToko,
    filterLokasi,
    setFilterLokasi,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedStatus,
    setSelectedStatus,
    filterOptions,
  };
}
