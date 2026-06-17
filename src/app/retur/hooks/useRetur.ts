import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { getMe } from "@/lib/me";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export function useRetur() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRitelId = searchParams.get("ritelId");
  
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [totalNominal, setTotalNominal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | "magang" | null>(null);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);
  
  const [retailers, setRetailers] = useState<any[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [isGroupedMode, setIsGroupedMode] = useState(true);
  const [filterInisial, setFilterInisial] = useState("");
  const [filterToko, setFilterToko] = useState("");
  const [filterLokasi, setFilterLokasi] = useState("");
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
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
  
  const [products, setProducts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isMassEditing, setIsMassEditing] = useState(false);
  const [massEditForms, setMassEditForms] = useState<Record<string, any>>({});
  const [isSavingMass, setIsSavingMass] = useState(false);
  const [searchToko, setSearchToko] = useState("");
  const [searchProduk, setSearchProduk] = useState("");
  const [isTokoOpen, setIsTokoOpen] = useState(false);
  const [isProdukOpen, setIsProdukOpen] = useState(false);
  const [isLokasiOpen, setIsLokasiOpen] = useState(false);
  const [searchLokasi, setSearchLokasi] = useState("");
  const [isPembebananOpen, setIsPembebananOpen] = useState(false);
  const [isInisialOpen, setIsInisialOpen] = useState(false);
  const [searchInisial, setSearchInisial] = useState("");
  const [searchPembebanan, setSearchPembebanan] = useState("");
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const selectedDetail = useMemo(() => data.find(d => d.id === viewDetailId), [data, viewDetailId]);
  
  const [stats, setStats] = useState({
    sudah_diambil: 0,
    belum_diambil: 0,
    dimusnahkan: 0,
    total: 0
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLTableCellElement>(null);
  const comboboxInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
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
  }, [page, debouncedSearch, rowsPerPage, selectedRetailerId, filterInisial, filterToko, filterLokasi, dateFrom, dateTo, selectedStatus, fetchStats]);

  const handleExportExcel = useCallback(async () => {
    if (!selectedRetailerId) return;
    try {
      const params = new URLSearchParams();
      params.set("retailerId", selectedRetailerId);
      if (search) params.set("q", search);
      if (filterInisial) params.set("inisial", filterInisial);
      if (filterToko) params.set("toko", filterToko);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (selectedStatus) params.set("status", selectedStatus);
      if (filterLokasi) params.set("lokasi", filterLokasi);

      window.location.href = `/api/retur/export?${params.toString()}`;
    } catch (err) {
      console.error("Export Error:", err);
      Swal.fire("Error", "Gagal melakukan export excel", "error");
    }
  }, [selectedRetailerId, search, filterInisial, filterToko, filterLokasi, dateFrom, dateTo, selectedStatus]);

  const handleExportAll = useCallback(async () => {
    try {
      window.location.href = `/api/retur/export`;
    } catch (err) {
      console.error("Export All Error:", err);
      Swal.fire("Error", "Gagal melakukan export keseluruhan", "error");
    }
  }, []);

  const filteredData = useMemo(() => data, [data]);
  const paginatedData = useMemo(() => data, [data]);

  useEffect(() => {
    fetchRetur();
    fetchStats();
  }, [fetchRetur, fetchStats]);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setSelectedStatus(statusParam.toUpperCase());
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    if (editingId) {
      const nominal = Number(editForm.nominal) || 0;
      const qty = Number(editForm.qtyReturn) || 0;
      const result = qty > 0 ? Math.round(nominal / qty) : 0;
      if (editForm.rpKg !== result) {
        setEditForm((p: any) => ({ ...p, rpKg: result }));
      }
    }
  }, [editForm.nominal, editForm.qtyReturn, editingId]);

  const totalPages = Math.ceil(total / rowsPerPage);

  const formatIDR = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy", { locale: idLocale });
    } catch {
      return "-";
    }
  };

  const formatNumber = (val: any) => {
    const num = Number(val) || 0;
    return num.toLocaleString("id-ID");
  };

  const filteredRetailers = useMemo(() => {
    const unique = Array.from(new Map(retailers.map(r => [r.namaPt, r])).values());
    return unique.filter(r => 
      r.namaPt.toLowerCase().includes(searchRetailerText.toLowerCase())
    );
  }, [retailers, searchRetailerText]);

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

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchRetailerText]);

  const handleSelectRetailer = (ritel: any) => {
    setBulkRetailerId(ritel.id);
    setSearchRetailerText(ritel.namaPt);
    setIsDropdownOpen(false);
    setActiveIndex(-1);
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
    setSearchToko(item.namaCompany || "");
    setSearchProduk(item.produk || "");
    setSearchLokasi(item.LokasiBarang?.siteArea || ""); 
    setSearchPembebanan(item.PembebananReturn?.siteArea || ""); 
    setSearchInisial(item.inisial || "");
    setIsInisialOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setSearchToko("");
    setSearchProduk("");
    setSearchLokasi(""); 
    setSearchPembebanan(""); 
    setIsTokoOpen(false);
    setIsProdukOpen(false);
    setIsLokasiOpen(false); 
    setIsPembebananOpen(false); 
    setIsInisialOpen(false);
    setSearchInisial("");
  };

  const handleStartMassEdit = () => {
    setIsMassEditing(true);
    setEditingId(null);
    setEditForm({});
    const initial: Record<string, any> = {};
    data.forEach(item => {
      initial[item.id] = { ...item };
    });
    setMassEditForms(initial);
  };

  const handleCancelMassEdit = () => {
    setIsMassEditing(false);
    setMassEditForms({});
  };

  const handleSaveMassEdit = async () => {
    try {
      setIsSavingMass(true);
      const ids = Object.keys(massEditForms);
      
      const promises = ids.map(async (id) => {
        const itemData = massEditForms[id];
        const { RitelModern, LokasiBarang, Product, PembebananReturn, createdAt, updatedAt, _count, ...pureData } = itemData;

        const cleanedPayload = {
          ...pureData,
          id,
          rtvCn: pureData.rtvCn ? String(pureData.rtvCn).trim() : null,
          kodeToko: pureData.kodeToko ? Number(pureData.kodeToko.toString().replace(/[^0-9]/g, '')) : null,
          qtyReturn: Number(pureData.qtyReturn) || 0,
          nominal: Number(pureData.nominal) || 0,
          rpKg: Number(pureData.rpKg) || 0,
          tanggalRtv: pureData.tanggalRtv ? new Date(pureData.tanggalRtv).toISOString() : null,
          maxPickup: pureData.maxPickup ? new Date(pureData.maxPickup).toISOString() : null,
          tanggalPembayaran: pureData.tanggalPembayaran ? new Date(pureData.tanggalPembayaran).toISOString() : null,
          invoiceRekon: pureData.invoiceRekon || "",
          inisial: pureData.inisial || ""
        };

        const res = await fetch(`/api/retur`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedPayload),
        });

        if (!res.ok) throw new Error("Gagal menyimpan beberapa data");
      });

      await Promise.all(promises);

      Swal.fire({ icon: 'success', title: 'Semua data diperbarui', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      
      setIsMassEditing(false);
      setMassEditForms({});
      
      const scrollY = window.scrollY;
      await fetchRetur();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }));
    } catch (error: any) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: error.message || "Gagal menyimpan perubahan!" });
    } finally {
      setIsSavingMass(false);
    }
  };

  const handleFieldChange = (item: any, field: string, value: any) => {
    if (isMassEditing) {
      setMassEditForms(prev => {
        const current = { ...(prev[item.id] || item), [field]: value };
        if (field === 'nominal' || field === 'qtyReturn') {
          const nominal = Number(current.nominal) || 0;
          const qty = Number(current.qtyReturn) || 0;
          current.rpKg = qty > 0 ? Math.round(nominal / qty) : 0;
        }
        return { ...prev, [item.id]: current };
      });
    } else {
      setEditForm((prev: any) => {
        const current = { ...prev, [field]: value };
        if (field === 'nominal' || field === 'qtyReturn') {
          const nominal = Number(current.nominal) || 0;
          const qty = Number(current.qtyReturn) || 0;
          current.rpKg = qty > 0 ? Math.round(nominal / qty) : 0;
        }
        return current;
      });
    }
  };

  const handleSaveInline = async (id: string) => {
    try {
      setIsFetchingPage(true);
      
      const { 
        RitelModern, 
        LokasiBarang, 
        Product, 
        PembebananReturn, 
        createdAt, 
        updatedAt,
        _count,
        ...pureData 
      } = editForm;

      const cleanedPayload = {
        ...pureData,
        id, 
        rtvCn: pureData.rtvCn ? String(pureData.rtvCn).trim() : null,
        kodeToko: pureData.kodeToko ? Number(pureData.kodeToko.toString().replace(/[^0-9]/g, '')) : null,
        qtyReturn: Number(pureData.qtyReturn) || 0,
        nominal: Number(pureData.nominal) || 0,
        rpKg: Number(pureData.rpKg) || 0,
        tanggalRtv: pureData.tanggalRtv ? new Date(pureData.tanggalRtv).toISOString() : null,
        maxPickup: pureData.maxPickup ? new Date(pureData.maxPickup).toISOString() : null,
        tanggalPembayaran: pureData.tanggalPembayaran ? new Date(pureData.tanggalPembayaran).toISOString() : null,
        invoiceRekon: pureData.invoiceRekon || "",
        inisial: pureData.inisial || ""
      };

      const res = await fetch(`/api/retur`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data");
      }

      setEditingId(null);
      
      Swal.fire({ 
        icon: 'success', 
        title: 'Data diperbarui', 
        toast: true, 
        position: 'top-end', 
        timer: 1500, 
        showConfirmButton: false,
        background: '#f8fafc',
        color: '#0f172a'
      });

      const scrollY = window.scrollY;
      await fetchRetur();
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire({ 
        icon: 'error', 
        title: 'Gagal Menyimpan', 
        text: error.message || "Gagal menyimpan perubahan!", 
        confirmButtonColor: '#4f46e5',
        background: '#fff',
        customClass: {
          popup: 'rounded-[32px]',
          confirmButton: 'rounded-xl px-10'
        }
      });
    } finally {
      setIsFetchingPage(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Retur?',
      text: 'Data ini akan hilang permanen!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#fff',
      customClass: {
        popup: 'rounded-[32px]',
        confirmButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer',
        cancelButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer'
      }
    });

    if (result.isConfirmed) {
      try {
        setIsFetchingPage(true);
        const res = await fetch(`/api/retur?id=${id}`, { 
          method: 'DELETE' 
        });
        
        if (!res.ok) {
          let errorMessage = "Gagal menghapus data";
          try {
            const errData = await res.json();
            errorMessage = errData.error || errorMessage;
          } catch (e) {
          }
          throw new Error(errorMessage);
        }

        Swal.fire({
          icon: 'success',
          title: 'Data dihapus!',
          toast: true,
          position: 'top-end',
          timer: 1500,
          showConfirmButton: false
        });

        setData(prevData => prevData.filter(item => item.id !== id));
        fetchRetur();

      } catch (error: any) {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error.message || 'Gagal menghapus data',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setIsFetchingPage(false);
      }
    }
  };

  const handleDeleteGroup = async (ritelId: string, ritelName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Seluruh Data?',
      html: `Semua data retur untuk <b>${ritelName}</b> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal',
      background: '#fff',
      customClass: {
        popup: 'rounded-[32px]',
        confirmButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer',
        cancelButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer'
      }
    });

    if (result.isConfirmed) {
      try {
        setIsFetchingPage(true);
        const res = await fetch(`/api/retur?ritelId=${ritelId}`, { 
          method: 'DELETE' 
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal menghapus data grup");
        }

        Swal.fire({
          icon: 'success',
          title: 'Grup Dihapus!',
          text: `Seluruh data ${ritelName} telah dibersihkan.`,
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });

        setData(prev => prev.filter(r => r.id !== ritelId));
        fetchRetur();
      } catch (error: any) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
      } finally {
        setIsFetchingPage(false);
      }
    }
  };

  useEffect(() => {
    setData([]);
    setPage(1);
  }, [selectedRetailerId]);

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

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? part.toUpperCase() : part // Simple mock for highlight since we can't easily return JSX here cleanly without importing React. Or we do return an array. Let's return the string directly or keep it simple. We'll handle it in the component.
    ).join("");
  };

  return {
    router,
    searchParams,
    data,
    total,
    totalQty,
    totalNominal,
    loading,
    isFetchingPage,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    search,
    setSearch,
    role,
    userArea,
    userRegional,
    retailers,
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
    availableLocations,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedStatus,
    setSelectedStatus,
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
    products,
    units,
    editingId,
    setEditingId,
    editForm,
    setEditForm,
    isMassEditing,
    setIsMassEditing,
    massEditForms,
    setMassEditForms,
    isSavingMass,
    setIsSavingMass,
    searchToko,
    setSearchToko,
    searchProduk,
    setSearchProduk,
    isTokoOpen,
    setIsTokoOpen,
    isProdukOpen,
    setIsProdukOpen,
    isLokasiOpen,
    setIsLokasiOpen,
    searchLokasi,
    setSearchLokasi,
    isPembebananOpen,
    setIsPembebananOpen,
    isInisialOpen,
    setIsInisialOpen,
    searchInisial,
    setSearchInisial,
    searchPembebanan,
    setSearchPembebanan,
    viewDetailId,
    setViewDetailId,
    selectedDetail,
    stats,
    dropdownRef,
    comboRef,
    addDropdownRef,
    fetchRetur,
    handleExportExcel,
    handleExportAll,
    fetchStats,
    paginatedData,
    filteredData,
    totalPages,
    formatIDR,
    formatDate,
    formatNumber,
    filteredRetailers,
    filterOptions,
    handleSelectRetailer,
    handleStartEdit,
    handleCancelEdit,
    handleStartMassEdit,
    handleCancelMassEdit,
    handleSaveMassEdit,
    handleFieldChange,
    handleSaveInline,
    handleDelete,
    handleDeleteGroup,
    filteredInisial,
    filteredTujuanItems,
    handleTujuanKeyDown,
    filteredToko,
    filteredProductsInline,
    filteredLokasi,
    filteredPembebanan,
    handleAddReturn,
  };
}
