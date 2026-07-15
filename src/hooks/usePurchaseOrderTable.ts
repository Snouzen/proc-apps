import { useState, useMemo, useRef, useCallback } from "react";

interface Retailer {
  id: string;
  namaPt: string;
  inisial: string | null;
  tujuan: string | null;
}

export function usePurchaseOrderTable(retailers: Retailer[]) {
  const [loadingData, setLoadingData] = useState(false);
  const [poData, setPoData] = useState<any[] | null>(null);

  const [searchFilter, setSearchFilter] = useState("");
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [perPage, setPerPage] = useState("10");
  const [statusFilter, setStatusFilter] = useState("all");

  const [activeNamaPt, setActiveNamaPt] = useState<string>("");
  const [activeInisial, setActiveInisial] = useState<string>("");
  const [activeTujuan, setActiveTujuan] = useState<string>("");
  const [activeRegional, setActiveRegional] = useState<string>("");
  const [activeSiteArea, setActiveSiteArea] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const lastCtrlRef = useRef<AbortController | null>(null);

  const handleFetchData = useCallback(
    async (selectedNamaPt: string, selectedInisial: string, selectedTujuan: string, selectedRegional?: string, selectedSiteArea?: string) => {
      if (!selectedNamaPt && !selectedRegional && !selectedSiteArea) return;

      setLoadingData(true);
      setPoData(null);
      if (lastCtrlRef.current) lastCtrlRef.current.abort();
      
      const ctrl = new AbortController();
      lastCtrlRef.current = ctrl;

      try {
        let allIds = "";
        if (selectedNamaPt) {
          const ritelsToFetch = selectedInisial
            ? retailers.filter((r) => r.namaPt === selectedNamaPt && r.inisial === selectedInisial)
            : retailers.filter((r) => r.namaPt === selectedNamaPt);
          allIds = ritelsToFetch.map((r) => r.id).join(",");
        }

        let url = `/api/po?summary=true`;
        if (allIds) url += `&retailerId=${encodeURIComponent(allIds)}`;
        if (selectedRegional) url += `&regional=${encodeURIComponent(selectedRegional)}`;
        if (selectedSiteArea) url += `&siteArea=${encodeURIComponent(selectedSiteArea)}`;
        
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        const json = await res.json();
        const combinedList = Array.isArray(json) ? json : json?.data || [];

        setPoData(combinedList);
        setActiveNamaPt(selectedNamaPt);
        setActiveInisial(selectedInisial);
        setActiveTujuan(selectedTujuan);
        setActiveRegional(selectedRegional || "");
        setActiveSiteArea(selectedSiteArea || "");
        setCurrentPage(1);
      } catch (e: any) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setLoadingData(false);
      }
    },
    [retailers]
  );

  const handleDelete = useCallback(
    async (noPo: string) => {
      setDeleting(true);
      try {
        await fetch(`/api/po?noPo=${encodeURIComponent(noPo)}`, { method: "DELETE" });
        await handleFetchData(activeNamaPt, activeInisial, activeTujuan, activeRegional, activeSiteArea);
        setConfirmDelete(null);
      } catch (e) {
        alert("Gagal menghapus PO");
      } finally {
        setDeleting(false);
      }
    },
    [handleFetchData, activeNamaPt, activeInisial, activeTujuan, activeRegional, activeSiteArea]
  );

  const stats = useMemo(() => {
    if (!poData || poData.length === 0) return null;
    const totalPo = poData.length;
    const totalNominal = poData.reduce((acc, po) => acc + (Number(po.totalNominal) || 0), 0);
    const totalItems = poData.reduce((acc, po) => acc + (Number(po.pcsTotal) || 0), 0);
    return { totalPo, totalNominal, totalItems };
  }, [poData]);

  const toDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const isCompleted = (po: any) => {
    const inv = String(po?.noInvoice || "").trim();
    return inv.length > 0 && inv !== "-" && inv.toLowerCase() !== "unknown";
  };

  const daysUntil = (d: Date | null) => {
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const filteredPo = useMemo(() => {
    if (!poData) return [];
    let data = [...poData];

    const q = searchFilter.toLowerCase().trim();
    if (q) {
      data = data.filter((po) =>
        (po.noPo || "").toLowerCase().includes(q) ||
        (po.noInvoice || "").toLowerCase().includes(q)
      );
    }

    const tujuanQ = activeTujuan.toLowerCase().trim();
    if (tujuanQ) {
      data = data.filter((po) => (po.tujuanDetail || "").toLowerCase().includes(tujuanQ));
    }
    
    const regionalQ = activeRegional.toLowerCase().trim();
    if (regionalQ) {
      data = data.filter((po) => (po.regional || "").toLowerCase().includes(regionalQ));
    }
    
    const siteAreaQ = activeSiteArea.toLowerCase().trim();
    if (siteAreaQ) {
      data = data.filter((po) => {
        const site = po.UnitProduksi?.siteArea || "";
        return site.toLowerCase().includes(siteAreaQ);
      });
    }

    if (tglFrom) {
      const fromDate = new Date(tglFrom);
      fromDate.setHours(0, 0, 0, 0);
      data = data.filter((po) => new Date(po.tglPo) >= fromDate);
    }
    
    if (tglTo) {
      const toDateObj = new Date(tglTo);
      toDateObj.setHours(23, 59, 59, 999);
      data = data.filter((po) => new Date(po.tglPo) <= toDateObj);
    }

    if (statusFilter !== "all") {
      data = data.filter((po) => {
        if (statusFilter === "tagih") {
          return !!po.buktiTagih;
        }
        if (statusFilter === "paid") {
          return !!po.buktiBayar || po.statusBayar === true;
        }
        return true;
      });
    }

    data.sort((a, b) => {
      const dateA = new Date(a.tglPo || 0).getTime();
      const dateB = new Date(b.tglPo || 0).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return data;
  }, [poData, searchFilter, tglFrom, tglTo, sortOrder, statusFilter, activeTujuan, activeRegional, activeSiteArea]);

  const limitData = perPage === "all" ? filteredPo.length || 1 : parseInt(perPage, 10);
  const totalPages = Math.ceil(filteredPo.length / limitData) || 1;

  const paginatedPo = useMemo(() => {
    if (perPage === "all") return filteredPo;
    const limit = parseInt(perPage, 10);
    const start = (currentPage - 1) * limit;
    return filteredPo.slice(start, start + limit);
  }, [filteredPo, perPage, currentPage]);

  const setManualData = (data: any[], namaPt: string, inisial: string) => {
    setPoData(data);
    setActiveNamaPt(namaPt);
    setActiveInisial(inisial);
    setActiveTujuan("");
    setActiveRegional("");
    setActiveSiteArea("");
    setCurrentPage(1);
  };

  return {
    loadingData,
    poData,
    stats,
    paginatedPo,
    filteredPo,
    limitData,
    totalPages,
    
    searchFilter, setSearchFilter,
    tglFrom, setTglFrom,
    tglTo, setTglTo,
    sortOrder, setSortOrder,
    perPage, setPerPage,
    statusFilter, setStatusFilter,
    
    currentPage, setCurrentPage,
    
    handleFetchData,
    setManualData,
    setLoadingData,
    
    deleting,
    confirmDelete, setConfirmDelete,
    handleDelete,
    
    activeNamaPt,
    activeInisial,
    activeTujuan,
    activeRegional,
    activeSiteArea,
  };
}
