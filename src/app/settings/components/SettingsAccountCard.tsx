import React from "react";
import {
  User,
  Check,
  Copy,
  Lock,
  Mail,
  MapPin,
  Building,
  Edit3,
} from "lucide-react";

interface SettingsAccountCardProps {
  username: string;
  email: string;
  regional: string | null;
  siteArea: string | null;
  copiedUsername: boolean;
  handleCopyUsername: () => void;
  getRoleDisplayName: () => string;
  getRoleBadgeStyle: () => string;
  openEditModal: () => void;
}

export default function SettingsAccountCard({
  username,
  email,
  regional,
  siteArea,
  copiedUsername,
  handleCopyUsername,
  getRoleDisplayName,
  getRoleBadgeStyle,
  openEditModal,
}: SettingsAccountCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <User size={18} className="text-[#004a87] dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Informasi Akun
          </h2>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getRoleBadgeStyle()}`}>
          {getRoleDisplayName()}
        </span>
      </div>

      <div className="p-6 space-y-5">
        {/* Username Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Username
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 text-sm font-bold">@</span>
            <input
              type="text"
              readOnly
              value={username}
              className="w-full pl-8 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyUsername}
              title="Salin Username"
              className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {copiedUsername ? (
                <Check size={16} className="text-emerald-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            Username digunakan untuk proses autentikasi masuk ke aplikasi.
          </p>
        </div>

        {/* Password Display */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              <Lock size={10} /> Terenkripsi (Bcrypt)
            </span>
          </div>
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-slate-800 dark:text-slate-100 select-none">
            ••••••••••••
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            Password akun diamankan dengan enkripsi satu arah (Bcrypt hash) dan tidak dapat dibaca langsung.
          </p>
        </div>

        {/* Email Display */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Alamat Email Terdaftar
          </label>
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300">
            <Mail size={16} className="text-slate-400 flex-shrink-0" />
            <span className="font-medium truncate">{email || "-"}</span>
          </div>
        </div>

        {/* Regional & Site Area (if present) */}
        {(regional || siteArea) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {regional && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Regional
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin size={14} className="text-amber-500 flex-shrink-0" />
                  <span>{regional}</span>
                </div>
              </div>
            )}
            {siteArea && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Site Area / Cabang
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Building size={14} className="text-blue-500 flex-shrink-0" />
                  <span>{siteArea}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action button inside card */}
        <div className="pt-2">
          <button
            type="button"
            onClick={openEditModal}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#004a87] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl transition-all cursor-pointer"
          >
            <Edit3 size={14} />
            <span>Ubah Profil, Email & Ganti Password</span>
          </button>
        </div>
      </div>
    </div>
  );
}
