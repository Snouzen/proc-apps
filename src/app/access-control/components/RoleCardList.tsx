"use client";

import React from "react";
import { Check } from "lucide-react";
import { RoleDef } from "../constants/accessControlData";

interface RoleCardListProps {
  roles: RoleDef[];
  selectedRoleCode: string;
  onSelectRole: (roleCode: string) => void;
  currentUserRole: string;
  permissionsState: Record<string, { menus: Set<string>; actions: Set<string> }>;
  totalMenusCount: number;
  isReadOnly?: boolean;
}

export function RoleCardList({
  roles,
  selectedRoleCode,
  onSelectRole,
  currentUserRole,
  permissionsState,
  totalMenusCount,
  isReadOnly = false,
}: RoleCardListProps) {
  // If in read-only mode, only show the active user's own role card
  if (isReadOnly) {
    const userRole = roles.find((r) => r.code === currentUserRole || r.code === selectedRoleCode) || roles[0];
    const enabledMenuCount = permissionsState[userRole.code]?.menus.size || 0;
    const enabledActionCount = permissionsState[userRole.code]?.actions.size || 0;

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#004a87]/30 dark:border-blue-500/30 p-5 shadow-xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${userRole.badgeColor}`}>
              {userRole.name}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <Check size={11} className="stroke-[3]" /> Peran Aktif Akun Anda
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Scope: {userRole.scope}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          {userRole.description}
        </p>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Menu Sidebar yang Dapat Diakses:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold" suppressHydrationWarning>
              {enabledMenuCount} Menu
            </strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Total Aksi yang Diberikan:</span>
            <strong className="text-[#004a87] dark:text-blue-400 font-bold" suppressHydrationWarning>
              {enabledActionCount} Aksi
            </strong>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roles.map((r) => {
        const isSelected = selectedRoleCode === r.code;
        const isUserCurrentRole = currentUserRole === r.code;
        const enabledMenuCount = permissionsState[r.code]?.menus.size || 0;

        return (
          <div
            key={r.code}
            onClick={() => onSelectRole(r.code)}
            className={`rounded-2xl border transition-all p-5 shadow-xs cursor-pointer flex flex-col justify-between select-none relative ${
              isSelected
                ? "bg-blue-50/30 dark:bg-blue-950/30 border-[#004a87] dark:border-blue-500 ring-2 ring-[#004a87]/30 shadow-md"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${r.badgeColor}`}>
                  {r.name}
                </span>

                <div className="flex items-center gap-1.5">
                  {isUserCurrentRole && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      Akun Anda
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-[10px] font-bold text-[#004a87] dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                      <Check size={11} className="stroke-[3]" /> Dipilih
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Scope: {r.scope}
              </p>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                {r.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Menu Aktif:{" "}
                <strong className="text-slate-800 dark:text-slate-200" suppressHydrationWarning>
                  {enabledMenuCount}
                </strong>{" "}
                / {totalMenusCount}
              </span>
              <span
                className={`text-xs font-bold flex items-center gap-1 ${
                  isSelected
                    ? "text-[#004a87] dark:text-blue-400"
                    : "text-slate-400 group-hover:text-slate-600"
                }`}
              >
                {isSelected ? "Sedang Dikonfigurasi ↓" : "Klik Untuk Kelola →"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
