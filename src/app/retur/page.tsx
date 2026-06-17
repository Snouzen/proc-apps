"use client";

import { Suspense } from "react";
import { 
  Plus, 
  Upload, 
  LayoutList,
  Loader2,
  ArrowLeft,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { ReturFilterBar } from "./components/ReturFilterBar";
import { ReturGroupedView } from "./components/ReturGroupedView";
import { ReturTable } from "./components/ReturTable";
import { useRetur } from "./hooks/useRetur";
import { ReturBulkModal } from "./components/ReturBulkModal";
import { ReturAddModal } from "./components/ReturAddModal";

function ReturContent() {
  const {
    router,
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
    editForm,
    setEditForm,
    isMassEditing,
    massEditForms,
    isSavingMass,
    searchToko,
    setSearchToko,
    searchProduk,
    setSearchProduk,
    searchLokasi,
    setSearchLokasi,
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
    paginatedData,
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
    setSearchInisial,
    setIsInisialOpen,
    isInisialOpen
  } = useRetur();

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {selectedRetailerId && (
            <button 
              suppressHydrationWarning
              onClick={() => {
                setSelectedRetailerId(null);
                setIsGroupedMode(true);
              }}
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
              title="Back to List"
            >
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                 <LayoutList className="text-white" size={24} />
              </div>
              {selectedRetailerId 
                ? `Retur: ${retailers.find((r: any) => r.id === selectedRetailerId)?.namaPt || 'Detail'}` 
                : role === "sitearea" 
                  ? `Retur Area: ${userArea}`
                  : 'Data Retur Barang'
              }
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">
              {role === "sitearea" 
                ? `Memantau pengembalian barang khusus di lokasi ${userArea}.` 
                : 'Manajemen master data pengembalian barang cabang & toko.'
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2 lg:mt-0">
          {selectedRetailerId && (
            <button 
              suppressHydrationWarning
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 group"
            >
              <FileSpreadsheet size={18} className="group-hover:-translate-y-0.5 transition-transform" />
              Export Excel
            </button>
          )}

          {isGroupedMode && (
            <button 
              suppressHydrationWarning
              onClick={handleExportAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 group whitespace-nowrap"
            >
              <FileSpreadsheet size={18} className="group-hover:-translate-y-0.5 transition-transform" />
              Export Semua
            </button>
          )}

          {role === "pusat" && (
              <button 
                suppressHydrationWarning
                onClick={() => {
                  setBulkStep(1);
                  setBulkRetailerId("");
                  setSearchRetailerText("");
                  setShowBulkModal(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95 group whitespace-nowrap"
              >
                <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                Bulk Upload
              </button>
          )}
          {(role === "pusat" || role === "sitearea" || role === "magang") && (
              <button 
                suppressHydrationWarning
                onClick={handleAddReturn}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                <Plus size={18} />
                Add Return
              </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div 
          onClick={() => {
            setSelectedStatus(selectedStatus === "SUDAH DIAMBIL" ? null : "SUDAH DIAMBIL");
            setPage(1);
          }}
          className={`cursor-pointer bg-white dark:bg-slate-800 border-2 p-6 rounded-[32px] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative ${selectedStatus === "SUDAH DIAMBIL" ? "border-emerald-500 ring-4 ring-emerald-500/10 shadow-emerald-100 dark:shadow-emerald-900/50" : "border-emerald-100 dark:border-slate-700 hover:shadow-emerald-500/10 dark:hover:border-emerald-500/50"}`}
        >
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-emerald-50 dark:text-emerald-900 opacity-10 group-hover:scale-110 transition-transform duration-700">
             <CheckCircle2 size={120} />
          </div>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sudah Diambil
          </p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight tabular-nums">
            {stats.sudah_diambil.toLocaleString("id-ID")}
            <span className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-tight">Records</span>
          </h4>
        </div>

        <div 
          onClick={() => {
            setSelectedStatus(selectedStatus === "BELUM DIAMBIL" ? null : "BELUM DIAMBIL");
            setPage(1);
          }}
          className={`cursor-pointer bg-white dark:bg-slate-800 border-2 p-6 rounded-[32px] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative ${selectedStatus === "BELUM DIAMBIL" ? "border-rose-500 ring-4 ring-rose-500/10 shadow-rose-100 dark:shadow-rose-900/50" : "border-rose-100 dark:border-slate-700 hover:shadow-rose-500/10 dark:hover:border-rose-500/50"}`}
        >
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-rose-50 dark:text-rose-900 opacity-10 group-hover:scale-110 transition-transform duration-700">
             <Calendar size={120} />
          </div>
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Belum Diambil
          </p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight tabular-nums">
            {stats.belum_diambil.toLocaleString("id-ID")}
            <span className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-tight">Records</span>
          </h4>
        </div>

        <div 
          onClick={() => {
            setSelectedStatus(selectedStatus === "DIMUSNAHKAN" ? null : "DIMUSNAHKAN");
            setPage(1);
          }}
          className={`cursor-pointer bg-white dark:bg-slate-800 border-2 p-6 rounded-[32px] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative ${selectedStatus === "DIMUSNAHKAN" ? "border-amber-500 ring-4 ring-amber-500/10 shadow-amber-100 dark:shadow-amber-900/50" : "border-amber-100 dark:border-slate-700 hover:shadow-amber-500/10 dark:hover:border-amber-500/50"}`}
        >
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-amber-50 dark:text-amber-900 opacity-10 group-hover:scale-110 transition-transform duration-700">
             <Trash2 size={120} />
          </div>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Dimusnahkan
          </p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight tabular-nums">
            {stats.dimusnahkan.toLocaleString("id-ID")}
            <span className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-tight">Records</span>
          </h4>
        </div>
      </div>

      <ReturFilterBar
        search={search}
        setSearch={setSearch}
        isGroupedMode={isGroupedMode}
        total={total}
        totalQty={totalQty}
        totalNominal={totalNominal}
        formatNumber={formatNumber}
        formatIDR={formatIDR}
        selectedRetailerId={selectedRetailerId}
        filterInisial={filterInisial}
        setFilterInisial={setFilterInisial}
        filterToko={filterToko}
        setFilterToko={setFilterToko}
        filterLokasi={filterLokasi}
        setFilterLokasi={setFilterLokasi}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setPage}
        isMassEditing={isMassEditing}
        isSavingMass={isSavingMass}
        handleCancelMassEdit={handleCancelMassEdit}
        handleSaveMassEdit={handleSaveMassEdit}
        handleStartMassEdit={handleStartMassEdit}
        filterOptions={filterOptions}
        availableLocations={availableLocations}
      />

      <div className="-mt-4">
        {isGroupedMode ? (
          <ReturGroupedView 
            loading={loading}
            data={data}
            role={role}
            handleDeleteGroup={handleDeleteGroup}
            setSelectedRetailerId={setSelectedRetailerId}
            setIsGroupedMode={setIsGroupedMode}
          />
        ) : (
          <ReturTable
            editingId={editingId}
            isMassEditing={isMassEditing}
            massEditForms={massEditForms}
            editForm={editForm}
            role={role}
            units={units}
            userArea={userArea}
            userRegional={userRegional}
            filteredLokasi={filteredLokasi}
            setSearchLokasi={setSearchLokasi}
            handleFieldChange={handleFieldChange}
            isListOpen={isListOpen}
            setIsListOpen={setIsListOpen}
            filteredTujuanItems={filteredTujuanItems}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            setEditForm={setEditForm}
            searchToko={searchToko}
            setSearchToko={setSearchToko}
            filteredToko={filteredToko}
            searchProduk={searchProduk}
            setSearchProduk={setSearchProduk}
            filteredProductsInline={filteredProductsInline}
            searchPembebanan={searchPembebanan}
            setSearchPembebanan={setSearchPembebanan}
            filteredPembebanan={filteredPembebanan}
            handleSaveInline={handleSaveInline}
            handleCancelEdit={handleCancelEdit}
            handleStartEdit={handleStartEdit}
            handleDelete={handleDelete}
            setViewDetailId={setViewDetailId}
            formatDate={formatDate}
            formatIDR={formatIDR}
            formatNumber={formatNumber}
            paginatedData={paginatedData}
            loading={loading}
            isFetchingPage={isFetchingPage}
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            setPage={setPage}
            setRowsPerPage={setRowsPerPage}
            isGroupedMode={isGroupedMode}
            selectedDetail={selectedDetail}
            viewDetailId={viewDetailId}
            comboRef={comboRef}
            setSearchInisial={setSearchInisial}
            setIsInisialOpen={setIsInisialOpen}
            filteredInisial={filteredInisial}
            products={products}
            isInisialOpen={isInisialOpen}
            handleTujuanKeyDown={handleTujuanKeyDown}
          />
        )}
      </div>

      <ReturBulkModal
        showBulkModal={showBulkModal}
        setShowBulkModal={setShowBulkModal}
        bulkStep={bulkStep}
        setBulkStep={setBulkStep}
        bulkRetailerId={bulkRetailerId}
        setBulkRetailerId={setBulkRetailerId}
        searchRetailerText={searchRetailerText}
        setSearchRetailerText={setSearchRetailerText}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        filteredRetailers={filteredRetailers}
        handleSelectRetailer={handleSelectRetailer}
        dropdownRef={dropdownRef}
        retailers={retailers}
        openExcelModal={openExcelModal}
        setOpenExcelModal={setOpenExcelModal}
        fetchRetur={fetchRetur}
      />

      <ReturAddModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        addDropdownRef={addDropdownRef}
        searchAddText={searchAddText}
        setSearchAddText={setSearchAddText}
        isAddDropdownOpen={isAddDropdownOpen}
        setIsAddDropdownOpen={setIsAddDropdownOpen}
        setAddRetailerId={setAddRetailerId}
        addRetailerId={addRetailerId}
        filteredRetailers={filteredRetailers}
        router={router}
      />

      {isFetchingPage && (
        <div className="fixed bottom-10 right-10 z-[110] animate-in slide-in-from-bottom-5 duration-500">
           <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3">
              <Loader2 className="text-indigo-600 animate-spin" size={20} />
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Refreshing Data...</span>
           </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense 
      fallback={
        <div className="p-10 flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">Menyiapkan Data Retur...</p>
        </div>
      }
    >
      <ReturContent />
    </Suspense>
  );
}
