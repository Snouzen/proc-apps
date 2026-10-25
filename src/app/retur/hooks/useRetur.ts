import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import { useReturFilters } from "./sub/useReturFilters";
import { useReturDataFetch } from "./sub/useReturDataFetch";
import { useReturMutations } from "./sub/useReturMutations";
import { useReturCombobox } from "./sub/useReturCombobox";

export function useRetur() {
  const router = useRouter();
  const filters = useReturFilters();

  const dataFetch = useReturDataFetch({
    page: filters.page,
    setPage: filters.setPage,
    rowsPerPage: filters.rowsPerPage,
    debouncedSearch: filters.debouncedSearch,
    selectedRetailerId: filters.selectedRetailerId,
    setIsGroupedMode: filters.setIsGroupedMode,
    filterInisial: filters.filterInisial,
    filterToko: filters.filterToko,
    filterLokasi: filters.filterLokasi,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    selectedStatus: filters.selectedStatus,
  });

  const filterOptions = useMemo(() => {
    if (!filters.selectedRetailerId || dataFetch.retailers.length === 0) return { inisials: [], tokos: [] };
    const r = dataFetch.retailers.find((x: any) => x.id === filters.selectedRetailerId);
    if (!r) return { inisials: [], tokos: [] };
    
    const pt = r.namaPt.trim().toLowerCase();
    const related = dataFetch.retailers.filter((x: any) => x.namaPt.trim().toLowerCase() === pt);
    
    return {
      inisials: Array.from(new Set(related.map((x: any) => x.inisial).filter(Boolean))) as string[],
      tokos: Array.from(new Set(related.map((x: any) => x.tujuan).filter(Boolean))) as string[],
    };
  }, [filters.selectedRetailerId, dataFetch.retailers]);

  const mutations = useReturMutations({
    data: dataFetch.data,
    setData: dataFetch.setData,
    setIsFetchingPage: dataFetch.setIsFetchingPage,
    fetchRetur: dataFetch.fetchRetur,
  });

  const combobox = useReturCombobox({
    router,
    retailers: dataFetch.retailers,
    products: dataFetch.products,
    units: dataFetch.units,
    data: dataFetch.data,
    selectedRetailerId: filters.selectedRetailerId,
    editingId: mutations.editingId,
    editForm: mutations.editForm,
    setEditForm: mutations.setEditForm,
    isMassEditing: mutations.isMassEditing,
    searchToko: mutations.searchToko,
    searchProduk: mutations.searchProduk,
    searchLokasi: mutations.searchLokasi,
    searchPembebanan: mutations.searchPembebanan,
    searchInisial: mutations.searchInisial,
  });

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

  return {
    router,
    searchParams: filters.searchParams,
    data: dataFetch.data,
    total: dataFetch.total,
    totalQty: dataFetch.totalQty,
    totalNominal: dataFetch.totalNominal,
    loading: dataFetch.loading,
    isFetchingPage: dataFetch.isFetchingPage,
    page: filters.page,
    setPage: filters.setPage,
    rowsPerPage: filters.rowsPerPage,
    setRowsPerPage: filters.setRowsPerPage,
    search: filters.search,
    setSearch: filters.setSearch,
    role: dataFetch.role,
    userArea: dataFetch.userArea,
    userRegional: dataFetch.userRegional,
    retailers: dataFetch.retailers,
    selectedRetailerId: filters.selectedRetailerId,
    setSelectedRetailerId: filters.setSelectedRetailerId,
    isGroupedMode: filters.isGroupedMode,
    setIsGroupedMode: filters.setIsGroupedMode,
    filterInisial: filters.filterInisial,
    setFilterInisial: filters.setFilterInisial,
    filterToko: filters.filterToko,
    setFilterToko: filters.setFilterToko,
    filterLokasi: filters.filterLokasi,
    setFilterLokasi: filters.setFilterLokasi,
    availableLocations: dataFetch.availableLocations,
    dateFrom: filters.dateFrom,
    setDateFrom: filters.setDateFrom,
    dateTo: filters.dateTo,
    setDateTo: filters.setDateTo,
    selectedStatus: filters.selectedStatus,
    setSelectedStatus: filters.setSelectedStatus,
    showBulkModal: combobox.showBulkModal,
    setShowBulkModal: combobox.setShowBulkModal,
    bulkStep: combobox.bulkStep,
    setBulkStep: combobox.setBulkStep,
    bulkRetailerId: combobox.bulkRetailerId,
    setBulkRetailerId: combobox.setBulkRetailerId,
    searchRetailerText: combobox.searchRetailerText,
    setSearchRetailerText: combobox.setSearchRetailerText,
    activeIndex: combobox.activeIndex,
    setActiveIndex: combobox.setActiveIndex,
    isDropdownOpen: combobox.isDropdownOpen,
    setIsDropdownOpen: combobox.setIsDropdownOpen,
    isListOpen: combobox.isListOpen,
    setIsListOpen: combobox.setIsListOpen,
    openExcelModal: combobox.openExcelModal,
    setOpenExcelModal: combobox.setOpenExcelModal,
    showAddModal: combobox.showAddModal,
    setShowAddModal: combobox.setShowAddModal,
    addRetailerId: combobox.addRetailerId,
    setAddRetailerId: combobox.setAddRetailerId,
    searchAddText: combobox.searchAddText,
    setSearchAddText: combobox.setSearchAddText,
    isAddDropdownOpen: combobox.isAddDropdownOpen,
    setIsAddDropdownOpen: combobox.setIsAddDropdownOpen,
    products: dataFetch.products,
    units: dataFetch.units,
    editingId: mutations.editingId,
    setEditingId: mutations.setEditingId,
    editForm: mutations.editForm,
    setEditForm: mutations.setEditForm,
    isMassEditing: mutations.isMassEditing,
    setIsMassEditing: mutations.setIsMassEditing,
    massEditForms: mutations.massEditForms,
    setMassEditForms: mutations.setMassEditForms,
    isSavingMass: mutations.isSavingMass,
    setIsSavingMass: mutations.setIsSavingMass,
    searchToko: mutations.searchToko,
    setSearchToko: mutations.setSearchToko,
    searchProduk: mutations.searchProduk,
    setSearchProduk: mutations.setSearchProduk,
    isTokoOpen: mutations.isTokoOpen,
    setIsTokoOpen: mutations.setIsTokoOpen,
    isProdukOpen: mutations.isProdukOpen,
    setIsProdukOpen: mutations.setIsProdukOpen,
    isLokasiOpen: mutations.isLokasiOpen,
    setIsLokasiOpen: mutations.setIsLokasiOpen,
    searchLokasi: mutations.searchLokasi,
    setSearchLokasi: mutations.setSearchLokasi,
    isPembebananOpen: mutations.isPembebananOpen,
    setIsPembebananOpen: mutations.setIsPembebananOpen,
    isInisialOpen: mutations.isInisialOpen,
    setIsInisialOpen: mutations.setIsInisialOpen,
    searchInisial: mutations.searchInisial,
    setSearchInisial: mutations.setSearchInisial,
    searchPembebanan: mutations.searchPembebanan,
    setSearchPembebanan: mutations.setSearchPembebanan,
    viewDetailId: combobox.viewDetailId,
    setViewDetailId: combobox.setViewDetailId,
    selectedDetail: combobox.selectedDetail,
    stats: dataFetch.stats,
    dropdownRef: combobox.dropdownRef,
    comboRef: combobox.comboRef,
    addDropdownRef: combobox.addDropdownRef,
    fetchRetur: dataFetch.fetchRetur,
    showExportModal: combobox.showExportModal,
    setShowExportModal: combobox.setShowExportModal,
    isExportAll: combobox.isExportAll,
    handleOpenExportModal: combobox.handleOpenExportModal,
    handleCloseExportModal: combobox.handleCloseExportModal,
    handleExportExcel: combobox.handleExportExcel,
    handleExportAll: combobox.handleExportAll,
    fetchStats: dataFetch.fetchStats,
    paginatedData: dataFetch.paginatedData,
    filteredData: dataFetch.filteredData,
    totalPages: dataFetch.totalPages,
    formatIDR,
    formatDate,
    formatNumber,
    filteredRetailers: combobox.filteredRetailers,
    filterOptions,
    handleSelectRetailer: combobox.handleSelectRetailer,
    handleStartEdit: mutations.handleStartEdit,
    handleCancelEdit: mutations.handleCancelEdit,
    handleStartMassEdit: mutations.handleStartMassEdit,
    handleCancelMassEdit: mutations.handleCancelMassEdit,
    handleSaveMassEdit: mutations.handleSaveMassEdit,
    handleFieldChange: mutations.handleFieldChange,
    handleSaveInline: mutations.handleSaveInline,
    handleDelete: mutations.handleDelete,
    handleDeleteGroup: mutations.handleDeleteGroup,
    filteredInisial: combobox.filteredInisial,
    filteredTujuanItems: combobox.filteredTujuanItems,
    handleTujuanKeyDown: combobox.handleTujuanKeyDown,
    filteredToko: combobox.filteredToko,
    filteredProductsInline: combobox.filteredProductsInline,
    filteredLokasi: combobox.filteredLokasi,
    filteredPembebanan: combobox.filteredPembebanan,
    handleAddReturn: combobox.handleAddReturn,
  };
}
