import { Eye, FileSpreadsheet, Download, X, Paperclip } from "lucide-react";

export default function DataRekonModals({ hook }: { hook: any }) {
  const {
    pdfPreviewUrl, setPdfPreviewUrl,
    previewItem, setPreviewItem,
    total, startDate, endDate,
    buktiBayarPreviewUrl, setBuktiBayarPreviewUrl
  } = hook;

  return (
    <>
      {/* ── PDF Preview Modal ─── */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200">
          <div className="bg-slate-100 dark:bg-slate-900 w-full max-w-6xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl">
                  <Eye className="text-indigo-600 dark:text-indigo-400" size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Preview Laporan Rekonsiliasi</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {total} Data {startDate || endDate ? `• ${startDate || "..."} s/d ${endDate || "..."}` : "• Semua Periode"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                     if(previewItem) {
                        const { generateRekonExcel } = await import("@/lib/generateRekonExcel");
                        generateRekonExcel([previewItem], {});
                     }
                  }}
                  className="h-10 px-5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-all active:scale-95"
                >
                  <FileSpreadsheet size={14} />
                  Excel
                </button>
                <a
                  href={pdfPreviewUrl}
                  download={`Rekon_Report_${new Date().toISOString().slice(0,10)}.pdf`}
                  className="h-10 px-5 bg-[#0f172a] dark:bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all active:scale-95"
                >
                  <Download size={14} />
                  PDF
                </a>
                <button
                  onClick={() => { setPdfPreviewUrl(null); setPreviewItem(null); }}
                  suppressHydrationWarning
                  className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 w-full h-full bg-slate-200 dark:bg-slate-950">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-none"
                title="Rekon PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
      {/* ── Bukti Bayar Preview Modal ─── */}
      {buktiBayarPreviewUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200">
          <div className="bg-slate-100 dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-500/20 rounded-xl">
                  <Paperclip className="text-amber-600 dark:text-amber-400" size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Preview Bukti Bayar</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Dokumen Pembayaran
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBuktiBayarPreviewUrl(null)}
                  className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 w-full overflow-auto bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-4">
              {/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(buktiBayarPreviewUrl) ? (
                <img
                  src={buktiBayarPreviewUrl}
                  alt="Bukti Bayar"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <iframe
                  src={buktiBayarPreviewUrl}
                  className="w-full h-full border-none min-h-[60vh]"
                  title="Bukti Bayar Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
