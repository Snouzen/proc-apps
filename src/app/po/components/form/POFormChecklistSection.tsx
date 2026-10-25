import React from "react";

interface POFormChecklistSectionProps {
  formData: any;
  setFormData: any;
  handleChecklist: (key: string) => void;
  toggleAllChecklist: () => void;
}

export default function POFormChecklistSection({
  formData,
  setFormData,
  handleChecklist,
  toggleAllChecklist,
}: POFormChecklistSectionProps) {
  return (
    <>
      <section className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
            3
          </div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            Checklist Dokumen
          </h2>
          <button
            type="button"
            onClick={toggleAllChecklist}
            className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            {Object.values(formData.status).every(Boolean)
              ? "Uncheck All"
              : "Check All"}
          </button>
        </div>

        <div className="space-y-3">
          {Object.keys(formData.status).map((key) => {
            const checked =
              formData.status[key as keyof typeof formData.status];
            const label = key === "sdif" ? "SDI/F" : key.toUpperCase();

            // Khusus untuk KIRIM, FP, TAGIH dan BAYAR, render secara inline dengan input teks
            if (key === "kirim") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref Kirim (opsional)..."
                      value={formData.buktiKirim}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          buktiKirim: v,
                        }));
                      }}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                    />
                  </div>
                </div>
              );
            }

            if (key === "fp") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref FP..."
                      value={formData.buktiFp}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          buktiFp: v,
                          status: { ...prev.status, fp: !!v.trim() },
                        }));
                      }}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                    />
                  </div>
                </div>
              );
            }

            if (key === "tagih") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref Tagihan..."
                      value={formData.buktiTagih}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          buktiTagih: v,
                          status: { ...prev.status, tagih: !!v.trim() },
                        }));
                      }}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                    />
                  </div>
                </div>
              );
            }

            if (key === "bayar") {
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleChecklist(key)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan Ref Bayar..."
                      value={formData.buktiBayar}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          buktiBayar: v,
                          status: { ...prev.status, bayar: !!v.trim() },
                        }));
                      }}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                    />
                  </div>
                </div>
              );
            }

            // Default render untuk checkbox lainnya
            return (
              <label
                key={key}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleChecklist(key)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
            4
          </div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Remarks</h2>
        </div>
        <textarea
          rows={4}
          placeholder="Tambahkan Jika Ada Keterangan..."
          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] focus:ring-2 focus:ring-slate-200 outline-none text-sm font-medium transition-all"
          value={formData.remarks || ""}
          onChange={(e) =>
            setFormData({ ...formData, remarks: e.target.value })
          }
        ></textarea>
      </section>
    </>
  );
}
