import { useState, useEffect, useMemo } from "react";

export type Retailer = {
  id: string;
  namaPt: string;
  inisial: string | null;
  tujuan: string | null;
};

export function useRetailerFilters() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [selectedNamaPt, setSelectedNamaPt] = useState<string>("");
  const [selectedInisial, setSelectedInisial] = useState<string>("");
  const [selectedTujuan, setSelectedTujuan] = useState<string>("");

  const [openRitel, setOpenRitel] = useState(false);
  const [openInisial, setOpenInisial] = useState(false);
  const [openTujuan, setOpenTujuan] = useState(false);

  useEffect(() => {
    fetch("/api/ritel")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json?.data || [];
        setRetailers(list);
      })
      .catch((err) => console.error("Failed to fetch retailers:", err))
      .finally(() => setIsInitialLoad(false));
  }, []);

  const availableInisials = useMemo(() => {
    if (!selectedNamaPt) return [];
    const samePtRetailers = retailers.filter((r) => r.namaPt === selectedNamaPt);
    const inisials = samePtRetailers.map((r) => r.inisial).filter(Boolean) as string[];
    return Array.from(new Set(inisials)).sort();
  }, [selectedNamaPt, retailers]);

  const availableTujuans = useMemo(() => {
    if (!selectedNamaPt) return [];
    const validRetailers = retailers.filter((r) => {
      if (r.namaPt !== selectedNamaPt) return false;
      if (selectedInisial && r.inisial !== selectedInisial) return false;
      return true;
    });
    const tujuans = validRetailers.map((r) => r.tujuan).filter(Boolean) as string[];
    return Array.from(new Set(tujuans)).sort();
  }, [selectedNamaPt, selectedInisial, retailers]);

  const handleSelectNamaPt = (namaPt: string) => {
    setSelectedNamaPt(namaPt);
    setSelectedInisial("");
    setSelectedTujuan("");
    setOpenRitel(false);
  };

  const handleSelectInisial = (inisial: string) => {
    setSelectedInisial(inisial);
    setSelectedTujuan("");
    setOpenInisial(false);
  };

  const handleSelectTujuan = (tujuan: string) => {
    setSelectedTujuan(tujuan);
    setOpenTujuan(false);
  };

  return {
    retailers,
    isInitialLoad,
    
    selectedNamaPt,
    selectedInisial,
    selectedTujuan,
    handleSelectNamaPt,
    handleSelectInisial,
    handleSelectTujuan,
    
    openRitel, setOpenRitel,
    openInisial, setOpenInisial,
    openTujuan, setOpenTujuan,
    
    availableInisials,
    availableTujuans,
  };
}
