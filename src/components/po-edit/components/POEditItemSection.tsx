"use client";

import React, { useState, useEffect } from "react";
import Combobox from "@/components/combobox";
import { Plus, Minus, Copy, Eye } from "lucide-react";
import { PO_FORM_LABELS } from "@/lib/po-form-labels";
import { formatCurrency, parseVal as parseRupiah } from "@/lib/format";
import Swal from "sweetalert2";
import { EditItem } from "../types";

export const InlineDiscountInput = ({
  actualDiscount,
  onChange,
  className,
}: {
  actualDiscount: number;
  onChange: (val: number) => void;
  className?: string;
}) => {
  const [val, setVal] = useState(() =>
    actualDiscount > 0
      ? actualDiscount.toLocaleString("id-ID", { maximumFractionDigits: 2 })
      : "",
  );

  useEffect(() => {
    const currentNum = parseRupiah(val);
    if (Math.abs(currentNum - actualDiscount) > 0.01) {
      setVal(
        actualDiscount > 0
          ? actualDiscount.toLocaleString("id-ID", { maximumFractionDigits: 2 })
          : "",
      );
    }
  }, [actualDiscount]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={val}
      onChange={(e) => {
        setVal(e.target.value);
        onChange(parseRupiah(e.target.value));
      }}
      onBlur={() => {
        const num = parseRupiah(val);
        setVal(
          num > 0
            ? num.toLocaleString("id-ID", { maximumFractionDigits: 2 })
            : "",
        );
      }}
      className={
        className ||
        "w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100"
      }
    />
  );
};

interface POEditItemSectionProps {
  items: EditItem[];
  setItems: React.Dispatch<React.SetStateAction<EditItem[]>>;
  currentItem: {
    namaProduk: string;
    pcs: number | string;
    pcsKirim: number | string;
    hargaPcs: number | string;
    discount: number | string;
  };
  setCurrentItem: React.Dispatch<
    React.SetStateAction<{
      namaProduk: string;
      pcs: number | string;
      pcsKirim: number | string;
      hargaPcs: number | string;
      discount: number | string;
    }>
  >;
  productOptions: string[];
  invalidCurrentProduct: boolean;
  handleAddItem: () => void;
  computeDerived: (it: EditItem) => any;
  totals: { nominal: number; tagih: number };
  isSiteArea: boolean;
}

export default function POEditItemSection({
  items,
  setItems,
  currentItem,
  setCurrentItem,
  productOptions,
  invalidCurrentProduct,
  handleAddItem,
  computeDerived,
  totals,
  isSiteArea,
}: POEditItemSectionProps) {
  const numberNoSpinner =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <>
      <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-slate-100">
            {PO_FORM_LABELS.tambahItem}
          </h4>
        </div>
        <div
          className={`p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 ${
            isSiteArea ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="col-span-2 md:col-span-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
              {PO_FORM_LABELS.namaProduk}
            </label>
            <Combobox
              options={productOptions}
              value={String(currentItem.namaProduk || "")}
              onChange={(v) =>
                setCurrentItem((prev) => ({ ...prev, namaProduk: v }))
              }
              placeholder="Ketik/cari produk..."
              inputClassName={
                invalidCurrentProduct
                  ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                  : ""
              }
            />
            {invalidCurrentProduct && (
              <p className="text-[11px] text-rose-600 mt-1">
                Nama produk tidak ada di daftar
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
              {PO_FORM_LABELS.pcs}
            </label>
            <input
              type="number"
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              value={currentItem.pcs}
              onChange={(e) =>
                setCurrentItem((p) => ({ ...p, pcs: e.target.value }))
              }
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
              {PO_FORM_LABELS.hargaPcs}
            </label>
            <input
              type="number"
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              value={currentItem.hargaPcs}
              onChange={(e) =>
                setCurrentItem((p) => ({ ...p, hargaPcs: e.target.value }))
              }
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
              {PO_FORM_LABELS.pcsKirim}
            </label>
            <input
              type="number"
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              value={currentItem.pcsKirim}
              onChange={(e) =>
                setCurrentItem((p) => ({ ...p, pcsKirim: e.target.value }))
              }
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
              {PO_FORM_LABELS.discount}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={currentItem.discount}
              onChange={(e) =>
                setCurrentItem((p) => ({ ...p, discount: e.target.value }))
              }
              onBlur={() =>
                setCurrentItem((prev) => {
                  const n = parseRupiah(prev.discount);
                  const hasDecimal = n % 1 !== 0;
                  return {
                    ...prev,
                    discount: n
                      ? n.toLocaleString("id-ID", {
                          maximumFractionDigits: hasDecimal ? 2 : 0,
                        })
                      : "",
                  };
                })
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-semibold dark:text-slate-100"
            />
          </div>
          <div className="col-span-full">
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 transition-all"
            >
              <Plus size={18} />
              Tambah Item
            </button>
          </div>
        </div>
      </div>

      <div
        className={`rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ${
          isSiteArea ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="font-bold text-slate-800 dark:text-slate-100">
            {PO_FORM_LABELS.preview}
          </h4>
          <div className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
            Total Tagihan: {formatCurrency(totals.tagih)}
          </div>
        </div>
        {/* Mobile Card List View (< md) */}
        <div className="md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
          {items.map((it) => {
            const d = computeDerived(it);
            return (
              <div
                key={`edit-card-${it.id}`}
                className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase break-words block flex-1">
                    {it.namaProduk || "-"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((x) => x.id !== it.id))
                    }
                    className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0"
                    title="Hapus"
                  >
                    <Minus size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">
                      {PO_FORM_LABELS.pcs}
                    </label>
                    <input
                      type="number"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      value={it.pcs}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === it.id ? { ...x, pcs: e.target.value } : x,
                          ),
                        )
                      }
                      className={`mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100 ${numberNoSpinner}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">
                      {PO_FORM_LABELS.pcsKirim}
                    </label>
                    <div className="flex items-center gap-1 mt-1 group/pckirim">
                      <input
                        type="number"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        value={it.pcsKirim}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id
                                ? { ...x, pcsKirim: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className={`w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100 ${numberNoSpinner}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id ? { ...x, pcsKirim: x.pcs } : x,
                            ),
                          )
                        }
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all shrink-0"
                        title="Salin nilai dari PCS"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">
                      {PO_FORM_LABELS.hargaPcs}
                    </label>
                    <input
                      type="number"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      value={it.hargaPcs}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === it.id
                              ? { ...x, hargaPcs: e.target.value }
                              : x,
                          ),
                        )
                      }
                      className={`mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100 ${numberNoSpinner}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">
                      {PO_FORM_LABELS.discount}
                    </label>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="flex-1 min-w-0">
                        <InlineDiscountInput
                          actualDiscount={d.actualDiscount}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right font-bold text-xs dark:text-slate-100"
                          onChange={(val) => {
                            const orderPcs = Number(it.pcs) || 1;
                            const shipped = Number(it.pcsKirim) || 0;
                            const baseDiscount =
                              shipped > 0 ? (val / shipped) * orderPcs : val;

                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === it.id
                                  ? { ...x, discount: baseDiscount }
                                  : x,
                              ),
                            );
                          }}
                        />
                      </div>
                      {parseRupiah(it.discount) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const base = parseRupiah(it.discount);
                            Swal.fire({
                              title: "<strong>INFO DISKON AWAL</strong>",
                              icon: "info",
                              html: `
                                <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                                  <div style="margin-bottom: 8px;"><b>Produk:</b> <br/><span style="color: #64748b">${it.namaProduk}</span></div>
                                  <div style="margin-bottom: 8px;"><b>Diskon Master (100%):</b> <br/><span style="color: #e11d48; font-weight: 800; font-size: 16px;">Rp ${base.toLocaleString("id-ID")}</span></div>
                                  <div><b>Untuk Qty Total:</b> <br/><span style="color: #64748b">${it.pcs} PCS</span></div>
                                </div>
                              `,
                              confirmButtonText: "Tutup",
                              confirmButtonColor: "#004a87",
                              customClass: {
                                container: "z-[999999]",
                                popup: "rounded-[24px]",
                              },
                            });
                          }}
                          className="p-1 hover:bg-slate-100 dark:bg-slate-800 rounded-md transition-all shrink-0"
                          title="Lihat diskon awal"
                        >
                          <Eye
                            size={14}
                            className="text-slate-300 dark:text-slate-500"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-900/40 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                      Nominal Original
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 break-words [overflow-wrap:anywhere] tabular-nums block">
                      {formatCurrency(d.nominal)}
                    </span>
                  </div>
                  <div className="text-left sm:text-right min-w-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase">
                      Rp Tagih
                    </span>
                    <span className="font-black text-indigo-700 dark:text-indigo-300 text-sm break-words [overflow-wrap:anywhere] tabular-nums block">
                      {formatCurrency(d.rpTagih)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="p-4 text-sm text-slate-500 text-center">
              Belum ada item.
            </div>
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">{PO_FORM_LABELS.namaProduk}</th>
                <th className="px-4 py-3 text-right">{PO_FORM_LABELS.pcs}</th>
                <th className="px-4 py-3 text-right">
                  {PO_FORM_LABELS.hargaPcs}
                </th>
                <th className="px-4 py-3 text-right">
                  {PO_FORM_LABELS.pcsKirim}
                </th>
                <th className="px-4 py-3 text-right">
                  {PO_FORM_LABELS.discount}
                </th>
                <th className="px-4 py-3 text-right">
                  {PO_FORM_LABELS.nominal}
                </th>
                <th className="px-4 py-3 text-center">
                  {PO_FORM_LABELS.aksi}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {items.map((it) => {
                const d = computeDerived(it);
                return (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 uppercase">
                      {it.namaProduk || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        value={it.pcs}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id
                                ? { ...x, pcs: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className={`w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        value={it.hargaPcs}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id
                                ? { ...x, hargaPcs: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className={`w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 group/pckirim">
                        <input
                          type="number"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={it.pcsKirim}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === it.id
                                  ? { ...x, pcsKirim: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className={`w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === it.id ? { ...x, pcsKirim: x.pcs } : x,
                              ),
                            )
                          }
                          className="p-1.5 text-slate-400 dark:text-slate-500 opacity-50 group-hover/pckirim:opacity-100 hover:text-blue-600 hover:bg-blue-50 focus:opacity-100 focus:text-blue-600 focus:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                          title="Salin nilai dari PCS"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <InlineDiscountInput
                          actualDiscount={d.actualDiscount}
                          onChange={(val) => {
                            const orderPcs = Number(it.pcs) || 1;
                            const shipped = Number(it.pcsKirim) || 0;
                            const baseDiscount =
                              shipped > 0 ? (val / shipped) * orderPcs : val;

                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === it.id
                                  ? { ...x, discount: baseDiscount }
                                  : x,
                              ),
                            );
                          }}
                        />
                        {parseRupiah(it.discount) > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const base = parseRupiah(it.discount);
                              Swal.fire({
                                title: "<strong>INFO DISKON AWAL</strong>",
                                icon: "info",
                                html: `
                                  <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                                    <div style="margin-bottom: 8px;"><b>Produk:</b> <br/><span style="color: #64748b">${it.namaProduk}</span></div>
                                    <div style="margin-bottom: 8px;"><b>Diskon Master (100%):</b> <br/><span style="color: #e11d48; font-weight: 800; font-size: 16px;">Rp ${base.toLocaleString("id-ID")}</span></div>
                                    <div><b>Untuk Qty Total:</b> <br/><span style="color: #64748b">${it.pcs} PCS</span></div>
                                  </div>
                                `,
                                confirmButtonText: "Tutup",
                                confirmButtonColor: "#004a87",
                                customClass: {
                                  container: "z-[999999]",
                                  popup: "rounded-[24px]",
                                },
                              });
                            }}
                            className="p-1 hover:bg-slate-100 dark:bg-slate-800 rounded-md transition-all group/eye"
                            title="Lihat diskon awal"
                            style={{ pointerEvents: "auto" }}
                          >
                            <Eye
                              size={14}
                              className="text-slate-300 dark:text-slate-500 group-hover/eye:text-slate-600 dark:text-slate-300 transition-colors"
                            />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {formatCurrency(d.nominal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) => prev.filter((x) => x.id !== it.id))
                        }
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                        title="Hapus"
                      >
                        <Minus size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-sm text-slate-500"
                    colSpan={8}
                  >
                    Belum ada item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
