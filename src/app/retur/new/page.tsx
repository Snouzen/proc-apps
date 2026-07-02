"use client";

import React, { Suspense } from "react";
import { 
  ArrowLeft, 
  Save, 
  Building2, 
  Package, 
  Truck, 
  CreditCard, 
  Search, 
  Check, 
  X, 
  Loader2, 
  ChevronDown, 
  ChevronRight 
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useNewRetur, formatRupiahDisplay } from "./hooks/useNewRetur";
import { EliteSearchableInput, EliteProductInput, CustomInlineDatePicker } from "./components/NewReturInputs";

function NewReturPageContent() {
  const {
    router,
    loading,
    isMounted,
    retailerName,
    formData,
    setFormData,
    items,
    currentItem,
    setCurrentItem,
    setTujuanFilter,
    setInisialFilter,
    setProdukFilter,
    setLokasiFilter,
    setPembebananFilter,
    units,
    isTujuanOpen,
    setIsTujuanOpen,
    isInisialOpen,
    setIsInisialOpen,
    isProdukOpen,
    setIsProdukOpen,
    isLokasiOpen,
    setIsLokasiOpen,
    isPembebananOpen,
    setIsPembebananOpen,
    isStatusOpen,
    setIsStatusOpen,
    activeStatusIndex,
    setActiveStatusIndex,
    STATUS_OPTIONS,
    filteredInisial,
    filteredTujuan,
    filteredLokasi,
    filteredPembebanan,
    filteredProducts,
    addItem,
    removeItem,
    handleSubmit,
  } = useNewRetur();

  if (!isMounted)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="sticky top-0 z-[50] bg-white/70 dark:bg-transparent border-b border-slate-100 dark:border-transparent shadow-sm dark:shadow-none transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-500 dark:text-slate-400 cursor-pointer active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-4">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                  Tambah Data Retur
                </h1>
                {retailerName && (
                  <div
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl border transition-all animate-in slide-in-from-left duration-700 ${retailerName === "Ritel Tidak Terdeteksi" ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-indigo-50 border-indigo-100 text-indigo-700"}`}
                  >
                    <Building2
                      size={14}
                      className={
                        retailerName === "Ritel Tidak Terdeteksi"
                          ? "text-rose-400"
                          : "text-indigo-400"
                      }
                    />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {retailerName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 pb-32">
        <form onSubmit={handleSubmit} className="space-y-10 overflow-visible">
          <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-visible">
            <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/50 flex items-center gap-4 rounded-t-[40px]">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Informasi Utama Produk
                </h2>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  Detail barang dan nilai retur
                </p>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 overflow-visible">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  RTV / CN Number
                </label>
                <input
                  type="text"
                  value={formData.rtvCn || ""}
                  onChange={(e) => setFormData({ ...formData, rtvCn: e.target.value })}
                  placeholder="Masukkan nomor RTV/CN"
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-2xl outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="space-y-2 hidden">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                  Kode Toko
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.kodeToko === 0 || formData.kodeToko === null ? "" : formData.kodeToko}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, kodeToko: cleanVal });
                  }}
                  placeholder="Masukkan kode toko"
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-2xl outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                />
              </div>
              <EliteSearchableInput
                label="Inisial Ritel"
                placeholder="Pilih Inisial..."
                icon={Search}
                value={formData.inisial}
                onSearch={setInisialFilter}
                onCommit={(val: string) => setFormData((p: any) => ({ ...p, inisial: val, namaCompany: "" }))}
                items={filteredInisial}
                open={isInisialOpen}
                onOpenChange={setIsInisialOpen}
              />
              <EliteSearchableInput
                label={<span>Tujuan (Toko/DC) <span className="text-rose-500">*</span></span>}
                placeholder="Cari atau Ketik Tujuan..."
                icon={Search}
                value={formData.namaCompany}
                onSearch={setTujuanFilter}
                onCommit={(val: string) => setFormData((p: any) => ({ ...p, namaCompany: val }))}
                items={filteredTujuan}
                open={isTujuanOpen}
                onOpenChange={setIsTujuanOpen}
              />
              <div className="md:col-span-1" />

              <div className="md:col-span-2 pt-6 border-t border-slate-50">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Package size={14} /> Input Barang Retur
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1">
                    <EliteProductInput
                      label="Nama Produk / Barang"
                      placeholder="Cari Nama Produk..."
                      value={currentItem.produk}
                      onSearch={setProdukFilter}
                      onCommit={(val: string) => setCurrentItem((p: any) => ({ ...p, produk: val }))}
                      items={filteredProducts}
                      open={isProdukOpen}
                      onOpenChange={setIsProdukOpen}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                      Qty
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 dark:focus:border-emerald-500 transition-all text-sm font-black text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={currentItem.qtyReturn === 0 ? "" : currentItem.qtyReturn}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCurrentItem({ ...currentItem, qtyReturn: v === "" ? 0 : Number(v) });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
                      Nominal Retur (IDR)
                    </label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-xs pointer-events-none">
                        Rp
                      </div>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 dark:focus:border-emerald-500 transition-all text-sm font-black text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right"
                        value={currentItem.nominal === 0 ? "" : currentItem.nominal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCurrentItem({ ...currentItem, nominal: v === "" ? 0 : Number(v) });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest ml-1">
                      RP / KG
                    </label>
                    <div className="px-5 py-4 text-[10px] font-black text-indigo-400 bg-indigo-50/30 rounded-2xl border-2 border-transparent h-[52px] flex items-center">
                      {currentItem.rpKg > 0 ? `Rp ${formatRupiahDisplay(currentItem.rpKg)}` : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm shadow-indigo-100/50 border border-indigo-100"
                  >
                    Tambah ke Daftar
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="px-10 py-6 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/20 dark:bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-indigo-500 rounded-full" />
                  <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Daftar Barang ({items.length})
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                      <th className="px-10 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">No</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Produk</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Nominal (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">RP/KG</th>
                      <th className="px-10 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-10 py-5 text-xs font-black text-slate-300">{String(idx + 1).padStart(2, "0")}</td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{item.produk}</p>
                        </td>
                        <td className="px-6 py-5 text-right text-xs font-black text-slate-900 dark:text-slate-100">{item.qtyReturn}</td>
                        <td className="px-6 py-5 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">Rp {formatRupiahDisplay(item.nominal)}</td>
                        <td className="px-6 py-5 text-right text-xs font-bold text-slate-400">Rp {formatRupiahDisplay(item.rpKg)}</td>
                        <td className="px-10 py-5 text-center">
                          <button type="button" onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/30 dark:bg-indigo-900/20">
                      <td colSpan={3} className="px-10 py-5 text-[10px] font-black text-indigo-700 uppercase tracking-widest text-right">Total Nominal</td>
                      <td className="px-6 py-5 text-right text-sm font-black text-indigo-700">Rp {formatRupiahDisplay(items.reduce((sum, it) => sum + (it.nominal || 0), 0))}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-visible">
            <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/50 flex items-center gap-4 rounded-t-[40px]">
              <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
                <Truck className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Logistik & Administrasi</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Status pengiriman</p>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 overflow-visible">
              <EliteSearchableInput
                label="Lokasi Barang"
                placeholder="Pilih Lokasi..."
                icon={Search}
                value={units.find((u) => u.idRegional === formData.lokasiBarangId)?.siteArea || ""}
                onSearch={setLokasiFilter}
                onCommit={(val: string) => {
                  const u = units.find((x) => x.siteArea === val);
                  setFormData((p: any) => ({ ...p, lokasiBarangId: u?.idRegional || "" }));
                }}
                items={filteredLokasi.map((u) => u.siteArea)}
                open={isLokasiOpen}
                onOpenChange={setIsLokasiOpen}
              />
              <EliteSearchableInput
                label="Pembebanan Retur"
                placeholder="Pilih Pembebanan..."
                icon={Search}
                value={units.find((u) => u.idRegional === formData.pembebananReturnId)?.siteArea || ""}
                onSearch={setPembebananFilter}
                onCommit={(val: string) => {
                  const u = units.find((x) => x.siteArea === val);
                  setFormData((p: any) => ({ ...p, pembebananReturnId: u?.idRegional || "" }));
                }}
                items={filteredPembebanan.map((u) => u.siteArea)}
                open={isPembebananOpen}
                onOpenChange={setIsPembebananOpen}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Tanggal RTV</label>
                <CustomInlineDatePicker
                  value={formData.tanggalRtv}
                  onChange={(date) => setFormData({ ...formData, tanggalRtv: date })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Max Pickup</label>
                <CustomInlineDatePicker
                  value={formData.maxPickup}
                  onChange={(date) => setFormData({ ...formData, maxPickup: date })}
                  colorScheme="rose"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Status Barang</label>
                <Popover.Root
                  open={isStatusOpen}
                  onOpenChange={(open) => {
                    setIsStatusOpen(open);
                    if (!open) setActiveStatusIndex(-1);
                  }}
                >
                  <Popover.Trigger asChild>
                    <button
                      type="button"
                      onKeyDown={(e) => {
                        if (!isStatusOpen) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveStatusIndex((p) => p < STATUS_OPTIONS.length - 1 ? p + 1 : p);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveStatusIndex((p) => (p > 0 ? p - 1 : p));
                        } else if (e.key === "Enter") {
                          if (activeStatusIndex !== -1 && STATUS_OPTIONS[activeStatusIndex]) {
                            e.preventDefault();
                            setFormData({ ...formData, statusBarang: STATUS_OPTIONS[activeStatusIndex] });
                            setIsStatusOpen(false);
                          }
                        }
                      }}
                      className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent hover:border-emerald-200 dark:hover:border-emerald-500 rounded-2xl outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                    >
                      <span className="uppercase tracking-widest">{formData.statusBarang}</span>
                      <ChevronDown size={18} className="text-slate-300" />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-[9999] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden w-[var(--radix-popover-trigger-width)]"
                      sideOffset={5}
                      sticky="always"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="p-1">
                        {STATUS_OPTIONS.map((st, idx) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, statusBarang: st });
                              setIsStatusOpen(false);
                            }}
                            className={`w-full px-6 py-4 text-left text-xs font-black uppercase tracking-widest flex items-center justify-between rounded-xl transition-all cursor-pointer ${formData.statusBarang === st || idx === activeStatusIndex ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-emerald-900/50" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}
                          >
                            {st}
                            {(formData.statusBarang === st || idx === activeStatusIndex) && <Check size={16} />}
                          </button>
                        ))}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
              <div className="md:col-span-1 space-y-2 invisible" />

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Link RTV</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-400 dark:focus:border-emerald-500 rounded-2xl outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-visible">
            <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/50 flex items-center gap-4 rounded-t-[40px]">
              <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-100">
                <CreditCard className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Pembayaran</h2>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Catatan tambahan</p>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 overflow-visible">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Referensi Pembayaran</label>
                <input
                  type="text"
                  value={formData.referensiPembayaran}
                  onChange={(e) => setFormData({ ...formData, referensiPembayaran: e.target.value })}
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-amber-400 dark:focus:border-amber-500 rounded-2xl outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Tanggal Pembayaran</label>
                <CustomInlineDatePicker
                  value={formData.tanggalPembayaran}
                  onChange={(date) => setFormData({ ...formData, tanggalPembayaran: date })}
                  colorScheme="slate"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">SDI Return Status</label>
                <input
                  type="text"
                  value={formData.sdiReturn}
                  onChange={(e) => setFormData({ ...formData, sdiReturn: e.target.value })}
                  className="w-full px-5 py-4 text-xs font-black text-amber-600 dark:text-amber-500 bg-amber-50/30 dark:bg-amber-900/20 border-2 border-transparent rounded-2xl outline-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Invoice Rekon (No. Invoice)</label>
                <input
                  type="text"
                  value={formData.invoiceRekon || ""}
                  onChange={(e) => setFormData({ ...formData, invoiceRekon: e.target.value })}
                  placeholder="Isi jika sudah direkon"
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-2xl outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">Remarks / Catatan</label>
                <textarea
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-5 py-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-[28px] outline-none resize-none cursor-pointer text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-6 pt-12 pb-20">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-all cursor-pointer"
            >
              {"Batal & Kembali"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-3 px-12 py-4 bg-indigo-600 text-white rounded-[28px] text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-95 disabled:opacity-50 group cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} className="group-hover:-translate-y-0.5 transition-transform" />
              )}
              {"Simpan Data Retur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewReturPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      }
    >
      <NewReturPageContent />
    </Suspense>
  );
}
