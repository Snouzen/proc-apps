"use client";

import React from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Package,
  FileCheck,
  CalendarDays,
  ClipboardList,
  CalendarClock,
  Undo2,
  ScrollText,
  Calculator,
  FileText,
  ShieldCheck,
  BarChart3,
  Presentation,
  FileLock,
  TrendingDown,
  CheckCircle2,
  Check,
} from "lucide-react";
import { MenuDef, ActionType } from "../constants/accessControlData";
import { ToggleSwitch } from "./ToggleSwitch";

interface MenuPermissionCardProps {
  menu: MenuDef;
  isMenuEnabled: boolean;
  isExpanded: boolean;
  onToggleMenu: (menuId: string, val: boolean) => void;
  onToggleExpand: (menuId: string) => void;
  onToggleAction: (actionId: string, val: boolean, parentMenuId: string) => void;
  onToggleAllActions: (menuId: string, enableAll: boolean) => void;
  enabledActionsSet: Set<string>;
  isReadOnly?: boolean;
}

function renderMenuIcon(name: string) {
  const size = 18;
  switch (name) {
    case "LayoutDashboard":
      return <LayoutDashboard size={size} />;
    case "Package":
      return <Package size={size} />;
    case "FileCheck":
      return <FileCheck size={size} />;
    case "CalendarDays":
      return <CalendarDays size={size} />;
    case "ClipboardList":
      return <ClipboardList size={size} />;
    case "CalendarClock":
      return <CalendarClock size={size} />;
    case "Undo2":
      return <Undo2 size={size} />;
    case "ScrollText":
      return <ScrollText size={size} />;
    case "Calculator":
      return <Calculator size={size} />;
    case "FileText":
      return <FileText size={size} />;
    case "ShieldCheck":
      return <ShieldCheck size={size} />;
    case "BarChart3":
      return <BarChart3 size={size} />;
    case "Presentation":
      return <Presentation size={size} />;
    case "FileLock":
      return <FileLock size={size} />;
    case "TrendingDown":
      return <TrendingDown size={size} />;
    default:
      return <Package size={size} />;
  }
}

function getActionBadgeStyle(type: ActionType) {
  switch (type) {
    case "view":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "create":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    case "edit":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "delete":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800";
    case "export":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    case "approve":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
  }
}

export function MenuPermissionCard({
  menu,
  isMenuEnabled,
  isExpanded,
  onToggleMenu,
  onToggleExpand,
  onToggleAction,
  onToggleAllActions,
  enabledActionsSet,
  isReadOnly = false,
}: MenuPermissionCardProps) {
  // In read-only mode, only show actions that are actually granted to the role
  const displayActions = isReadOnly
    ? menu.actions.filter((a) => enabledActionsSet.has(a.id))
    : menu.actions;

  const activeActionCount = menu.actions.filter((a) =>
    enabledActionsSet.has(a.id)
  ).length;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isMenuEnabled
          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
          : "bg-slate-50/70 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60 opacity-80"
      }`}
    >
      {/* Menu Card Header */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          onClick={() => onToggleExpand(menu.id)}
          className="flex items-start sm:items-center gap-3 cursor-pointer select-none flex-1 group/header"
          title={isExpanded ? "Klik untuk menutup sub-action" : "Klik untuk membuka sub-action"}
        >
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
              isMenuEnabled
                ? "bg-blue-50 text-[#004a87] dark:bg-blue-900/30 dark:text-blue-400 group-hover/header:bg-blue-100"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {renderMenuIcon(menu.iconName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover/header:text-[#004a87] dark:group-hover/header:text-blue-400 transition-colors">
                {menu.name}
              </h5>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {menu.path}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              {menu.description}
            </p>
          </div>
        </div>

        {/* Menu Toggle + Expand Trigger */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          {/* ON / OFF Switch for Sidebar Menu (or Read-Only Badge) */}
          {isReadOnly ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Akses Diizinkan</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sidebar Menu:
              </span>
              <ToggleSwitch
                checked={isMenuEnabled}
                onChange={(val) => onToggleMenu(menu.id, val)}
                label={isMenuEnabled ? "ON (Tampil)" : "OFF"}
              />
            </div>
          )}

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => onToggleExpand(menu.id)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? "Tutup Sub-Action" : "Buka Sub-Action"}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Sub-actions Section */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 rounded-b-2xl">
          {/* Action section title & bulk toggles */}
          <div className="flex items-center justify-between py-2 mb-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>{isReadOnly ? "Aksi Operasional yang Diberikan:" : "Izin Aksi (Actions di Halaman ini):"}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isReadOnly
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}>
                {isReadOnly ? `${displayActions.length} Aksi Aktif` : `${activeActionCount} dari ${menu.actions.length} Aktif`}
              </span>
            </span>

            {!isReadOnly && isMenuEnabled && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleAllActions(menu.id, true)}
                  className="text-[11px] font-semibold text-[#004a87] dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => onToggleAllActions(menu.id, false)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline cursor-pointer"
                >
                  Nonaktifkan Semua
                </button>
              </div>
            )}
          </div>

          {/* Sub-Actions Grid */}
          {displayActions.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Tidak ada aksi operasional khusus yang diberikan pada modul ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {displayActions.map((act) => {
                const isActionEnabled = enabledActionsSet.has(act.id);
                return (
                  <div
                    key={act.id}
                    onClick={
                      !isReadOnly
                        ? () => onToggleAction(act.id, !isActionEnabled, menu.id)
                        : undefined
                    }
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      !isReadOnly ? "cursor-pointer" : ""
                    } ${
                      isActionEnabled
                        ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xs"
                        : "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getActionBadgeStyle(
                            act.type
                          )}`}
                        >
                          {act.type}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {act.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {act.description}
                      </p>
                    </div>

                    {/* Action Status: Badge (Read-Only) or Toggle Switch (Admin) */}
                    <div className="pt-0.5 flex-shrink-0">
                      {isReadOnly ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          <Check size={11} className="stroke-[3]" /> Diizinkan
                        </span>
                      ) : (
                        <ToggleSwitch
                          checked={isActionEnabled}
                          onChange={(val) =>
                            onToggleAction(act.id, val, menu.id)
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
