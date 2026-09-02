"use client";

import { useEffect, useState, useMemo } from "react";
import type { Retailer } from "@/lib/credit-limit";

export function useCreditLimitFilters() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedNamaPt, setSelectedNamaPt] = useState<string>("");
  const [selectedInisial, setSelectedInisial] = useState<string>("");
  const [selectedTujuan, setSelectedTujuan] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const [openRitel, setOpenRitel] = useState(false);
  const [openInisial, setOpenInisial] = useState(false);
  const [openTujuan, setOpenTujuan] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);

  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");

  const [search, setSearch] = useState("");

  // Fetch Master Ritel (Hanya 1x saat mount)
  useEffect(() => {
    fetch("/api/ritel")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json?.data || [];
        setRetailers(list);
      })
      .catch((err) => console.error("Failed to fetch ritel:", err));
  }, []);

  // Filter inisial unik dari Nama PT yang dipilih
  const availableInisials = useMemo(() => {
    if (!selectedNamaPt) return [];
    const samePtRetailers = retailers.filter((r) => r.namaPt === selectedNamaPt);
    const inisials = samePtRetailers.map((r) => r.inisial).filter(Boolean) as string[];
    return Array.from(new Set(inisials)).sort();
  }, [selectedNamaPt, retailers]);

  // Filter tujuan unik dari Nama PT dan Inisial yang dipilih
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

  return {
    retailers,
    selectedNamaPt, setSelectedNamaPt,
    selectedInisial, setSelectedInisial,
    selectedTujuan, setSelectedTujuan,
    selectedStatus, setSelectedStatus,
    openRitel, setOpenRitel,
    openInisial, setOpenInisial,
    openTujuan, setOpenTujuan,
    openStatus, setOpenStatus,
    tglFrom, setTglFrom,
    tglTo, setTglTo,
    search, setSearch,
    availableInisials,
    availableTujuans,
  };
}
