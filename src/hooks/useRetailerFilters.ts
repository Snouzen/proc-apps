import { useState, useEffect, useMemo } from "react";

export type Retailer = {
  id: string;
  namaPt: string;
  inisial: string | null;
  tujuan: string | null;
};

export type UnitProduksi = {
  idRegional: string;
  namaRegional: string;
  siteArea: string;
};

export function useRetailerFilters() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [unitProduksis, setUnitProduksis] = useState<UnitProduksi[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [selectedNamaPt, setSelectedNamaPt] = useState<string>("");
  const [selectedInisial, setSelectedInisial] = useState<string>("");
  const [selectedTujuan, setSelectedTujuan] = useState<string>("");
  
  const [selectedRegional, setSelectedRegional] = useState<string>("");
  const [selectedSiteArea, setSelectedSiteArea] = useState<string>("");

  const [openRitel, setOpenRitel] = useState(false);
  const [openInisial, setOpenInisial] = useState(false);
  const [openTujuan, setOpenTujuan] = useState(false);
  
  const [openRegional, setOpenRegional] = useState(false);
  const [openSiteArea, setOpenSiteArea] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/ritel").then((res) => res.json()),
      fetch("/api/unit-produksi").then((res) => res.json()),
    ])
      .then(([ritelJson, unitJson]) => {
        const ritelList = Array.isArray(ritelJson) ? ritelJson : ritelJson?.data || [];
        const unitList = Array.isArray(unitJson) ? unitJson : unitJson?.data || [];
        setRetailers(ritelList);
        setUnitProduksis(unitList);
      })
      .catch((err) => console.error("Failed to fetch filters data:", err))
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

  const availableRegionals = useMemo(() => {
    const regionals = unitProduksis.map((u) => u.namaRegional).filter(Boolean) as string[];
    return Array.from(new Set(regionals)).sort();
  }, [unitProduksis]);

  const availableSiteAreas = useMemo(() => {
    let validUnits = unitProduksis;
    if (selectedRegional) {
      validUnits = validUnits.filter((u) => u.namaRegional === selectedRegional);
    }
    const sites = validUnits.map((u) => u.siteArea).filter(Boolean) as string[];
    return Array.from(new Set(sites)).sort();
  }, [selectedRegional, unitProduksis]);

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
  
  const handleSelectRegional = (regional: string) => {
    setSelectedRegional(regional);
    setSelectedSiteArea("");
    setOpenRegional(false);
  };

  const handleSelectSiteArea = (siteArea: string) => {
    setSelectedSiteArea(siteArea);
    setOpenSiteArea(false);
  };

  return {
    retailers,
    unitProduksis,
    isInitialLoad,
    
    selectedNamaPt,
    selectedInisial,
    selectedTujuan,
    selectedRegional,
    selectedSiteArea,
    
    handleSelectNamaPt,
    handleSelectInisial,
    handleSelectTujuan,
    handleSelectRegional,
    handleSelectSiteArea,
    
    openRitel, setOpenRitel,
    openInisial, setOpenInisial,
    openTujuan, setOpenTujuan,
    openRegional, setOpenRegional,
    openSiteArea, setOpenSiteArea,
    
    availableInisials,
    availableTujuans,
    availableRegionals,
    availableSiteAreas,
  };
}
