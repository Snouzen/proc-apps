import React from "react";
import Link from "next/link";
import { Settings as SettingsIcon, Edit3, ShieldCheck, ArrowRight } from "lucide-react";

interface SettingsHeaderProps {
  openEditModal: () => void;
}

export default function SettingsHeader({ openEditModal }: SettingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#004a87]/10 dark:bg-blue-500/10 text-[#004a87] dark:text-blue-400">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Pengaturan Akun
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Informasi profil personalia, kredensial akun, dan status hak akses sistem
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openEditModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#004a87] hover:bg-[#003866] dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Edit3 size={15} />
          <span>Ubah Akun & Password</span>
        </button>

        <Link
          href="/access-control"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#004a87] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-all border border-blue-200/60 dark:border-blue-800/60 w-fit"
        >
          <ShieldCheck size={16} />
          <span>Access Control</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
