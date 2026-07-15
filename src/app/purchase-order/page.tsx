"use client";

import { useState } from "react";
import { Search, Loader2, Trash2 } from "lucide-react";

import { useAuthData } from "@/hooks/useAuthData";
import { useRetailerFilters } from "@/hooks/useRetailerFilters";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { usePurchaseOrderTable } from "@/hooks/usePurchaseOrderTable";
import { usePoDetailModal } from "@/hooks/usePoDetailModal";

import PODetailModal from "@/components/po-detail-modal";
import POEditModal from "@/components/po-edit-modal";
import BulkUploadModal from "@/components/bulk-upload-modal";
import { Button } from "@/components/ui/button";
import SmoothSelect from "@/components/ui/smooth-select";
import DateInputHybrid from "@/components/DateInputHybrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableV2 } from "@/components/data-table/DataTableV2";

import { PurchaseOrderHeader } from "./_components/PurchaseOrderHeader";
import { PurchaseOrderFilters } from "./_components/PurchaseOrderFilters";
import { getPurchaseOrderColumns } from "./_components/PurchaseOrderColumns";

function AlertCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function PurchaseOrderPage() {
  const { role, regional } = useAuthData();

  const ritelFilters = useRetailerFilters();
  const globalSearch = useGlobalSearch();
  const poTable = usePurchaseOrderTable(ritelFilters.retailers);
  const detailModal = usePoDetailModal({ role, regional });

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editNoPo, setEditNoPo] = useState<string | null>(null);

  if (ritelFilters.isInitialLoad) {
    return (
      <div className="py-32 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium font-sm">Memuat Master Data...</p>
      </div>
    );
  }

  const columns = getPurchaseOrderColumns({ poTable, role, setEditNoPo, setEditOpen });

  return (
    <div className="w-full space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      <Card className="border border-slate-100 shadow-xl bg-white relative rounded-3xl">
        <CardHeader className="relative z-50 pb-4">
          <PurchaseOrderHeader 
            globalSearch={globalSearch} 
            poTable={poTable} 
            detailModal={detailModal} 
            setIsBulkOpen={setIsBulkOpen} 
          />
        </CardHeader>
        <CardContent className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <PurchaseOrderFilters ritelFilters={ritelFilters} poTable={poTable} />
        </CardContent>
      </Card>

      {poTable.poData === null ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-8 bg-slate-50 rounded-full text-slate-200 border border-slate-100 shadow-inner">
            <Search size={80} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">Siap Memuat Data</h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm">Pilih filter Ritel, Regional, atau Unit Produksi di atas untuk memuat data Purchase Order.</p>
          </div>
        </div>
      ) : poTable.poData.length === 0 && !poTable.loadingData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-8 bg-rose-50 rounded-full text-rose-200 border border-rose-100">
            <AlertCircle size={80} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">Data Tidak Ditemukan</h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm">Tidak ada Purchase Order yang sesuai dengan kriteria filter tersebut.</p>
            <Button
              variant="outline"
              onClick={() => {
                ritelFilters.handleSelectNamaPt("");
                poTable.setManualData(null as any, "", "");
              }}
              className="mt-4 rounded-xl border-slate-200 text-slate-800"
            >
              Reset Filter
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          <Card className="mb-8 border-none shadow-xl bg-slate-50/30 dark:bg-slate-800/30 rounded-3xl relative z-10 w-full overflow-visible">
            <CardHeader className="bg-slate-50/30 border-b border-slate-100 p-8 space-y-6 relative z-40">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-2xl font-black text-slate-800 dark:text-slate-100">Daftar Purchase Order</CardTitle>
                    {poTable.activeNamaPt && (
                      <span className="text-xs font-semibold px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full shadow-sm">
                        Total {poTable.filteredPo.length} PO
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Menampilkan data untuk <span className="font-bold text-slate-900 dark:text-slate-100">{poTable.activeNamaPt}</span>
                    {poTable.activeInisial && <span> - Inisial <span className="font-bold text-slate-900 dark:text-slate-100">{poTable.activeInisial}</span></span>}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full md:w-64 shrink-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      value={poTable.searchFilter}
                      onChange={(e) => poTable.setSearchFilter(e.target.value)}
                      placeholder="Cari PO / Invoice..."
                      className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/30 outline-none transition-all placeholder:italic placeholder:text-slate-400 dark:placeholder:text-slate-500 h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
                <div className="w-full sm:w-[150px]"><DateInputHybrid value={poTable.tglFrom} onChange={(v) => poTable.setTglFrom(v)} placeholder="Dari Tgl PO..." maxDate={poTable.tglTo} /></div>
                <div className="w-full sm:w-[150px]"><DateInputHybrid value={poTable.tglTo} onChange={(v) => poTable.setTglTo(v)} placeholder="Sampai Tgl..." minDate={poTable.tglFrom} /></div>
                <div className="w-full sm:w-[160px] relative z-20">
                  <SmoothSelect value={poTable.statusFilter} onChange={(v) => poTable.setStatusFilter(v as any)} options={[{ value: "all", label: "All Status" }, { value: "tagih", label: "Tagih" }, { value: "paid", label: "Paid" }]} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <DataTableV2
                  columns={columns}
                  data={poTable.filteredPo}
                  loading={poTable.loadingData}
                  onRowClick={(po: any) => detailModal.openModal(po)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <PODetailModal open={detailModal.openDetail} onClose={() => detailModal.setOpenDetail(false)} data={detailModal.detailData} />

      {editOpen && editNoPo && (
        <POEditModal open={editOpen} noPo={editNoPo} onClose={() => { setEditOpen(false); setEditNoPo(null); }} onSaved={() => { setEditOpen(false); setEditNoPo(null); poTable.handleFetchData(ritelFilters.selectedNamaPt, ritelFilters.selectedInisial, ritelFilters.selectedTujuan); }} />
      )}

      {poTable.confirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4"><Trash2 size={32} /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Data?</h3>
            <p className="text-slate-500 text-sm mb-6">Anda yakin ingin menghapus PO <span className="font-bold text-slate-800">{poTable.confirmDelete}</span>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => poTable.setConfirmDelete(null)} disabled={poTable.deleting}>Batal</Button>
              <Button className="flex-1 rounded-xl h-12 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200" onClick={() => poTable.handleDelete(poTable.confirmDelete as string)} disabled={poTable.deleting}>
                {poTable.deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Hapus PO"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BulkUploadModal open={isBulkOpen} onClose={() => setIsBulkOpen(false)} onSuccess={() => poTable.handleFetchData(ritelFilters.selectedNamaPt, ritelFilters.selectedInisial, ritelFilters.selectedTujuan)} />
    </div>
  );
}
