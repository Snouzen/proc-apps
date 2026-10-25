import { getRegionalSynonyms } from "@/lib/utils/regional";
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

export function useRetailerFilters(scope?: { role: string | null; regional: string | null; siteArea: string | null }) {
  const regionalLocked = Boolean(scope?.role && scope.role !== "pusat");
  const siteAreaLocked = Boolean(scope?.role && !["pusat", "rm"].includes(scope.role));
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
    setSelectedRegional(regionalLocked ? scope?.regional || "" : "");
    setSelectedSiteArea(siteAreaLocked ? scope?.siteArea || "" : "");
  }, [scope?.role, scope?.regional, scope?.siteArea, regionalLocked, siteAreaLocked]);

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
    const samePtRetailers = retailers.filter((r) => !selectedNamaPt || r.namaPt === selectedNamaPt);
    const inisials = samePtRetailers.map((r) => r.inisial).filter(Boolean) as string[];
    return Array.from(new Set(inisials)).sort();
  }, [selectedNamaPt, retailers]);

  const availableTujuans = useMemo(() => {
    const validRetailers = retailers.filter((r) => {
      if (selectedNamaPt && r.namaPt !== selectedNamaPt) return false;
      if (selectedInisial && r.inisial !== selectedInisial) return false;
      return true;
    });
    const tujuans = validRetailers.map((r) => r.tujuan).filter(Boolean) as string[];
    return Array.from(new Set(tujuans)).sort();
  }, [selectedNamaPt, selectedInisial, retailers]);

  const availableRegionals = useMemo(() => {
    const regionals = unitProduksis.filter(u => !regionalLocked || getRegionalSynonyms(u.namaRegional).some(name => getRegionalSynonyms(scope?.regional || "").includes(name))).map((u) => u.namaRegional).filter(Boolean) as string[];
    return Array.from(new Set(regionals)).sort();
  }, [unitProduksis, regionalLocked, scope?.regional]);

  const availableSiteAreas = useMemo(() => {
    let validUnits = unitProduksis;
    if (selectedRegional) {
      validUnits = validUnits.filter((u) => getRegionalSynonyms(u.namaRegional).some(name => getRegionalSynonyms(selectedRegional).includes(name)));
    }
    if (siteAreaLocked) validUnits = validUnits.filter(u => (scope?.siteArea || "").split(",").map(s => s.trim().toLowerCase()).includes(u.siteArea.toLowerCase()));
    const sites = validUnits.map((u) => u.siteArea).filter(Boolean) as string[];
    return Array.from(new Set(sites)).sort();
  }, [selectedRegional, unitProduksis, siteAreaLocked, scope?.siteArea]);

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
    if (regionalLocked) return;
    setSelectedRegional(regional);
    setSelectedSiteArea("");
    setOpenRegional(false);
  };

  const handleSelectSiteArea = (siteArea: string) => {
    if (siteAreaLocked) return;
    setSelectedSiteArea(siteArea);
    setOpenSiteArea(false);
  };

  return {
    regionalLocked, siteAreaLocked,
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
