import { Search, LayoutList, Building2, Package, Check, Loader2, Pencil } from "lucide-react";
import { 
  FilterSelect, 
  CustomInlineDatePicker, 
  SmoothRowSelect 
} from "./ReturShared";

interface ReturFilterBarProps {
  search: string;
  setSearch: (val: string) => void;
  isGroupedMode: boolean;
  total: number;
  totalQty: number;
  totalNominal: number;
  formatNumber: (val: any) => string;
  formatIDR: (val: any) => string;
  selectedRetailerId: string | null;
  filterInisial: string;
  setFilterInisial: (val: string) => void;
  filterToko: string;
  setFilterToko: (val: string) => void;
  filterLokasi: string;
  setFilterLokasi: (val: string) => void;
  dateFrom: string | null;
  setDateFrom: (val: string | null) => void;
  dateTo: string | null;
  setDateTo: (val: string | null) => void;
  selectedStatus: string | null;
  setSelectedStatus: (val: string | null) => void;
  rowsPerPage: number;
  setRowsPerPage: (val: number) => void;
  setPage: (val: number) => void;
  isMassEditing: boolean;
  isSavingMass: boolean;
  handleCancelMassEdit: () => void;
  handleSaveMassEdit: () => void;
  handleStartMassEdit: () => void;
  filterOptions: { inisials: string[]; tokos: string[] };
  availableLocations: string[];
}

export function ReturFilterBar({
  search,
  setSearch,
  isGroupedMode,
  total,
  totalQty,
  totalNominal,
  formatNumber,
  formatIDR,
  selectedRetailerId,
  filterInisial,
  setFilterInisial,
  filterToko,
  setFilterToko,
  filterLokasi,
  setFilterLokasi,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  selectedStatus,
  setSelectedStatus,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  isMassEditing,
  isSavingMass,
  handleCancelMassEdit,
  handleSaveMassEdit,
  handleStartMassEdit,
  filterOptions,
  availableLocations
}: ReturFilterBarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group w-full md:w-[450px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            size={18}
          />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Cari RTV/CN, Toko, atau Produk..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-sm shadow-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          {!isGroupedMode && (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Record</span>
                    <span className="text-sm font-black text-indigo-700 tabular-nums">{total}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Total QTY</span>
                    <span className="text-sm font-black text-emerald-700 tabular-nums">{formatNumber(totalQty)}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Total Nominal</span>
                    <span className="text-sm font-black text-amber-700 tabular-nums">{formatIDR(totalNominal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedRetailerId && (
        <div className="mt-2">
          <div className="p-4 lg:p-5 bg-slate-50/50 rounded-[32px] border border-slate-100/50 flex flex-wrap items-end gap-x-5 gap-y-2.5 animate-in slide-in-from-top-4 duration-500">
          <FilterSelect 
            label="Inisial Ritel"
            placeholder="Semua Inisial"
            icon={LayoutList}
            value={filterInisial}
            onCommit={setFilterInisial}
            items={filterOptions.inisials}
          />
          <FilterSelect 
            label="Cabang / Toko"
            placeholder="Semua Toko"
            icon={Building2}
            value={filterToko}
            onCommit={setFilterToko}
            items={filterOptions.tokos}
          />
          <FilterSelect 
            label="Lokasi Barang"
            placeholder="Semua Lokasi"
            icon={Package}
            value={filterLokasi}
            onCommit={setFilterLokasi}
            items={["BELUM ADA LOKASI", ...availableLocations]}
          />
          
          <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-400">Mulai Dari</label>
              <CustomInlineDatePicker 
                value={dateFrom} 
                onChange={setDateFrom}
                placeholder="Pilih Tanggal"
              />
          </div>

          <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-slate-400">Hingga Akhir</label>
              <CustomInlineDatePicker 
                value={dateTo} 
                onChange={setDateTo}
                placeholder="Pilih Tanggal"
              />
          </div>

          <div className="w-full flex items-center justify-end gap-3 mt-0.5 pt-2 border-t border-slate-100/30">
              {(filterInisial || filterToko || filterLokasi || dateFrom || dateTo || selectedStatus) && (
                <button 
                  onClick={() => {
                    setFilterInisial("");
                    setFilterToko("");
                    setFilterLokasi("");
                    setDateFrom(null);
                    setDateTo(null);
                    setSelectedStatus(null);
                  }}
                  className="px-4 py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
                >
                  Reset Filter
                </button>
              )}
              <SmoothRowSelect 
                value={rowsPerPage} 
                onChange={(v) => { setRowsPerPage(v); setPage(1); }}
              />
              
              {/* Mass Edit Controls */}
              {isMassEditing ? (
                <div className="flex items-center gap-2">
                  <button onClick={handleCancelMassEdit} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-rose-100 transition-all shadow-sm active:scale-95">Batal</button>
                  <button onClick={handleSaveMassEdit} disabled={isSavingMass} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-emerald-700 transition-all shadow-md active:scale-95">
                    {isSavingMass ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save All
                  </button>
                </div>
              ) : (
                <button onClick={handleStartMassEdit} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-indigo-100 transition-all shadow-sm active:scale-95">
                  <Pencil size={14} /> Edit All
                </button>
              )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
