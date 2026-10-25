import React from "react";
import { KeyRound, ShieldAlert, Sparkles } from "lucide-react";

interface SettingsPermissionsCardProps {
  roleDisplayName: string;
}

export default function SettingsPermissionsCard({
  roleDisplayName,
}: SettingsPermissionsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <KeyRound size={18} className="text-[#004a87] dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Role Permissions
          </h2>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Default Policy
        </span>
      </div>

      <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
          <ShieldAlert size={28} />
        </div>

        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          Belum Ada Permissions Kustom
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          Hak akses role ini saat ini mengikuti konfigurasi hak akses bawaan sistem. Pengaturan hak akses granular (view / edit) dapat dikonfigurasi melalui modul Access Control.
        </p>

        <div className="w-full bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-dashed border-slate-200 dark:border-slate-700 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Cakupan Akses Aktif
            </span>
          </div>
          <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Hak akses navigasi menu sesuai peran {roleDisplayName}</li>
            <li>Otorisasi akses data berbasis cakupan wilayah (Regional / Cabang)</li>
            <li>Sesi login terenkripsi dengan HMAC SHA-256</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
