import React from "react";
import { Building2, Store, X } from "lucide-react";
import Combobox from "@/components/combobox";
import { StatefulButton } from "@/components/ui/stateful-button";
import Swal from "sweetalert2";
import { saveRitel } from "@/lib/api";

type ModalMode = "addInisial" | "addCompany";

interface RitelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalMode: ModalMode;
  setModalMode: (mode: ModalMode) => void;
  isRm: boolean;
  allCompanyOptions: string[];
  selectedCompany: string;
  setSelectedCompany: (val: string) => void;
  inisial: string;
  setInisial: (val: string) => void;
  logoPt: string;
  setLogoPt: (val: string) => void;
  logoInisial: string;
  setLogoInisial: (val: string) => void;
  setDataRitel: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function RitelFormModal({
  isOpen,
  onClose,
  modalMode,
  setModalMode,
  isRm,
  allCompanyOptions,
  selectedCompany,
  setSelectedCompany,
  inisial,
  setInisial,
  logoPt,
  setLogoPt,
  logoInisial,
  setLogoInisial,
  setDataRitel,
}: RitelFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-50 flex justify-between item-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 size={22} className="text-blue-600" />
            {modalMode === "addCompany" ? "Tambah Company Baru" : "Tambah Item"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="p-6 space-y-5"
        >
          <div
            className="relative overflow-hidden transition-all duration-300"
            style={{
              minHeight: modalMode === "addInisial" ? (isRm ? "180px" : "320px") : "120px",
            }}
          >
            <div
              className={`transition-all duration-300 transform ${
                modalMode === "addInisial"
                  ? "translate-x-0 opacity-100 relative"
                  : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
              } space-y-5`}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 size={12} /> Company Name
                </label>
                <Combobox
                  options={allCompanyOptions}
                  value={selectedCompany}
                  onChange={setSelectedCompany}
                  placeholder="Cari atau pilih company..."
                  leftIcon={<Building2 size={16} />}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Store size={12} /> Inisial
                </label>
                <input
                  required={modalMode === "addInisial"}
                  type="text"
                  placeholder="Contoh: ALFAMART"
                  value={inisial}
                  onChange={(e) => setInisial(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isRm && (<>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-600 mb-1 uppercase tracking-wider">
                      Suntik Logo PT (URL)
                    </label>
                    <input
                      type="text"
                      value={logoPt}
                      onChange={(e) => setLogoPt(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[11px]"
                    />
                    {logoPt && (
                      <div className="mt-1 flex justify-center p-1 bg-white border border-blue-100 rounded-lg">
                        <img src={logoPt} alt="preview" className="h-8 object-contain" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-600 mb-1 uppercase tracking-wider">
                      Suntik Logo Inisial (URL)
                    </label>
                    <input
                      type="text"
                      value={logoInisial}
                      onChange={(e) => setLogoInisial(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-[11px]"
                    />
                    {logoInisial && (
                      <div className="mt-1 flex justify-center p-1 bg-white border border-amber-100 rounded-lg">
                        <img src={logoInisial} alt="preview" className="h-8 object-contain" />
                      </div>
                    )}
                  </div>
                </>)}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCompany("");
                  setInisial("");
                  setModalMode("addCompany");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium block text-center w-full mt-2"
              >
                Add Company Baru
              </button>
            </div>

            <div
              className={`transition-all duration-300 transform ${
                modalMode === "addCompany"
                  ? "translate-x-0 opacity-100 relative"
                  : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
              } space-y-5`}
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nama Company
                </label>
                <input
                  required={modalMode === "addCompany"}
                  type="text"
                  placeholder="Contoh: PT LION SUPER INDO"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCompany("");
                  setInisial("");
                  setModalMode("addInisial");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium block text-center w-full mt-2"
              >
                Back
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <StatefulButton
              variant="cancel"
              onClick={onClose}
              className="flex-1"
            >
              Batal
            </StatefulButton>
            <StatefulButton
              variant="submit"
              onClick={async () => {
                if (modalMode === "addCompany" && !selectedCompany) {
                  Swal.fire({ icon: "error", text: "Nama Company wajib diisi!" });
                  return;
                }
                if (modalMode === "addInisial" && (!selectedCompany || !inisial)) {
                  Swal.fire({ icon: "error", text: "Company dan Inisial wajib diisi!" });
                  return;
                }

                try {
                  const payload = {
                    namaPt: selectedCompany,
                    inisial: modalMode === "addCompany" ? null : inisial,
                    logoPt: logoPt || undefined,
                    logoInisial: logoInisial || undefined,
                  };
                  const result = await saveRitel(payload);
                  onClose();
                  setSelectedCompany("");
                  setInisial("");
                  setLogoPt("");
                  setLogoInisial("");
                  setDataRitel((prev) => [result, ...prev]);

                  Swal.fire({
                    icon: "success",
                    title: "Berhasil",
                    text: "Data Berhasil disimpan!",
                    timer: 1500,
                  });
                  setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                  console.error("Error Submit Data:", error);
                  Swal.fire({
                    icon: "error",
                    title: "Gagal",
                    text: "Gagal konek server backend",
                  });
                }
              }}
              className="flex-1"
            >
              Simpan {modalMode === "addCompany" ? "Company" : "Data"}
            </StatefulButton>
          </div>
        </form>
      </div>
    </div>
  );
}
