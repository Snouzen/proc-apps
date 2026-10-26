import React, { Fragment } from "react";
import { Check, Eye, Pencil, Save, Trash2, X } from "lucide-react";

interface POFormPreviewSectionProps {
  items: any[];
  editingItemId: string | null;
  previewItemId: string | null;
  setPreviewItemId: (id: string | null) => void;
  editItem: any;
  setEditItem: any;
  computeDerived: (
    namaProduk: string,
    pcs: any,
    pcsKirim: any,
    hargaPcs: any,
    discount: any
  ) => any;
  handleSaveEditItem: (item: any) => void;
  handleCancelEditItem: () => void;
  handleTogglePreviewItem: (id: string) => void;
  handleStartEditItem: (item: any) => void;
  handleDeleteItem: (id: string) => void;
  totalsAll: { nominal: number; tagihan: number };
  submitting: boolean;
  me: any;
  numberNoSpinner: string;
  formatNumber: (n: any) => string;
  formatCurrency: (n: any) => string;
  parseRupiah: (s: any) => number;
}

export default function POFormPreviewSection({
  items,
  editingItemId,
  previewItemId,
  setPreviewItemId,
  editItem,
  setEditItem,
  computeDerived,
  handleSaveEditItem,
  handleCancelEditItem,
  handleTogglePreviewItem,
  handleStartEditItem,
  handleDeleteItem,
  totalsAll,
  submitting,
  me,
  numberNoSpinner,
  formatNumber,
  formatCurrency,
  parseRupiah,
}: POFormPreviewSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
          5
        </div>
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Preview</h2>
      </div>

      {items.length > 0 ? (
        <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
          {/* Mobile Card List View (< md) */}
          <div className="md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
            {items.map((item: any) => {
              const isEditing = editingItemId === item.id;
              const isPreview = previewItemId === item.id || isEditing;
              const derived = isEditing
                ? computeDerived(
                    item.namaProduk,
                    editItem.pcs,
                    editItem.pcsKirim,
                    editItem.hargaPcs,
                    editItem.discount
                  )
                : {
                    kg: item.kg,
                    kgKirim: item.kgKirim,
                    hargaKg: item.hargaKg,
                    nominal: item.nominal,
                    rpTagih: item.rpTagih,
                  };
              return (
                <div
                  key={`card-${item.id}`}
                  className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 break-words block">
                        {String(item.namaProduk || "-")}
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEditItem(item)}
                            className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="Simpan"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditItem}
                            className="p-2 text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            title="Batal"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTogglePreviewItem(item.id)}
                            className={`p-2 rounded-lg transition-colors ${isPreview ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                            title="Preview Detail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditItem(item)}
                            className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-950/40 rounded-lg hover:bg-rose-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Pcs</label>
                        <input
                          type="number"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={editItem.pcs}
                          onChange={(e) => setEditItem((p: any) => ({ ...p, pcs: e.target.value }))}
                          className={`mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100 ${numberNoSpinner}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-600 uppercase">Pcs Kirim</label>
                        <input
                          type="number"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={editItem.pcsKirim}
                          onChange={(e) => setEditItem((p: any) => ({ ...p, pcsKirim: e.target.value }))}
                          className={`mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100 ${numberNoSpinner}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Harga/Pcs</label>
                        <input
                          type="number"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={editItem.hargaPcs}
                          onChange={(e) => setEditItem((p: any) => ({ ...p, hargaPcs: e.target.value }))}
                          className={`mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100 ${numberNoSpinner}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Discount</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editItem.discount}
                          onChange={(e) => setEditItem((p: any) => ({ ...p, discount: e.target.value }))}
                          onBlur={() =>
                            setEditItem((p: any) => {
                              const n = parseRupiah(p.discount);
                              return {
                                ...p,
                                discount: n ? n.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "",
                              };
                            })
                          }
                          className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Pcs</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{formatNumber(Number(item.pcs || 0))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 block uppercase">Pcs Kirim</span>
                        <span className="font-bold text-amber-600">{formatNumber(Number(item.pcsKirim || 0))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Kg</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">{formatNumber(Number(derived.kg || 0))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Harga/Pcs</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 break-words [overflow-wrap:anywhere]">{formatCurrency(Number(item.hargaPcs || 0))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Discount</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 break-words [overflow-wrap:anywhere]">{formatCurrency(Number(item.discount || 0))}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Nominal Original</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 break-words [overflow-wrap:anywhere]">{formatCurrency(Number(derived.nominal || 0))}</span>
                      </div>
                    </div>
                  )}

                  {/* Summary / Rp Tagih */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-900/40">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">Rp Tagih</span>
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums break-words [overflow-wrap:anywhere]">
                      {formatCurrency(Number(derived.rpTagih || 0))}
                    </span>
                  </div>

                  {isPreview && !isEditing && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider">Detail Tambahan</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">KG Kirim</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatNumber(Number(derived.kgKirim || 0))}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Harga/KG</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200 break-words [overflow-wrap:anywhere]">{formatCurrency(Number(derived.hargaKg || 0))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mobile Total Footprint */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-slate-500 uppercase">Total Original</span>
                <span className="font-medium text-slate-400 line-through tabular-nums break-words [overflow-wrap:anywhere]">{formatCurrency(totalsAll.nominal)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="font-black text-slate-800 dark:text-slate-100">Total Tagihan</span>
                <span className="font-black text-indigo-700 dark:text-indigo-400 text-base tabular-nums break-words [overflow-wrap:anywhere]">{formatCurrency(totalsAll.tagihan)}</span>
              </div>
            </div>
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[900px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3 text-right" title="Input PCS">
                  Pcs
                </th>
                <th
                  className="px-4 py-3 text-right text-amber-600"
                  title="PCS yang dikirim"
                >
                  Pcs Kirim
                </th>
                <th
                  className="px-4 py-3 text-right"
                  title="PCS × kg/pcs"
                >
                  Kg
                </th>
                <th
                  className="px-4 py-3 text-right"
                  title="Harga Per Pcs"
                >
                  Harga/Pcs
                </th>
                <th
                  className="px-4 py-3 text-right"
                  title="Discount rupiah"
                >
                  Discount
                </th>
                <th className="px-4 py-3 text-right">
                  Nominal Original
                </th>
                <th
                  className="px-4 py-3 text-right text-indigo-700"
                  title="Rp Tagih = (PCS Kirim × Harga/Pcs) - Discount"
                >
                  Rp Tagih
                </th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {items.map((item: any) => {
                const isEditing = editingItemId === item.id;
                const isPreview = previewItemId === item.id || isEditing;
                const derived = isEditing
                  ? computeDerived(
                      item.namaProduk,
                      editItem.pcs,
                      editItem.pcsKirim,
                      editItem.hargaPcs,
                      editItem.discount
                    )
                  : {
                      kg: item.kg,
                      kgKirim: item.kgKirim,
                      hargaKg: item.hargaKg,
                      nominal: item.nominal,
                      rpTagih: item.rpTagih,
                    };
                return (
                  <Fragment key={item.id}>
                    <tr className="group hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                        <div
                          className="max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                          title={String(item.namaProduk || "-")}
                        >
                          {String(item.namaProduk || "-")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            value={editItem.pcs}
                            onChange={(e) =>
                              setEditItem((p: any) => ({
                                ...p,
                                pcs: e.target.value,
                              }))
                            }
                            className={`w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                          />
                        ) : (
                          formatNumber(Number(item.pcs || 0))
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 font-bold">
                        {isEditing ? (
                          <input
                            type="number"
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            value={editItem.pcsKirim}
                            onChange={(e) =>
                              setEditItem((p: any) => ({
                                ...p,
                                pcsKirim: e.target.value,
                              }))
                            }
                            className={`w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                          />
                        ) : (
                          formatNumber(Number(item.pcsKirim || 0))
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {formatNumber(Number(derived.kg || 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            value={editItem.hargaPcs}
                            onChange={(e) =>
                              setEditItem((p: any) => ({
                                ...p,
                                hargaPcs: e.target.value,
                              }))
                            }
                            className={`w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                          />
                        ) : (
                          formatNumber(Number(item.hargaPcs || 0))
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editItem.discount}
                            onChange={(e) =>
                              setEditItem((p: any) => ({
                                ...p,
                                discount: e.target.value,
                              }))
                            }
                            onBlur={() =>
                              setEditItem((p: any) => {
                                const n = parseRupiah(p.discount);
                                return {
                                  ...p,
                                  discount: n
                                    ? n.toLocaleString("id-ID", { maximumFractionDigits: 2 })
                                    : "",
                                };
                              })
                            }
                            className="w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100"
                          />
                        ) : (
                          formatCurrency(Number(item.discount || 0))
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatCurrency(Number(derived.nominal || 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-700 tabular-nums">
                        {formatCurrency(Number(derived.rpTagih || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditItem(item)}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Simpan"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditItem}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Batal"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleTogglePreviewItem(item.id)
                              }
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Preview"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditItem(item)}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteItem(item.id)
                              }
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isPreview && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                            <div>
                              <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                PCS Kirim
                              </div>
                              {isEditing ? (
                                <input
                                  type="number"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  value={editItem.pcsKirim}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditItem((p: any) => ({
                                      ...p,
                                      pcsKirim: val,
                                    }));
                                  }}
                                  className={`mt-1 w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                                />
                              ) : (
                                <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                  {formatNumber(
                                    Number(item.pcsKirim || 0)
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                KG Kirim
                              </div>
                              <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                {formatNumber(
                                  Number(derived.kgKirim || 0)
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                Harga/KG
                              </div>
                              <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                {formatCurrency(
                                  Number(derived.hargaKg || 0)
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                Nominal Original
                              </div>
                              <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                {formatCurrency(
                                  Number(derived.nominal || 0)
                                )}
                              </div>
                            </div>
                            <div className="bg-indigo-50/30 p-2 rounded-xl border border-indigo-100/50">
                              <div className="text-indigo-400 font-black uppercase text-[10px]">
                                Rp Tagih
                              </div>
                              <div className="mt-1 font-bold text-indigo-700 text-right">
                                {formatCurrency(
                                  Number(derived.rpTagih || 0)
                                )}
                              </div>
                            </div>
                            {!isEditing && (
                              <div className="flex items-end justify-end">
                                <button
                                  type="button"
                                  onClick={() => setPreviewItemId(null)}
                                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 cursor-pointer"
                                >
                                  Tutup
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-3 text-right font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                  {formatCurrency(totalsAll.nominal)}
                </td>
                <td className="px-4 py-3 text-right text-base font-black text-indigo-700 dark:text-indigo-400 tabular-nums">
                  {formatCurrency(totalsAll.tagihan)}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
          </div>
          <div className="flex items-center justify-end p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 sm:px-10 py-3 bg-[#004a87] text-white rounded-[16px] font-black flex items-center justify-center gap-2 shadow-2xl shadow-blue-900/30 hover:bg-[#003d6e] active:scale-95 transition-all cursor-pointer disabled:opacity-50 text-sm"
            >
              <Save size={18} />
              Simpan PO ke Daftar
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm font-semibold">
          Belum ada produk. Tambahkan produk dari Section 2.
        </div>
      )}
    </section>
  );
}
