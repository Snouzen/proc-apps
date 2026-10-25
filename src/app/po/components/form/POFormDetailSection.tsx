import React from "react";
import { Plus, Tag } from "lucide-react";
import Combobox from "@/components/combobox";

interface POFormDetailSectionProps {
  formData: any;
  setFormData: any;
  productOptions: any[];
  invalidProduct?: boolean;
  currentItem: any;
  setCurrentItem: any;
  numberNoSpinner: string;
  formatNumber: (n: any) => string;
  formatCurrency: (n: any) => string;
  parseRupiah: (s: any) => number;
  currentHargaKg: number;
  currentKg: number;
  currentKgKirim: number;
  currentNominal: number;
  currentRpTagih: number;
  handleAddItem: () => void;
}

export default function POFormDetailSection({
  formData,
  setFormData,
  productOptions,
  invalidProduct,
  currentItem,
  setCurrentItem,
  numberNoSpinner,
  formatNumber,
  formatCurrency,
  parseRupiah,
  currentHargaKg,
  currentKg,
  currentKgKirim,
  currentNominal,
  currentRpTagih,
  handleAddItem,
}: POFormDetailSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
          2
        </div>
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">PO Detail</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2 md:col-span-4 space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            Nomor PO
          </label>
          <input
            type="text"
            placeholder="Masukkan Nomor PO..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-semibold dark:text-slate-100"
            value={formData.noPo}
            onChange={(e) => {
              const v = e.target.value;
              setFormData((prev: any) => ({
                ...prev,
                noPo: v,
                status: { ...prev.status, po: !!v.trim() },
              }));
            }}
          />
        </div>
        <div className="col-span-2 md:col-span-4 space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            Nama Produk
          </label>
          <Combobox
            options={productOptions}
            value={currentItem.namaProduk}
            onChange={(v) =>
              setCurrentItem(() => ({
                namaProduk: v,
                pcs: "",
                pcsKirim: "",
                hargaPcs: "",
                discount: "",
              }))
            }
            placeholder="Ketik/cari produk..."
            leftIcon={<Tag size={16} />}
            inputClassName={`pl-11 pr-4 ${invalidProduct ? "border border-rose-300 bg-rose-50 focus:ring-rose-200" : ""}`}
          />
          {invalidProduct && (
            <p className="text-[11px] text-rose-600 mt-1">
              Nama produk tidak ada di daftar
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            PCS
          </label>
          <input
            type="number"
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            value={currentItem.pcs}
            placeholder="Input Pcs"
            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
            onChange={(e) =>
              setCurrentItem((prev: any) => ({
                ...prev,
                pcs: e.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            Harga /Pcs
          </label>
          <input
            type="number"
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            value={currentItem.hargaPcs}
            placeholder="Input Harga"
            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
            onChange={(e) =>
              setCurrentItem((prev: any) => ({
                ...prev,
                hargaPcs: e.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            PCS Kirim
          </label>
          <input
            type="number"
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            value={currentItem.pcsKirim}
            placeholder="Input Pcs Kirim"
            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
            onChange={(e) =>
              setCurrentItem((prev: any) => ({
                ...prev,
                pcsKirim: e.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            Discount
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={currentItem.discount}
            placeholder="0"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100"
            onChange={(e) =>
              setCurrentItem((prev: any) => ({
                ...prev,
                discount: e.target.value,
              }))
            }
            onBlur={() =>
              setCurrentItem((prev: any) => {
                const n = parseRupiah(prev.discount);
                return {
                  ...prev,
                  discount: n ? n.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "",
                };
              })
            }
          />
        </div>
        <div className="col-span-2 sm:col-span-1 md:col-span-1 space-y-1">
          <label
            className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
            title="Rumus: Harga/Kg = Harga/Pcs ÷ (kg/pcs produk)"
          >
            Harga /Kg
          </label>
          <div
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 break-words [overflow-wrap:anywhere] min-h-[44px] flex items-center"
            title={`${formatCurrency(currentHargaKg)} (Rumus: Harga/Pcs ÷ kg/pcs)`}
          >
            {formatCurrency(currentHargaKg)}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 md:col-span-1 space-y-1">
          <label
            className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
            title="Rumus: KG = PCS × (kg/pcs produk)"
          >
            KG (pcs × satuan)
          </label>
          <div
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 break-words [overflow-wrap:anywhere] min-h-[44px] flex items-center"
            title={`${formatNumber(currentKg)} KG (Rumus: PCS × kg/pcs)`}
          >
            {formatNumber(currentKg)}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-2 md:col-span-2 space-y-1">
          <label
            className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
            title="Rumus: KG Kirim = PCS Kirim × (kg/pcs produk)"
          >
            KG Kirim (pcs × satuan)
          </label>
          <div
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 break-words [overflow-wrap:anywhere] min-h-[44px] flex items-center"
            title={`${formatNumber(currentKgKirim)} KG (Rumus: PCS Kirim × kg/pcs)`}
          >
            {formatNumber(currentKgKirim)}
          </div>
        </div>
        <div className="col-span-2 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
              title="Rumus: Nominal = (Harga/Pcs × PCS) - Discount"
            >
              Nominal Original
            </label>
            <div
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 break-words [overflow-wrap:anywhere]"
              title={`${formatCurrency(currentNominal)} (Rumus: (Harga/Pcs × PCS) - Discount)`}
            >
              {formatCurrency(currentNominal)}
            </div>
          </div>
          <div className="space-y-1">
            <label
              className="text-[10px] font-black text-indigo-400 uppercase ml-1"
              title="Rumus: Rp Tagih = (Harga/Pcs × PCS Kirim) - Discount"
            >
              Rp Tagih (Preview)
            </label>
            <div
              className="w-full px-4 py-3 bg-indigo-50/50 rounded-2xl text-sm font-bold text-indigo-600 border border-indigo-100 break-words [overflow-wrap:anywhere]"
              title={`${formatCurrency(currentRpTagih)} (Rumus: (Harga/Pcs × PCS Kirim) - Discount)`}
            >
              {formatCurrency(currentRpTagih)}
            </div>
          </div>
        </div>
        <div className="col-span-full pt-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={18} />
            Tambah Produk
          </button>
        </div>
      </div>
    </section>
  );
}
