"use client";

import React, { useState } from "react";
import { Plus, Search, AlertCircle, CheckCircle2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useUnitProduksiData } from "./hooks/useUnitProduksiData";
import UnitProduksiTable from "./components/UnitProduksiTable";
import UnitProduksiFormModal from "./components/UnitProduksiFormModal";
import UnitProduksiViewModal from "./components/UnitProduksiViewModal";
import UnitProduksiStoreDialogs from "./components/UnitProduksiStoreDialogs";

const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), {
  ssr: false,
});

export default function UnitProduksiPage() {
  const {
    isMounted,
    dataUnit,
    setDataUnit,
    isLoading,
    loadData,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    expandedRows,
    toggleRow,
    toast,
    setToast,
    showToast,
    regionalOptions,
    filteredData,
    currentItems,
  } = useUnitProduksiData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"addSite" | "addRegional">(
    "addSite"
  );
  const [contextRegional, setContextRegional] = useState<string | null>(null);
  const [selectedRegional, setSelectedRegional] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteAlamat, setSiteAlamat] = useState("");
  const [siteManager, setSiteManager] = useState("");

  const [viewRegional, setViewRegional] = useState<{
    nama: string;
    sites: any[];
  } | null>(null);
  const [viewedSite, setViewedSite] = useState<any>(null);

  const [deleteRegional, setDeleteRegional] = useState<string | null>(null);
  const [editSite, setEditSite] = useState<{
    regional: string;
    site: string;
    alamat: string;
    managerOperasional?: string;
  } | null>(null);
  const [deleteSite, setDeleteSite] = useState<{
    regional: string;
    site: string;
  } | null>(null);

  const [newRegionalName, setNewRegionalName] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAlamat, setNewSiteAlamat] = useState("");
  const [newSiteManager, setNewSiteManager] = useState("");

  const [openExcelBulk, setOpenExcelBulk] = useState(false);

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Unit Produksi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola Regional dan Site Area
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Bulk Upload
          </button>

          <button
            suppressHydrationWarning
            onClick={() => {
              setContextRegional(null);
              setSelectedRegional("");
              setSiteName("");
              setSiteAlamat("");
              setSiteManager("");
              setModalMode("addSite");
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Add New Site
          </button>
        </div>
      </div>

      <ExcelBulkModal
        open={openExcelBulk}
        onClose={() => setOpenExcelBulk(false)}
        onSuccess={() => {
          setOpenExcelBulk(false);
          loadData();
        }}
        title="Bulk Upload Unit Produksi"
        variant="unit"
      />

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            size={18}
          />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Cari Regional atau Site..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:ring-indigo-500/20 dark:focus:border-indigo-500 transition-all text-sm dark:text-slate-200"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <UnitProduksiTable
        currentItems={currentItems}
        isLoading={isLoading}
        totalItems={filteredData.length}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        setCurrentPage={setCurrentPage}
        expandedRows={expandedRows}
        toggleRow={toggleRow}
        setViewRegional={setViewRegional}
        setContextRegional={setContextRegional}
        setSelectedRegional={setSelectedRegional}
        setSiteName={setSiteName}
        setModalMode={setModalMode}
        setIsModalOpen={setIsModalOpen}
        setDeleteRegional={setDeleteRegional}
        setViewedSite={setViewedSite}
        setEditSite={setEditSite}
        setNewRegionalName={setNewRegionalName}
        setNewSiteName={setNewSiteName}
        setNewSiteAlamat={setNewSiteAlamat}
        setNewSiteManager={setNewSiteManager}
        setDeleteSite={setDeleteSite}
      />

      {/* Form Modal (Add Site / Add Regional) */}
      <UnitProduksiFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        modalMode={modalMode}
        setModalMode={setModalMode}
        contextRegional={contextRegional}
        selectedRegional={selectedRegional}
        setSelectedRegional={setSelectedRegional}
        regionalOptions={regionalOptions}
        siteName={siteName}
        setSiteName={setSiteName}
        siteAlamat={siteAlamat}
        setSiteAlamat={setSiteAlamat}
        siteManager={siteManager}
        setSiteManager={setSiteManager}
        dataUnit={dataUnit}
        setDataUnit={setDataUnit}
        loadData={loadData}
        showToast={showToast}
      />

      {/* View Modals (Regional Sites & Site Details) */}
      <UnitProduksiViewModal
        viewRegional={viewRegional}
        setViewRegional={setViewRegional}
        viewedSite={viewedSite}
        setViewedSite={setViewedSite}
      />

      {/* Store Dialogs (Delete Regional, Edit Site, Delete Site) */}
      <UnitProduksiStoreDialogs
        deleteRegional={deleteRegional}
        setDeleteRegional={setDeleteRegional}
        editSite={editSite}
        setEditSite={setEditSite}
        newRegionalName={newRegionalName}
        setNewRegionalName={setNewRegionalName}
        newSiteName={newSiteName}
        setNewSiteName={setNewSiteName}
        newSiteAlamat={newSiteAlamat}
        setNewSiteAlamat={setNewSiteAlamat}
        newSiteManager={newSiteManager}
        setNewSiteManager={setNewSiteManager}
        regionalOptions={regionalOptions}
        deleteSite={deleteSite}
        setDeleteSite={setDeleteSite}
        loadData={loadData}
        showToast={showToast}
      />

      {/* Modern Toast Notification */}
      {toast.show && (
        <div className="fixed top-8 right-8 z-[9999] animate-in fade-in slide-in-from-right-10 duration-500">
          <div
            className={`flex items-center gap-4 px-6 py-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border backdrop-blur-md ${
              toast.type === "error"
                ? "bg-rose-50/90 border-rose-100 text-rose-700"
                : "bg-emerald-50/90 border-emerald-100 text-emerald-700"
            }`}
          >
            <div
              className={`p-2 rounded-2xl ${
                toast.type === "error" ? "bg-rose-100" : "bg-emerald-100"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle size={24} />
              ) : (
                <CheckCircle2 size={24} />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">
                Notification
              </p>
              <p className="text-sm font-black leading-none">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ ...toast, show: false })}
              className="ml-4 p-2 hover:bg-black/5 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
