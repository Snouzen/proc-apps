"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Calendar, 
  CalendarCheck, 
  Clock, 
  Search, 
  Truck, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import { getMe } from "@/lib/me";
import SmoothSelect from "@/components/ui/smooth-select";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function SchedulePage() {
  const [role, setRole] = useState<string | null>(null);
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [namaSupir, setNamaSupir] = useState("");
  const [platNomor, setPlatNomor] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/po?limit=100");
      const data = await res.json();
      if (data.data) {
        setPoData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch PO data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getMe().then(me => setRole(me?.role || null));
    fetchData();
  }, [fetchData]);

  const handleUpdateSchedule = async () => {
    if (!selectedPo || !selectedDate) return;
    setUpdatingId(selectedPo.id);
    try {
      const res = await fetch("/api/po/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedPo.id, 
          tglKirim: selectedDate,
          namaSupir: namaSupir.trim(),
          platNomor: platNomor.trim()
        })
      });
      if (res.ok) {
        setModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredPo = useMemo(() => {
    if (!search.trim()) return poData;

    const query = search.toLowerCase();

    return poData.filter((po) => {
      const siteArea = String(po.UnitProduksi?.siteArea || po.siteArea || "").toLowerCase();
      const company = String(po.RitelModern?.namaPt || "").toLowerCase();
      const inisial = String(po.RitelModern?.inisial || "").toLowerCase();
      const noPo = String(po.noPo || "").toLowerCase();
      const noInvoice = String(po.noInvoice || "").toLowerCase();

      return (
        siteArea.includes(query) ||
        company.includes(query) ||
        inisial.includes(query) ||
        noPo.includes(query) ||
        noInvoice.includes(query)
      );
    });
  }, [poData, search]);

  const stats = {
    total: poData.length,
    scheduled: poData.filter(po => po.tglkirim).length,
    pending: poData.filter(po => !po.tglkirim).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Delivery Scheduling</h1>
          <p className="text-slate-500 mt-1">Manage delivery schedules for your purchase orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search No PO or Site..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full md:w-72 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total PO", value: stats.total, icon: <Truck className="text-blue-600" />, bg: "bg-blue-50" },
          { label: "Scheduled", value: stats.scheduled, icon: <CalendarCheck className="text-emerald-600" />, bg: "bg-emerald-50" },
          { label: "Pending Schedule", value: stats.pending, icon: <Clock className="text-amber-600" />, bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:translate-y-[-2px]">
            <div className={`p-3 rounded-2xl ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Order</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Inisial</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Site Area</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredPo.length > 0 ? (
                filteredPo.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{po.noPo}</p>
                      <p className="text-xs text-slate-500">{po.RitelModern?.namaPt || "Self"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider">
                        {po.RitelModern?.inisial || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-slate-700">{po.UnitProduksi?.siteArea || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {po.tglPo ? format(new Date(po.tglPo), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {po.tglkirim ? (
                        <div className="inline-flex items-center gap-1.5 py-1 px-3 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                          <AlertCircle size={14} />
                          Scheduled: {format(new Date(po.tglkirim), "dd/MM/yy")}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 py-1 px-3 bg-slate-100 text-slate-500 rounded-full text-xs font-medium border border-slate-200">
                          <Clock size={14} />
                          Not Scheduled
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedPo(po);
                          setSelectedDate(po.tglkirim ? po.tglkirim.split('T')[0] : "");
                          setNamaSupir(po.namaSupir || "");
                          setPlatNomor(po.platNomor || "");
                          setModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <Calendar size={16} />
                        {po.tglkirim ? "Update" : "Set Schedule"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-4 bg-slate-50 rounded-full">
                            <CalendarDays size={32} className="text-slate-300" />
                        </div>
                        <p>No purchase orders found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-8 border border-white/50 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
               <div className="p-3 bg-blue-50 rounded-2xl">
                 <Calendar className="text-blue-600" size={24} />
               </div>
               <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Set Delivery Schedule</h3>
            <p className="text-slate-500 text-sm mb-6">Updating schedule for PO <span className="font-semibold text-slate-700">#{selectedPo?.noPo}</span></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Delivery Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Supir <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                <input 
                  type="text" 
                  placeholder="Masukkan Nama Supir..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                  value={namaSupir}
                  onChange={(e) => setNamaSupir(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plat Nomor <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                <input 
                  type="text" 
                  placeholder="Contoh: B 1234 ABC"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                  value={platNomor}
                  onChange={(e) => setPlatNomor(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  disabled={!selectedDate || !!updatingId}
                  onClick={handleUpdateSchedule}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {updatingId ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Save Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}
