"use client";

import React from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";
import RitelLogo from "./RitelLogo";

export interface EditCompanyState {
  id?: string;
  namaPt: string;
  originalNamaPt?: string;
  inisial: string | null;
  originalInisial: string | null;
  provinsi?: string | null;
  logoPt?: string | null;
  logoInisial?: string | null;
  ptOnly?: boolean;
}

interface RitelEditCompanyModalProps {
  editCompany: EditCompanyState | null;
  setEditCompany: (val: EditCompanyState | null) => void;
  isRm: boolean;
  setDataRitel: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function RitelEditCompanyModal({
  editCompany,
  setEditCompany,
  isRm,
  setDataRitel,
}: RitelEditCompanyModalProps) {
  if (!editCompany) return null;

  const handleSave = async () => {
    try {
      const cleanOriginalNamaPt = (
        editCompany.originalNamaPt || editCompany.namaPt || ""
      ).trim();
      const cleanCurrentNamaPt = (editCompany.namaPt || "").trim();

      const payload: any = {
        id: editCompany.id,
        namaPt: cleanOriginalNamaPt,
      };

      if (editCompany.ptOnly) {
        if (cleanCurrentNamaPt && cleanCurrentNamaPt !== cleanOriginalNamaPt) {
          payload.newNamaPt = cleanCurrentNamaPt;
        }
        payload.logoPt = editCompany.logoPt ? editCompany.logoPt.trim() : null;
      } else {
        const cleanOrigInisial = editCompany.originalInisial
          ? editCompany.originalInisial.trim()
          : null;
        const cleanCurrInisial = editCompany.inisial
          ? editCompany.inisial.trim()
          : null;

        payload.inisial = cleanOrigInisial;
        if (cleanCurrInisial !== cleanOrigInisial) {
          payload.newInisial = cleanCurrInisial;
        }
        payload.provinsi = editCompany.provinsi
          ? editCompany.provinsi.trim()
          : null;
        payload.logoInisial = editCompany.logoInisial
          ? editCompany.logoInisial.trim()
          : null;
      }

      const res = await fetch("/api/ritel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: j?.error || "Gagal update data ritel",
        });
        return;
      }

      // Update state locally
      setDataRitel((prev) =>
        prev.map((x: any) => {
          const oldPtName = (
            editCompany.originalNamaPt || editCompany.namaPt
          ).toLowerCase();
          const isSamePt = x.namaPt.toLowerCase() === oldPtName;

          if (isSamePt) {
            if (editCompany.ptOnly) {
              return {
                ...x,
                namaPt: editCompany.namaPt,
                logoPt: editCompany.logoPt || null,
              };
            }
            const isTargetInisial =
              (x.inisial ?? "—") === (editCompany.originalInisial ?? "—");
            if (isTargetInisial) {
              return {
                ...x,
                inisial: editCompany.inisial || null,
                provinsi: editCompany.provinsi || null,
                logoInisial: editCompany.logoInisial || null,
              };
            }
          }
          return x;
        })
      );

      Swal.fire({
        icon: "success",
        title: "Tersimpan",
        text: "Data Berhasil di-update!",
        timer: 1500,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
      setEditCompany(null);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal update data ritel",
      });
    }
  };

  return (
    // Opened from the aliases dialog (z-170); keep the editor and backdrop above it.
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setEditCompany(null)}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
            {editCompany.ptOnly
              ? "Edit Profil Perusahaan"
              : `Edit Inisial - ${editCompany.namaPt}`}
          </h3>
          <button
            onClick={() => setEditCompany(null)}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {editCompany.ptOnly && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nama PT (Perusahaan)
              </label>
              <input
                type="text"
                value={editCompany.namaPt ?? ""}
                onChange={(e) =>
                  setEditCompany({ ...editCompany, namaPt: e.target.value })
                }
                className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold text-slate-800 dark:text-slate-200 shadow-sm"
              />
            </div>
          )}

          {!editCompany.ptOnly && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Inisial
                </label>
                <input
                  type="text"
                  value={editCompany.inisial ?? ""}
                  onChange={(e) =>
                    setEditCompany({ ...editCompany, inisial: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Provinsi</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Digunakan untuk Laporan Realisasi
                  </span>
                </label>
                <input
                  type="text"
                  list="edit-provinsi-options"
                  placeholder="Contoh: JAWA TENGAH, DKI JAKARTA"
                  value={editCompany.provinsi ?? ""}
                  onChange={(e) =>
                    setEditCompany({
                      ...editCompany,
                      provinsi: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold text-slate-800 dark:text-slate-200 uppercase"
                />
                <datalist id="edit-provinsi-options">
                  <option value="DKI JAKARTA" />
                  <option value="JAWA BARAT" />
                  <option value="JAWA TENGAH" />
                  <option value="JAWA TIMUR" />
                  <option value="BANTEN" />
                  <option value="DI YOGYAKARTA" />
                  <option value="SULAWESI SELATAN" />
                  <option value="SUMATERA UTARA" />
                  <option value="BALI" />
                </datalist>
              </div>
            </>
          )}

          <div className="space-y-3">
            {!isRm && (
              <>
                {editCompany.ptOnly ? (
                  <div>
                    <label className="block text-[11px] font-bold text-blue-600 mb-1 uppercase tracking-wider">
                      Suntik Logo PT (URL)
                    </label>
                    <input
                      type="text"
                      value={editCompany.logoPt ?? ""}
                      onChange={(e) =>
                        setEditCompany({
                          ...editCompany,
                          logoPt: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[11px]"
                    />
                    {editCompany.logoPt && (
                      <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <RitelLogo src={editCompany.logoPt} alt="preview logo pt" variant="preview" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-600 mb-1 uppercase tracking-wider">
                      Suntik Logo Inisial (URL)
                    </label>
                    <input
                      type="text"
                      value={editCompany.logoInisial ?? ""}
                      onChange={(e) =>
                        setEditCompany({
                          ...editCompany,
                          logoInisial: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-[11px]"
                    />
                    {editCompany.logoInisial && (
                      <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <RitelLogo src={editCompany.logoInisial} alt="preview logo inisial" variant="preview" />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEditCompany(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
