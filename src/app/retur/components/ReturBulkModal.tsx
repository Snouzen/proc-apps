import React from "react";
import { X, ChevronDown, Search, FileSpreadsheet, Upload, ChevronRight, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), { ssr: false });

export function ReturBulkModal({
  showBulkModal,
  setShowBulkModal,
  bulkStep,
  setBulkStep,
  bulkRetailerId,
  setBulkRetailerId,
  searchRetailerText,
  setSearchRetailerText,
  isDropdownOpen,
  setIsDropdownOpen,
  activeIndex,
  setActiveIndex,
  filteredRetailers,
  handleSelectRetailer,
  dropdownRef,
  retailers,
  openExcelModal,
  setOpenExcelModal,
  fetchRetur
}: any) {
  if (!showBulkModal && !openExcelModal) return null;

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-black px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <>
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowBulkModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-300 overflow-visible">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between rounded-t-[40px]">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Bulk Upload Retur</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Step {bulkStep} of 2: {bulkStep === 1 ? 'Pilih Ritel' : 'Upload File'}</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer">
                <ChevronDown size={20} />
              </button>
            </div>

            <div className="p-8 overflow-visible">
              {bulkStep === 1 ? (
                <div className="space-y-8">
                  <div className="bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 p-5 rounded-[24px] text-xs font-bold leading-relaxed shadow-sm">
                    Pilih perusahaan peritel (Modern Ritel) terlebih dahulu untuk memandu pemetaan data secara spesifik sebelum mengunggah berkas.
                  </div>

                  <div className="flex flex-col items-center max-w-md mx-auto w-full space-y-6 pb-2">
                    <div className="w-full relative" ref={dropdownRef}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                        Pilih Ritel Modern
                      </label>
                      
                      <div className="relative group">
                        <input 
                          type="text"
                          placeholder="Ketik untuk mencari ritel..."
                          value={searchRetailerText}
                          onChange={(e) => {
                            setSearchRetailerText(e.target.value);
                            setIsDropdownOpen(true);
                            if (!e.target.value) setBulkRetailerId("");
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          onKeyDown={(e) => {
                             if (!isDropdownOpen) return;
                             if (e.key === "ArrowDown") {
                                setActiveIndex((prev: number) => (prev < filteredRetailers.length - 1 ? prev + 1 : prev));
                                e.preventDefault();
                             } else if (e.key === "ArrowUp") {
                                setActiveIndex((prev: number) => (prev > 0 ? prev - 1 : prev));
                                e.preventDefault();
                             } else if (e.key === "Enter" && activeIndex >= 0) {
                                handleSelectRetailer(filteredRetailers[activeIndex]);
                                e.preventDefault();
                             }
                          }}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all text-sm font-black text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-24"
                        />
                        
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {searchRetailerText && (
                            <button 
                              onClick={() => {
                                setSearchRetailerText("");
                                setBulkRetailerId("");
                                setIsDropdownOpen(true);
                              }}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <ChevronDown size={20} className={`text-slate-300 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                        </div>
                      </div>

                      {isDropdownOpen && (
                        <ul className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-slate-900/50 max-h-[250px] overflow-y-auto z-[999] py-2 animate-in fade-in slide-in-from-top-2 duration-300 scrollbar-hide">
                          {filteredRetailers.length > 0 ? (
                            filteredRetailers.map((r: any, idx: number) => (
                              <li 
                                key={r.id}
                                onClick={() => handleSelectRetailer(r)}
                                onMouseEnter={() => setActiveIndex(idx)}
                                className={`px-5 py-3.5 cursor-pointer text-xs font-black uppercase tracking-tighter transition-all border-b border-slate-50 last:border-0 ${
                                  bulkRetailerId === r.id || activeIndex === idx 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                {highlightMatch(r.namaPt, searchRetailerText)}
                                {bulkRetailerId === r.id && <div className={`mt-1 text-[8px] font-medium ${activeIndex === idx ? 'text-indigo-200' : 'text-indigo-400'} animate-pulse`}>SELECTED</div>}
                              </li>
                            ))
                          ) : (
                            <li className="px-5 py-10 text-center flex flex-col items-center gap-3">
                               <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-200 dark:text-slate-600"><Search size={24} /></div>
                               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                  Data &quot;{searchRetailerText}&quot; Tidak Ada
                               </span>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    <button 
                      disabled={!bulkRetailerId}
                      onClick={() => setBulkStep(2)}
                      className={`w-full py-5 rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                        bulkRetailerId 
                        ? "bg-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 hover:-translate-y-0.5" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      LANJUTKAN KE UPLOAD <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-[24px]">
                     <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm">
                        <FileSpreadsheet size={18} />
                     </div>
                     <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                        Retailer: {retailers.find((r: any) => r.id === bulkRetailerId)?.namaPt}
                     </span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-[32px] p-10 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-5">
                    <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
                       <Upload size={32} />
                    </div>
                    <div>
                       <p className="text-sm font-black text-slate-700">Sistem Sudah Siap</p>
                       <p className="text-xs font-medium text-slate-500 mt-1 max-w-[250px] mx-auto">
                          Klik tombol di bawah ini untuk memunculkan jendela upload file Excel.
                       </p>
                    </div>
                    <button 
                       onClick={() => {
                          setShowBulkModal(false);
                          setTimeout(() => setOpenExcelModal(true), 200);
                       }}
                       className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
                    >
                       <FileSpreadsheet size={16} /> Buka Menu Upload
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                       setBulkStep(1);
                       setIsDropdownOpen(true);
                    }}
                    className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Ganti Retailer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {openExcelModal && (
        <ExcelBulkModal 
          open={openExcelModal}
          onClose={() => setOpenExcelModal(false)}
          variant="retur"
          retailerId={bulkRetailerId}
          retailerInisial={retailers.find((r: any) => r.id === bulkRetailerId)?.inisial || ""}
          onSuccess={() => {
             setOpenExcelModal(false);
             fetchRetur();
          }}
        />
      )}
    </>
  );
}
