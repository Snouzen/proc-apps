"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Package,
  AlertCircle,
  Building,
} from "lucide-react";
import Link from "next/link";
import PODetailModal from "@/components/po-detail-modal";
import { LoaderThree } from "@/components/ui/loader";
import { getMe } from "@/lib/me";
import Combobox from "@/components/combobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Retailer = {
  id: string;
  namaPt: string;
  inisial: string | null;
};

export default function PurchaseOrderList() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedRetailerName, setSelectedRetailerName] = useState("");
  const [loadingRetailers, setLoadingRetailers] = useState(true);
  
  const [loadingData, setLoadingData] = useState(false);
  const [poData, setPoData] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const lastCtrlRef = useRef<AbortController | null>(null);

  const retailersOptions = useMemo(() => 
    retailers.map(r => `${r.namaPt}${r.inisial ? ` (${r.inisial})` : ''}`)
  , [retailers]);

  useEffect(() => {
    fetch("/api/ritel")
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setRetailers(list);
      })
      .finally(() => {
        setLoadingRetailers(false);
        setIsInitialLoad(false);
      });
  }, []);

  const handleFetchData = async () => {
    if (!selectedRetailerName) return;
    
    const selected = retailers.find(r => 
      `${r.namaPt}${r.inisial ? ` (${r.inisial})` : ''}` === selectedRetailerName
    );
    
    if (!selected) return;

    setLoadingData(true);
    if (lastCtrlRef.current) lastCtrlRef.current.abort();
    const ctrl = new AbortController();
    lastCtrlRef.current = ctrl;

    try {
      const url = `/api/po?retailerId=${encodeURIComponent(selected.id)}&summary=true`;
      const res = await fetch(url, { signal: ctrl.signal });
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.data || [];
      setPoData(list);
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const stats = useMemo(() => {
    if (!poData.length) return null;
    const totalPo = poData.length;
    const totalNominal = poData.reduce((acc, po) => {
      const items = Array.isArray(po.Items) ? po.Items : [];
      return acc + items.reduce((iAcc: number, it: any) => iAcc + (Number(it.nominal) || 0), 0);
    }, 0);
    const totalItems = poData.reduce((acc, po) => {
      const items = Array.isArray(po.Items) ? po.Items : [];
      return acc + items.reduce((iAcc: number, it: any) => iAcc + (Number(it.pcs) || 0), 0);
    }, 0);

    return { totalPo, totalNominal, totalItems };
  }, [poData]);

  const filteredPo = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return poData;
    return poData.filter(po => 
      (po.noPo || "").toLowerCase().includes(q) ||
      (po.noInvoice || "").toLowerCase().includes(q)
    );
  }, [poData, searchFilter]);

  const openDetail = async (po: any) => {
    setSelectedPO(po);
    setIsModalOpen(true);
  };

  if (isInitialLoad) return <div className="py-20"><LoaderThree label="Inisialisasi..." /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      {/* Selection Header Card */}
      <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Building size={120} />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-3xl font-black tracking-tight">Purchase Order Monitoring</CardTitle>
          <CardDescription className="text-slate-300 font-medium">
            Pilih peritel untuk memantau ringkasan Purchase Order secara real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Pilih Peritel Modern
              </label>
              <Combobox
                options={retailersOptions}
                value={selectedRetailerName}
                onChange={setSelectedRetailerName}
                placeholder="Cari nama peritel..."
                inputClassName="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>
            <button
              onClick={handleFetchData}
              disabled={!selectedRetailerName || loadingData}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap h-[46px]"
            >
              {loadingData ? <LoaderThree label="" /> : <ArrowUpRight size={18} />}
              Tampilkan Data
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {!selectedRetailerName || (!loadingData && poData.length === 0 && !stats) ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-6 bg-slate-50 rounded-full text-slate-300">
            <Search size={64} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">
              {selectedRetailerName ? "Tidak Ada Data Ditemukan" : "Pilih Peritel untuk melihat ringkasan data"}
            </h3>
            <p className="text-slate-500 max-w-sm">
              Gunalan filter di atas untuk menarik data Purchase Order dari database.
            </p>
          </div>
        </div>
      ) : loadingData ? (
        <div className="py-24">
          <LoaderThree label="Menarik data PO..." />
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-xl bg-blue-50/50">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Total PO</p>
                  <p className="text-2xl font-black text-slate-900">{stats?.totalPo.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-emerald-50/50">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Total Nominal</p>
                  <p className="text-2xl font-black text-slate-900">
                    Rp {stats?.totalNominal.toLocaleString('id-ID')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-purple-50/50">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-4 bg-purple-600 rounded-2xl text-white shadow-lg shadow-purple-200">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-purple-600 uppercase tracking-widest">Total Item (Pcs)</p>
                  <p className="text-2xl font-black text-slate-900">{stats?.totalItems.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PO List Table Card */}
          <Card className="border border-slate-100 shadow-2xl overflow-hidden rounded-3xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Daftar Purchase Order</CardTitle>
                <CardDescription>Menampilkan semua data PO untuk {selectedRetailerName}</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Cari No PO / Invoice..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100">
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest pl-6">No PO</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest">Tgl PO</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest">No Invoice</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest">Regional/Area</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPo.length > 0 ? (
                      filteredPo.map((po) => (
                        <TableRow key={po.id} className="hover:bg-slate-50/80 transition-colors border-slate-50">
                          <TableCell className="font-bold text-slate-800 py-4 pl-6">{po.noPo}</TableCell>
                          <TableCell className="text-slate-500 italic">
                            {po.tglPo ? new Date(po.tglPo).toLocaleDateString('id-ID') : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">{po.noInvoice || '-'}</TableCell>
                          <TableCell className="text-slate-600">
                            <div className="flex flex-col">
                              <span className="font-bold text-[11px] text-slate-400 uppercase leading-none mb-1">
                                {po.UnitProduksi?.namaRegional || po.regional || '-'}
                              </span>
                              <span className="text-xs">{po.UnitProduksi?.siteArea || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <button
                              onClick={() => openDetail(po)}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                              title="Lihat Detail"
                            >
                              <ArrowUpRight size={18} />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                          Tidak ada data PO yang sesuai pencarian.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPO && (
        <PODetailModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPO(null);
          }}
          data={{
            ...selectedPO,
            company: selectedPO?.RitelModern?.namaPt || selectedPO?.company || "Unknown",
            ritelId: selectedPO?.ritelId || null, // Tambahan untuk PODetailModal
            status: {
              kirim: !!selectedPO.statusKirim,
              sdif: !!selectedPO.statusSdif,
              po: !!selectedPO.statusPo,
              fp: !!selectedPO.statusFp,
              kwi: !!selectedPO.statusKwi,
              inv: !!selectedPO.statusInv,
              tagih: !!selectedPO.statusTagih,
              bayar: !!selectedPO.statusBayar,
            }
          }}
        />
      )}
    </div>
  );
}
