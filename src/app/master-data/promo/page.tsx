"use client";

import React, { useState } from "react";
import { Plus, Search, Layers, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { Promo, PromoFormData } from "./types";
import { usePromoData } from "./hooks/usePromoData";
import PromoRetailerGrid from "./components/PromoRetailerGrid";
import PromoTable from "./components/PromoTable";
import PromoRitelSelectorModal from "./components/PromoRitelSelectorModal";
import PromoFormModal from "./components/PromoFormModal";
import PromoDeleteModal from "./components/PromoDeleteModal";

const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), {
  ssr: false,
});

export default function PromoPage() {
  const {
    isMounted,
    isGroupedMode,
    selectedRetailerId,
    setSelectedRetailerId,
    retailers,
    searchTerm,
    setSearchTerm,
    isLoading,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    saving,
    setSaving,
    showToast,
    loadData,
    handleDelete,
    handleDeleteGroup,
    filtered,
    totalItems,
    safePage,
    currentItems,
  } = usePromoData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add Promo flow: Select retailer first if in grouped mode
  const [showRitelSelector, setShowRitelSelector] = useState(false);
  const [searchRitelText, setSearchRitelText] = useState("");
  const [isRitelDropdownOpen, setIsRitelDropdownOpen] = useState(false);
  const [openExcelBulk, setOpenExcelBulk] = useState(false);

  // Form State
  const [formData, setFormData] = useState<PromoFormData>({
    nomor: "",
    linkDocs: "",
    kegiatan: "Dc Fee",
    periode: "Januari",
    tanggal: new Date().toISOString().split("T")[0],
    dpp: 0,
    ppn: 0,
    pph: 0,
    linkFP: "",
    ritelId: "",
    remarks: "",
  });

  const handleEdit = (promo: Promo) => {
    setEditId(promo.id);
    setFormData({
      nomor: promo.nomor,
      linkDocs: promo.linkDocs || "",
      kegiatan: promo.kegiatan,
      periode: promo.periode,
      tanggal: new Date(promo.tanggal).toISOString().split("T")[0],
      dpp: promo.dpp,
      ppn: promo.ppn,
      pph: promo.pph || 0,
      linkFP: promo.linkFP || "",
      remarks: promo.remarks || "",
      ritelId: selectedRetailerId || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const res = await fetch("/api/promo", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editId }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");

      showToast(
        "success",
        editId ? "Data Berhasil Diperbarui" : "Data Promo Berhasil Disimpan"
      );
      loadData();
      setIsModalOpen(false);
      setEditId(null);
      setFormData({
        nomor: "",
        linkDocs: "",
        kegiatan: "Dc Fee",
        periode: "Januari",
        tanggal: new Date().toISOString().split("T")[0],
        dpp: 0,
        ppn: 0,
        pph: 0,
        linkFP: "",
        ritelId: selectedRetailerId || "",
        remarks: "",
      });
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!isMounted)
    return (
      <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
        Initializing Manifest...
      </div>
    );

  return (
    <main className="pb-24 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-10">
        <div className="flex items-center gap-5">
          {selectedRetailerId && (
            <button
              onClick={() => setSelectedRetailerId(null)}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 dark:hover:border-indigo-500/30 rounded-[24px] shadow-sm hover:shadow-indigo-500/10 transition-all active:scale-95 group"
            >
              <ArrowLeft
                size={22}
                className="group-hover:-translate-x-1 transition-transform"
              />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2 sm:gap-3 flex-wrap">
              {selectedRetailerId
                ? `PROMO: ${
                    retailers.find((r) => r.id === selectedRetailerId)?.namaPt ||
                    "Detail"
                  }`
                : "Master Promo"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Daftar Spesifikasi Data Promo
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
          <button
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 px-5 sm:px-8 py-3.5 sm:py-5 rounded-2xl sm:rounded-[40px] font-black hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm active:scale-95 text-xs uppercase tracking-widest w-full sm:w-auto"
          >
            <Layers size={16} />
            Bulk Upload
          </button>
          <button
            onClick={() => {
              if (!selectedRetailerId && isGroupedMode) {
                setSearchRitelText("");
                setShowRitelSelector(true);
              } else {
                setEditId(null);
                setFormData({
                  ...formData,
                  nomor: "",
                  linkDocs: "",
                  kegiatan: "Dc Fee",
                  periode: "Januari",
                  tanggal: new Date().toISOString().split("T")[0],
                  dpp: 0,
                  ppn: 0,
                  pph: 0,
                  linkFP: "",
                  ritelId: selectedRetailerId || "",
                  remarks: "",
                });
                setIsModalOpen(true);
              }
            }}
            className="flex items-center justify-center gap-3 bg-slate-900 dark:bg-indigo-600 text-white px-5 sm:px-10 py-3.5 sm:py-5 rounded-2xl sm:rounded-[40px] font-black hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 text-xs uppercase tracking-widest border-4 border-white/10 dark:border-white/5 w-full sm:w-auto"
          >
            <div className="p-1 bg-white/20 rounded-full">
              <Plus size={16} strokeWidth={3} />
            </div>
            Add Promo
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl sm:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
        <div className="relative max-w-md group">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder={
              isGroupedMode && !selectedRetailerId
                ? "Cari Ritel Modern..."
                : "Search ID, Nomor, or Kegiatan..."
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-slate-800 transition-all text-sm font-black text-slate-700 dark:text-slate-200 outline-none"
          />
        </div>
      </div>

      {isGroupedMode && !selectedRetailerId ? (
        <PromoRetailerGrid
          isLoading={isLoading}
          filtered={filtered}
          setSelectedRetailerId={setSelectedRetailerId}
          setSearchTerm={setSearchTerm}
          handleDeleteGroup={handleDeleteGroup}
        />
      ) : (
        <PromoTable
          currentItems={currentItems}
          isLoading={isLoading}
          totalItems={totalItems}
          safePage={safePage}
          itemsPerPage={itemsPerPage}
          setCurrentPage={setCurrentPage}
          setItemsPerPage={setItemsPerPage}
          handleEdit={handleEdit}
          setDeleteConfirmId={setDeleteConfirmId}
        />
      )}

      {/* Modal Pilih Ritel Modern */}
      <PromoRitelSelectorModal
        isOpen={showRitelSelector}
        onClose={() => setShowRitelSelector(false)}
        retailers={retailers}
        searchRitelText={searchRitelText}
        setSearchRitelText={setSearchRitelText}
        isRitelDropdownOpen={isRitelDropdownOpen}
        setIsRitelDropdownOpen={setIsRitelDropdownOpen}
        onSelectRetailer={(opt) => {
          setFormData({ ...formData, ritelId: opt.id });
          setSelectedRetailerId(opt.id);
          setSearchRitelText("");
          setIsRitelDropdownOpen(false);
          setShowRitelSelector(false);
          setEditId(null);
          setIsModalOpen(true);
        }}
      />

      {/* Modal Form */}
      <PromoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editId={editId}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        saving={saving}
      />

      {/* Sweet Alert Style Delete Confirmation */}
      <PromoDeleteModal
        deleteConfirmId={deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => handleDelete(deleteConfirmId, setDeleteConfirmId)}
        saving={saving}
      />

      <ExcelBulkModal
        open={openExcelBulk}
        onClose={() => setOpenExcelBulk(false)}
        onSuccess={() => {
          setOpenExcelBulk(false);
          loadData();
          showToast("success", "Bulk Upload Berhasil!");
        }}
        title="Bulk Upload Promo"
        variant="promo"
      />
    </main>
  );
}
