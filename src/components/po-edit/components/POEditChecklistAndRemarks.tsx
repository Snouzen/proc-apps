"use client";

import React from "react";
import { Truck } from "lucide-react";
import { PO_FORM_LABELS } from "@/lib/po-form-labels";
import { POStatus } from "../types";

interface POEditChecklistAndRemarksProps {
  status: POStatus;
  setStatus: React.Dispatch<React.SetStateAction<POStatus>>;
  handleChecklist: (field: string) => void;
  allChecklistChecked: boolean;
  toggleAllChecklist: () => void;
  buktiKirim: string;
  setBuktiKirim: (v: string) => void;
  buktiFp: string;
  setBuktiFp: (v: string) => void;
  buktiTagih: string;
  setBuktiTagih: (v: string) => void;
  buktiBayar: string;
  setBuktiBayar: (v: string) => void;
  remarks: string;
  setRemarks: (v: string) => void;
  namaSupir: string;
  setNamaSupir: (v: string) => void;
  platNomor: string;
  setPlatNomor: (v: string) => void;
  isSiteArea: boolean;
}

export default function POEditChecklistAndRemarks({
  status,
  setStatus,
  handleChecklist,
  allChecklistChecked,
  toggleAllChecklist,
  buktiKirim,
  setBuktiKirim,
  buktiFp,
  setBuktiFp,
  buktiTagih,
  setBuktiTagih,
  buktiBayar,
  setBuktiBayar,
  remarks,
  setRemarks,
  namaSupir,
  setNamaSupir,
  platNomor,
  setPlatNomor,
  isSiteArea,
}: POEditChecklistAndRemarksProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section
        className={`bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm ${
          isSiteArea ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            {PO_FORM_LABELS.checklistDokumen}
          </h2>
          <button
            type="button"
            onClick={toggleAllChecklist}
            className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            {allChecklistChecked ? "Uncheck All" : "Check All"}
          </button>
        </div>

        <div className="space-y-3">
          {Object.keys(status).map((key) => {
            const checked = status[key as keyof typeof status];
            const label = key === "sdif" ? "SDI/F" : key.toUpperCase();

            if (key === "kirim") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      KIRIM
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref Kirim..."
                      value={buktiKirim || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBuktiKirim(v);
                        if (v.trim() && !checked)
                          setStatus((prev) => ({ ...prev, kirim: true }));
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-transparent dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              );
            }

            if (key === "fp") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      FP
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref FP..."
                      value={buktiFp || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBuktiFp(v);
                        if (v.trim() && !checked)
                          setStatus((prev) => ({ ...prev, fp: true }));
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-transparent dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              );
            }

            if (key === "tagih") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      TAGIH
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref Tagihan..."
                      value={buktiTagih || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBuktiTagih(v);
                        if (v.trim() && !checked)
                          setStatus((prev) => ({ ...prev, tagih: true }));
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-transparent dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              );
            }

            if (key === "bayar") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      BAYAR
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref Bayar..."
                      value={buktiBayar || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBuktiBayar(v);
                        if (v.trim() && !checked)
                          setStatus((prev) => ({ ...prev, bayar: true }));
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-transparent dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              );
            }

            return (
              <label
                key={key}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleChecklist(key)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section
        className={`bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm ${
          isSiteArea ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            {PO_FORM_LABELS.remarks}
          </h2>
        </div>
        <textarea
          rows={4}
          value={remarks}
          placeholder="Tambahkan Jika Ada Keterangan..."
          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] focus:ring-2 focus:ring-slate-200 outline-none text-sm font-medium dark:text-slate-100 transition-all"
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl">
          <div className="col-span-1 md:col-span-2 flex items-center gap-2 mb-2">
            <Truck size={16} className="text-sky-600" />
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
              Logistik & Ekspedisi
            </h3>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nama Supir
            </label>
            <input
              type="text"
              placeholder="Identitas Supir..."
              value={namaSupir || ""}
              onChange={(e) => setNamaSupir(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Plat Nomor
            </label>
            <input
              type="text"
              placeholder="Plat Kendaraan..."
              value={platNomor || ""}
              onChange={(e) => setPlatNomor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
