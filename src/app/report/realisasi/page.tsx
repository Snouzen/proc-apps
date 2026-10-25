"use client";

import PusatOnly from "@/components/PusatOnly";
import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import RealisasiSlide from "./components/RealisasiSlide";
import RealisasiFormSplit from "./components/RealisasiFormSplit";
import RealisasiToolbar from "./components/RealisasiToolbar";
import RealisasiDateBar from "./components/RealisasiDateBar";
import RealisasiEmptyState from "./components/RealisasiEmptyState";
import { useRealisasiData } from "./hooks/useRealisasiData";

export default function RealisasiPemenuhanPage() {
  const {
    role,
    authLoading,
    records,
    selectedRecord,
    setSelectedRecord,
    selectedDateStr,
    minDateStr,
    matchingDateRecords,
    existingReportDates,
    handleDateChange,
    isSplitOpen,
    setIsSplitOpen,
    editingId,
    tanggal,
    setTanggal,
    tanggalAkhir,
    setTanggalAkhir,
    daftarTanggal,
    setDaftarTanggal,
    judul,
    setJudul,
    subjudul,
    setSubjudul,
    sumberCatatan,
    setSumberCatatan,
    daftarRegional,
    setDaftarRegional,
    items,
    setItems,
    ritelOptions,
    loadingOptions,
    saving,
    exportingPdf,
    slideRef,
    handleOpenCreate,
    handleOpenEdit,
    handleSaveForm,
    handleDeleteRecord,
    handleExportPdf,
    activeSlideData,
  } = useRealisasiData();

  // Auth Guard
  if (!authLoading && role !== "pusat") {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-12">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-5 rounded-2xl text-center shadow-sm">
          <h2 className="text-lg font-bold">Akses Terbatas</h2>
          <p className="text-sm mt-1">
            Halaman <strong>Realisasi Pemenuhan</strong> hanya dapat diakses oleh user dengan role <strong>Pusat</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1920px] mx-auto space-y-5">
      <div className="space-y-5">
        {/* Top Header Toolbar */}
        <RealisasiToolbar
          isSplitOpen={isSplitOpen}
          selectedRecord={selectedRecord}
          exportingPdf={exportingPdf}
          onOpenCreate={() => handleOpenCreate()}
          onOpenEdit={(rec) => handleOpenEdit(rec)}
          onCloseSplit={() => setIsSplitOpen(false)}
          onExportPdf={handleExportPdf}
        />

        {/* Date Selector Input (When NOT in Split View) */}
        {!isSplitOpen && (
          <RealisasiDateBar
            selectedDateStr={selectedDateStr}
            onDateChange={handleDateChange}
            minDateStr={minDateStr}
            selectedRecord={selectedRecord}
            matchingDateRecords={matchingDateRecords}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            recordsCount={records.length}
            onOpenCreateForDate={(dateStr) => handleOpenCreate(dateStr)}
          />
        )}

        {/* MAIN CONTENT AREA */}
        {isSplitOpen ? (
          /* SPLIT VIEW MODE: Form Input on Left, Live Slide on Right */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-5 2xl:col-span-4 sticky top-4">
              <RealisasiFormSplit
                tanggal={tanggal}
                setTanggal={setTanggal}
                tanggalAkhir={tanggalAkhir}
                setTanggalAkhir={setTanggalAkhir}
                daftarTanggal={daftarTanggal}
                setDaftarTanggal={setDaftarTanggal}
                judul={judul}
                setJudul={setJudul}
                subjudul={subjudul}
                setSubjudul={setSubjudul}
                sumberCatatan={sumberCatatan}
                setSumberCatatan={setSumberCatatan}
                daftarRegional={daftarRegional}
                setDaftarRegional={setDaftarRegional}
                items={items}
                setItems={setItems}
                ritelOptions={ritelOptions}
                loadingOptions={loadingOptions}
                saving={saving}
                onSave={handleSaveForm}
                onCancel={() => setIsSplitOpen(false)}
                isEditMode={Boolean(editingId)}
                existingReportDates={existingReportDates}
              />
            </div>

            <div className="xl:col-span-7 2xl:col-span-8 space-y-2 overflow-x-auto">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Preview (16:9 Slide)
                </span>
                <span className="text-[11px] text-slate-400">
                  Slide otomatis memperbarui tampilan saat form di kiri diisi
                </span>
              </div>

              <div className="w-full">
                <RealisasiSlide data={activeSlideData} slideRef={slideRef} />
              </div>
            </div>
          </div>
        ) : !selectedRecord && records.length > 0 ? (
          /* EMPTY STATE FOR SELECTED DATE */
          <RealisasiEmptyState
            selectedDateStr={selectedDateStr}
            onOpenCreate={(dStr) => handleOpenCreate(dStr)}
          />
        ) : (
          /* FULL VIEW MODE: Clean Centered 16:9 Slide */
          <div className="space-y-4">
            {selectedRecord && (
              <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Menampilkan Data:{" "}
                    <strong className="font-bold">
                      {selectedRecord.tanggalAkhir ? (
                        `${new Date(selectedRecord.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })} – ${new Date(selectedRecord.tanggalAkhir).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`
                      ) : (
                        new Date(selectedRecord.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      )}
                    </strong>
                  </span>

                  {Array.isArray(selectedRecord.daftarTanggal) &&
                    selectedRecord.daftarTanggal.length > 1 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                        Rapel {selectedRecord.daftarTanggal.length} Hari
                      </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedRecord)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Edit2 size={12} />
                    Edit Data
                  </button>

                  <PusatOnly><button
                    onClick={() => handleDeleteRecord(selectedRecord.id)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-semibold rounded-lg hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Hapus
                  </button></PusatOnly>
                </div>
              </div>
            )}

            {/* Centered Slide */}
            <div className="w-full flex justify-center overflow-x-auto py-2">
              <div className="w-full max-w-[1280px]">
                <RealisasiSlide data={activeSlideData} slideRef={slideRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
