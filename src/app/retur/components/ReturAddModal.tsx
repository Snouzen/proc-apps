import React from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";

export function ReturAddModal({
  showAddModal,
  setShowAddModal,
  addDropdownRef,
  searchAddText,
  setSearchAddText,
  isAddDropdownOpen,
  setIsAddDropdownOpen,
  setAddRetailerId,
  addRetailerId,
  filteredRetailers,
  router
}: any) {
  if (!showAddModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAddModal(false)} />
      <div className="relative bg-white dark:bg-slate-800 w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-300 overflow-visible">
        <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between rounded-t-[40px]">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Tambah Data Retur</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Pilih Ritel Modern</p>
          </div>
          <button onClick={() => setShowAddModal(false)} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-visible space-y-8">
          <div className="bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 p-5 rounded-[24px] text-xs font-bold leading-relaxed shadow-sm">
            Pilih perusahaan peritel (Modern Ritel) terlebih dahulu sebelum mengisi form data retur baru.
          </div>

          <div className="flex flex-col items-center max-w-md mx-auto w-full space-y-6 pb-2">
            <div className="w-full relative" ref={addDropdownRef}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                Pilih Ritel Modern
              </label>
              
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="Ketik untuk mencari ritel..."
                  value={searchAddText}
                  onChange={(e) => {
                    setSearchAddText(e.target.value);
                    setIsAddDropdownOpen(true);
                    if (!e.target.value) setAddRetailerId("");
                  }}
                  onFocus={() => setIsAddDropdownOpen(true)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all text-sm font-black text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-24"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {searchAddText && (
                    <button 
                      onClick={() => { setSearchAddText(""); setAddRetailerId(""); setIsAddDropdownOpen(true); }}
                      className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <ChevronDown size={20} className={`text-slate-300 transition-transform duration-500 ${isAddDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                </div>
              </div>

              {isAddDropdownOpen && (
                <ul className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-slate-900/50 max-h-[250px] overflow-y-auto z-[999] py-2 animate-in fade-in slide-in-from-top-2 duration-300 scrollbar-hide">
                  {filteredRetailers
                    .filter((r: any) => r.namaPt.toLowerCase().includes(searchAddText.toLowerCase()))
                    .map((r: any) => (
                    <li 
                      key={r.id}
                      onClick={() => {
                        setAddRetailerId(r.id);
                        setSearchAddText(r.namaPt);
                        setIsAddDropdownOpen(false);
                      }}
                      className={`px-5 py-3.5 cursor-pointer text-xs font-black uppercase tracking-tighter transition-all border-b border-slate-50 last:border-0 ${
                        addRetailerId === r.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r.namaPt}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button 
              disabled={!addRetailerId}
              onClick={() => router.push(`/retur/new?ritelId=${addRetailerId}`)}
              className={`w-full py-5 rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                addRetailerId 
                ? "bg-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 hover:-translate-y-0.5" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 border border-slate-200 dark:border-slate-700"
              }`}
            >
              LANJUTKAN KE FORM INPUT <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
