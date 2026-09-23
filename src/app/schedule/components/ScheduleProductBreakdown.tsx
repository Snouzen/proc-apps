"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Check, CheckCircle2, AlertCircle, Loader2, RotateCcw, PackageCheck } from "lucide-react";

interface ScheduleProductBreakdownProps {
  po: any;
  onSave: (items: Array<{ itemId: string; pcsKirim: number }>) => Promise<void>;
  isSaving: boolean;
}

export default function ScheduleProductBreakdown({
  po,
  onSave,
  isSaving,
}: ScheduleProductBreakdownProps) {
  const items = po?.Items || [];

  // Local draft state for input values: { [itemId]: string }
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  // Sync draft state whenever po.Items changes from parent
  useEffect(() => {
    const initialMap: Record<string, string> = {};
    items.forEach((item: any) => {
      initialMap[item.id] =
        item.pcsKirim !== null && item.pcsKirim !== undefined
          ? String(item.pcsKirim)
          : "";
    });
    setDraftValues(initialMap);
  }, [items]);

  // Handle single input change (pure local state, zero network calls!)
  const handleInputChange = (itemId: string, rawVal: string, maxPcs: number) => {
    // If empty string, keep as empty string so user can delete
    if (rawVal === "") {
      setDraftValues((prev) => ({ ...prev, [itemId]: "" }));
      return;
    }

    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;

    // We allow user to type, but highlight if it exceeds maxPcs
    setDraftValues((prev) => ({ ...prev, [itemId]: String(num) }));
  };

  // Quick fill all items with their max order pcs
  const handleFillAll = () => {
    const fullMap: Record<string, string> = {};
    items.forEach((item: any) => {
      fullMap[item.id] = String(Number(item.pcs || 0));
    });
    setDraftValues(fullMap);
  };

  // Reset to original values from server
  const handleReset = () => {
    const originalMap: Record<string, string> = {};
    items.forEach((item: any) => {
      originalMap[item.id] =
        item.pcsKirim !== null && item.pcsKirim !== undefined
          ? String(item.pcsKirim)
          : "";
    });
    setDraftValues(originalMap);
  };

  // Calculations
  const totalOrder = useMemo(() => {
    return items.reduce((acc: number, it: any) => acc + (Number(it.pcs) || 0), 0);
  }, [items]);

  const totalKirim = useMemo(() => {
    return items.reduce((acc: number, it: any) => {
      const val = draftValues[it.id];
      const num = val === "" || val === undefined ? 0 : Number(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }, [items, draftValues]);

  // Check if any item exceeds max allowed pcs
  const invalidItem = useMemo(() => {
    for (const it of items) {
      const val = draftValues[it.id];
      if (val !== undefined && val !== "") {
        const num = Number(val);
        if (num > Number(it.pcs || 0)) {
          return it;
        }
      }
    }
    return null;
  }, [items, draftValues]);

  // Check if any value was modified compared to original
  const isDirty = useMemo(() => {
    return items.some((it: any) => {
      const originalVal =
        it.pcsKirim !== null && it.pcsKirim !== undefined
          ? String(it.pcsKirim)
          : "";
      const currentVal = draftValues[it.id] ?? "";
      return originalVal !== currentVal;
    });
  }, [items, draftValues]);

  const handleSubmit = async () => {
    if (isSaving || invalidItem) return;

    const payload = items.map((it: any) => {
      const val = draftValues[it.id];
      const num = val === "" || val === undefined ? 0 : Math.max(0, Number(val));
      return {
        itemId: it.id,
        pcsKirim: isNaN(num) ? 0 : num,
      };
    });

    await onSave(payload);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-200/10 dark:shadow-none mx-4">
      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
              <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-12">
                Product Breakdown
              </th>
              <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Order
              </th>
              <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Kirim
              </th>
              <th className="px-12 py-4 text-right text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const currentVal = draftValues[item.id] ?? "";
              const numVal = currentVal === "" ? 0 : Number(currentVal);
              const maxPcs = Number(item.pcs || 0);
              const isOver = numVal > maxPcs;

              const isFull = numVal >= maxPcs && maxPcs > 0;
              const isPartial = numVal > 0 && numVal < maxPcs;

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    idx !== items.length - 1
                      ? "border-b border-slate-50 dark:border-slate-700/60"
                      : ""
                  } ${isOver ? "bg-rose-50/30 dark:bg-rose-950/10" : ""}`}
                >
                  {/* Nama Produk */}
                  <td className="px-8 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 pl-12">
                    {item.namaProduk}
                  </td>

                  {/* Order PCS */}
                  <td className="px-6 py-4 text-center text-xs font-black text-slate-300 dark:text-slate-500 tabular-nums">
                    {Number(item.pcs || 0).toLocaleString("id-ID")}
                  </td>

                  {/* Input Pcs Kirim */}
                  <td className="px-6 py-4 text-center">
                    <div className="relative inline-block group/input">
                      <input
                        type="number"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        min={0}
                        max={item.pcs}
                        value={currentVal}
                        disabled={isSaving}
                        onChange={(e) =>
                          handleInputChange(item.id, e.target.value, item.pcs)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isSaving && !invalidItem && isDirty) {
                            handleSubmit();
                          }
                        }}
                        className={`w-24 px-3 py-1.5 text-center text-xs font-black rounded-xl outline-none transition-all tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          isOver
                            ? "bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-500 text-rose-600 dark:text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                            : isDirty
                            ? "bg-indigo-50/40 dark:bg-indigo-900/20 border-2 border-indigo-400 text-indigo-900 dark:text-indigo-200"
                            : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400"
                        }`}
                        placeholder="0"
                      />
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-12 py-4 text-right">
                    {isOver ? (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Max {maxPcs}
                      </span>
                    ) : isFull ? (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                        Full
                      </span>
                    ) : isPartial ? (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-800">
                        Partial
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                        0 Pcs
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Action Bar */}
      <div className="bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Summary and Alerts */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs text-xs font-bold">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider">
              Total Order:
            </span>
            <span className="text-slate-700 dark:text-slate-200 tabular-nums">
              {totalOrder.toLocaleString("id-ID")}
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-slate-400 text-[10px] uppercase tracking-wider">
              Total Kirim:
            </span>
            <span
              className={`tabular-nums ${
                totalKirim > totalOrder
                  ? "text-rose-600 dark:text-rose-400"
                  : totalKirim === totalOrder && totalOrder > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-indigo-600 dark:text-indigo-400"
              }`}
            >
              {totalKirim.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Delivery Status Indicator */}
          {totalKirim >= totalOrder && totalOrder > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Full Delivery
            </span>
          ) : totalKirim > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Partial Delivery
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              Belum Dialokasikan
            </span>
          )}

          {/* Error warning if any item exceeds max */}
          {invalidItem && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 animate-fade-in">
              <AlertCircle size={14} className="shrink-0" />
              Pcs pada {invalidItem.namaProduk} melebihi pesanan (Maks: {invalidItem.pcs})!
            </span>
          )}
        </div>

        {/* Right: Quick actions & Submit button */}
        <div className="flex items-center gap-2">
          {/* Quick Fill Button */}
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Kembalikan ke data awal"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={handleFillAll}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer disabled:opacity-50"
            title="Set semua produk kirim 100% full"
          >
            <PackageCheck size={13} />
            Penuhi Semua
          </button>

          {/* Main Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || Boolean(invalidItem) || !isDirty}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
              invalidItem
                ? "bg-rose-100 text-rose-400 cursor-not-allowed border border-rose-200"
                : isDirty
                ? "bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-600/20"
                : "bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : isDirty ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                <span>Simpan Pcs Kirim</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Tersimpan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
