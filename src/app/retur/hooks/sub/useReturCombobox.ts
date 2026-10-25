import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface UseReturComboboxParams {
  router: AppRouterInstance;
  retailers: any[];
  products: any[];
  units: any[];
  data: any[];
  selectedRetailerId: string | null;
  editingId: string | null;
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  isMassEditing: boolean;
  searchToko: string;
  searchProduk: string;
  searchLokasi: string;
  searchPembebanan: string;
  searchInisial: string;
}

export function useReturCombobox({
  router,
  retailers,
  products,
  units,
  data,
  selectedRetailerId,
  editingId,
  editForm,
  setEditForm,
  isMassEditing,
  searchToko,
  searchProduk,
  searchLokasi,
  searchPembebanan,
  searchInisial,
}: UseReturComboboxParams) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState(1); 
  const [bulkRetailerId, setBulkRetailerId] = useState<string>("");
  const [searchRetailerText, setSearchRetailerText] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [openExcelModal, setOpenExcelModal] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addRetailerId, setAddRetailerId] = useState("");
  const [searchAddText, setSearchAddText] = useState("");
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportAll, setIsExportAll] = useState(false);

  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const selectedDetail = useMemo(() => data.find(d => d.id === viewDetailId), [data, viewDetailId]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLTableCellElement>(null);
  const comboboxInputRef = useRef<HTMLInputElement>(null);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (addDropdownRef.current && !addDropdownRef.current.contains(event.target as Node)) {
        setIsAddDropdownOpen(false);
      }
      if (comboRef.current && !comboRef.current.contains(event.target as Node)) {
        setIsListOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchRetailerText]);

  const handleSelectRetailer = (ritel: any) => {
    setBulkRetailerId(ritel.id);
    setSearchRetailerText(ritel.namaPt);
    setIsDropdownOpen(false);
    setActiveIndex(-1);
  };

  const handleOpenExportModal = useCallback((exportAll = false) => {
    setIsExportAll(exportAll);
    setShowExportModal(true);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  const handleExportExcel = useCallback(() => {
    handleOpenExportModal(false);
  }, [handleOpenExportModal]);

  const handleExportAll = useCallback(() => {
    handleOpenExportModal(true);
  }, [handleOpenExportModal]);

  const filteredRetailers = useMemo(() => {
    const unique = Array.from(new Map(retailers.map(r => [r.namaPt, r])).values());
    return unique.filter(r => 
      r.namaPt.toLowerCase().includes(searchRetailerText.toLowerCase())
    );
  }, [retailers, searchRetailerText]);

  const filteredInisial = useMemo(() => {
    if (retailers.length === 0) return [];
    if (!editingId && !isMassEditing) return [];

    let targetPt = "";
    if (isMassEditing && selectedRetailerId) {
      targetPt = retailers.find(r => r.id === selectedRetailerId)?.namaPt || "";
    } else {
      const item = data.find(d => d.id === editingId);
      targetPt = item?.RitelModern?.namaPt || retailers.find(r => r.id === item?.ritelId)?.namaPt || "";
    }

    if (!targetPt) return [];
    targetPt = targetPt.trim().toLowerCase();
    return Array.from(
      new Set(
        retailers
          .filter(r => r.namaPt.trim().toLowerCase() === targetPt && r.inisial)
          .map(r => r.inisial)
      )
    ).filter(i => i && i.toLowerCase().includes(searchInisial.toLowerCase())) as string[];
  }, [retailers, searchInisial, editingId, data, isMassEditing, selectedRetailerId]);

  const masterTujuanList = useMemo(() => {
    if (!selectedRetailerId || retailers.length === 0) return [];
    const currentRetailer = retailers.find(r => r.id === selectedRetailerId);
    if (!currentRetailer) return [];
    
    const list = retailers
      .filter(r => r.namaPt === currentRetailer.namaPt && r.tujuan)
      .map(r => r.tujuan);
      
    return Array.from(new Set(list));
  }, [selectedRetailerId, retailers]);

  const filteredTujuanItems = useMemo(() => {
    if (!editForm.namaCompany) return masterTujuanList;
    return masterTujuanList.filter(tj => 
      tj.toLowerCase().includes(editForm.namaCompany.toLowerCase())
    );
  }, [masterTujuanList, editForm.namaCompany]);

  const handleTujuanKeyDown = (e: React.KeyboardEvent) => {
    if (!isListOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsListOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredTujuanItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex !== -1 && filteredTujuanItems[activeIndex]) {
        setEditForm({ ...editForm, namaCompany: filteredTujuanItems[activeIndex] });
        setIsListOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsListOpen(false);
      setActiveIndex(-1);
    }
  };

  const PRIORITY_PRODUCTS = useMemo(() => ["PUNOKAWAN 5 KG", "BEFOOD SETRA RAMOS 5 KG"], []);

  const availableToko = useMemo(() => {
    if (retailers.length === 0) return [];
    
    let targetPt = "";
    if (isMassEditing && selectedRetailerId) {
      targetPt = retailers.find(r => r.id === selectedRetailerId)?.namaPt || "";
    } else {
      if (!editForm.id) return [];
      targetPt = editForm.RitelModern?.namaPt || "";
    }
    
    if (!targetPt) return [];

    return Array.from(new Set(
      retailers
        .filter(r => r.namaPt === targetPt && r.tujuan)
        .map(r => r.tujuan)
    ));
  }, [editForm.id, editForm.RitelModern, retailers, isMassEditing, selectedRetailerId]);

  const filteredToko = useMemo(() => 
    availableToko.filter(t => t.toLowerCase().includes(searchToko.toLowerCase())),
    [availableToko, searchToko]
  );

  const filteredProductsInline = useMemo(() => {
    const raw = products.filter(p => p.name.toLowerCase().includes(searchProduk.toLowerCase()));
    return raw.sort((a, b) => {
      const idxA = PRIORITY_PRODUCTS.indexOf(a.name.toUpperCase());
      const idxB = PRIORITY_PRODUCTS.indexOf(b.name.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, searchProduk, PRIORITY_PRODUCTS]);

  const filteredLokasi = useMemo(() => {
    if (!searchLokasi) return units;
    return units.filter(u => String(u.siteArea).toLowerCase().includes(searchLokasi.toLowerCase()));
  }, [units, searchLokasi]);

  const filteredPembebanan = useMemo(() => {
    if (!searchPembebanan) return units;
    return units.filter(u => String(u.siteArea).toLowerCase().includes(searchPembebanan.toLowerCase()));
  }, [units, searchPembebanan]);

  const handleAddReturn = () => {
    if (!selectedRetailerId) {
      setShowAddModal(true);
      setAddRetailerId("");
      setSearchAddText("");
      setIsAddDropdownOpen(false);
    } else {
      router.push(`/retur/new?ritelId=${selectedRetailerId}`);
    }
  };

  return {
    showBulkModal,
    setShowBulkModal,
    bulkStep,
    setBulkStep,
    bulkRetailerId,
    setBulkRetailerId,
    searchRetailerText,
    setSearchRetailerText,
    activeIndex,
    setActiveIndex,
    isDropdownOpen,
    setIsDropdownOpen,
    isListOpen,
    setIsListOpen,
    openExcelModal,
    setOpenExcelModal,
    showAddModal,
    setShowAddModal,
    addRetailerId,
    setAddRetailerId,
    searchAddText,
    setSearchAddText,
    isAddDropdownOpen,
    setIsAddDropdownOpen,
    showExportModal,
    setShowExportModal,
    isExportAll,
    viewDetailId,
    setViewDetailId,
    selectedDetail,
    dropdownRef,
    comboRef,
    comboboxInputRef,
    addDropdownRef,
    handleSelectRetailer,
    handleOpenExportModal,
    handleCloseExportModal,
    handleExportExcel,
    handleExportAll,
    filteredRetailers,
    filteredInisial,
    masterTujuanList,
    filteredTujuanItems,
    handleTujuanKeyDown,
    availableToko,
    filteredToko,
    filteredProductsInline,
    filteredLokasi,
    filteredPembebanan,
    handleAddReturn,
  };
}
