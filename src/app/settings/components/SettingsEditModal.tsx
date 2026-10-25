import React from "react";
import dynamic from "next/dynamic";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

const Modal = dynamic(() => import("@/components/modal"), { ssr: false });

interface SettingsEditModalProps {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (v: boolean) => void;
  handleSaveProfile: (e: React.FormEvent) => Promise<void>;
  errorMessage: string | null;
  successMessage: string | null;
  editUsername: string;
  setEditUsername: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showCurrentPw: boolean;
  setShowCurrentPw: (v: boolean) => void;
  showNewPw: boolean;
  setShowNewPw: (v: boolean) => void;
  showConfirmPw: boolean;
  setShowConfirmPw: (v: boolean) => void;
  isSamePassword: boolean;
  saving: boolean;
}

export default function SettingsEditModal({
  isEditModalOpen,
  setIsEditModalOpen,
  handleSaveProfile,
  errorMessage,
  successMessage,
  editUsername,
  setEditUsername,
  editEmail,
  setEditEmail,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showCurrentPw,
  setShowCurrentPw,
  showNewPw,
  setShowNewPw,
  showConfirmPw,
  setShowConfirmPw,
  isSamePassword,
  saving,
}: SettingsEditModalProps) {
  return (
    <Modal
      open={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      title="Ubah Profil Akun & Password"
      className="max-w-md"
    >
      <form onSubmit={handleSaveProfile} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Section: Profile Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Username Login
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 text-sm font-bold">@</span>
              <input
                type="text"
                required
                value={editUsername}
                onChange={(e) => {
                  const u = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
                  setEditUsername(u);
                  setEditEmail(`${u}@bulog.co.id`);
                }}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#004a87]/30"
                placeholder="contoh: sppdki"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Akun
            </label>
            <input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#004a87]/30"
              placeholder="contoh: sppdki@bulog.co.id"
            />
          </div>
        </div>

        {/* Section: Security / Passwords */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password Saat Ini <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Verifikasi Keamanan</span>
            </div>
            <div className="relative flex items-center">
              <input
                type={showCurrentPw ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#004a87]/30"
                placeholder="Masukkan password saat ini"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password Baru (Opsional)
              </label>
              <span className="text-[10px] text-slate-400">Kosongkan jika tidak ganti</span>
            </div>
            <div className="relative flex items-center">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                  isSamePassword
                    ? "border-red-500 focus:ring-red-400/30 bg-red-50/20 dark:border-red-500"
                    : "border-slate-200 dark:border-slate-700 focus:ring-[#004a87]/30"
                }`}
                placeholder="Minimal 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Red warning message requested by user */}
            {isSamePassword && (
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 dark:text-red-400 mt-1.5 animate-in fade-in">
                <AlertCircle size={13} className="flex-shrink-0" />
                <span>Password baru tidak boleh sama dengan password saat ini.</span>
              </p>
            )}
          </div>

          {newPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  required={!!newPassword}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#004a87]/30"
                  placeholder="Ketik ulang password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => setIsEditModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || isSamePassword}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#004a87] hover:bg-[#003866] dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Perubahan</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
