import React from "react";
import { X, Calendar, CheckCircle2, Eye } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";
import PODetailModal from "@/components/po-detail-modal";

export default function ScheduleModals({
  modalOpen,
  setModalOpen,
  selectedPo,
  selectedDate,
  setSelectedDate,
  namaSupir,
  setNamaSupir,
  platNomor,
  setPlatNomor,
  updatingId,
  handleUpdateSchedule,
  isViewOpen,
  setIsViewOpen,
  detailData,
  setDetailData,
  pdfPreviewUrl,
  setPdfPreviewUrl,
}: any) {
  return (
    <>
      {/* ── Set Delivery Schedule Modal ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <Calendar className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Set Delivery Schedule
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    PO{" "}
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      #{selectedPo?.noPo}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Tanggal Kirim
                </label>
                <DateInputHybrid
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="Pilih tanggal kirim..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Nama Supir{" "}
                  <span className="text-[10px] text-slate-300 dark:text-slate-500 normal-case font-normal">
                    (Opsional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama supir..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  value={namaSupir}
                  onChange={(e) => setNamaSupir(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Plat Nomor{" "}
                  <span className="text-[10px] text-slate-300 dark:text-slate-500 normal-case font-normal">
                    (Opsional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: B 1234 ABC"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  value={platNomor}
                  onChange={(e) => setPlatNomor(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-7 pb-7">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-5 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                disabled={!selectedDate || !!updatingId}
                onClick={handleUpdateSchedule}
                className="flex-1 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {updatingId ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Simpan Jadwal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Modal (Component) ────────────────────────────────── */}
      <PODetailModal
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setDetailData(null);
        }}
        data={
          detailData
            ? {
                ...detailData,
                buktiKirim: detailData.buktiKirim,
                buktiFp: detailData.buktiFp,
                status: {
                  kirim: !!detailData.statusKirim,
                  sdif: !!detailData.statusSdif,
                  po: !!detailData.statusPo,
                  fp: !!detailData.statusFp,
                  kwi: !!detailData.statusKwi,
                  inv: !!detailData.statusInv,
                  tagih: !!detailData.statusTagih,
                  bayar: !!detailData.statusBayar,
                },
              }
            : null
        }
      />

      {/* ── Live Preview Modal ─────────────────────────────────────────── */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200">
          <div className="bg-slate-100 w-full max-w-5xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Eye className="text-indigo-600" size={18} />
                </div>
                <h3 className="font-bold text-slate-800">
                  Live Preview Invoice
                </h3>
              </div>
              <button
                onClick={() => setPdfPreviewUrl(null)}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* PDF Viewer (Iframe) */}
            <div className="flex-1 w-full h-full bg-slate-200">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
