"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  ShieldCheck,
  Users,
  Sparkles,
  ArrowLeft,
  Search,
  RotateCcw,
  Sliders,
  X,
  Eye,
  Loader2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { getMe } from "@/lib/me";
import {
  SYSTEM_MENUS,
  EXISTING_ROLES,
  DEFAULT_ROLE_CONFIGS,
  MenuDef,
} from "./constants/accessControlData";
import { RoleCardList } from "./components/RoleCardList";
import { MenuPermissionCard } from "./components/MenuPermissionCard";
import {
  getStoredPermissions,
  getStoredPermissionsVersion,
  fetchPermissionsFromServer,
  fetchPermissionsWithVersionFromServer,
  saveRolePermissionsToServer,
  resetRolePermissionsOnServer,
} from "@/lib/permissions";

export default function AccessControlPage() {
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("");
  const [previewAsUser, setPreviewAsUser] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [currentVersion, setCurrentVersion] = useState<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Permissions state per role (SSR-safe initialization matching server HTML)
  const [permissionsState, setPermissionsState] = useState<
    Record<
      string,
      {
        menus: Set<string>;
        actions: Set<string>;
      }
    >
  >(() => {
    const initial: Record<string, { menus: Set<string>; actions: Set<string> }> = {};
    for (const [code, cfg] of Object.entries(DEFAULT_ROLE_CONFIGS)) {
      initial[code] = {
        menus: new Set(cfg.enabledMenus),
        actions: new Set(cfg.enabledActions),
      };
    }
    return initial;
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "active" | "inactive">("all");
  // Default is closed/collapsed for clean overview as requested by user
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 1. Immediately hydrate with cached localStorage permissions after mount
    const stored = getStoredPermissions();
    const storedV = getStoredPermissionsVersion();
    setCurrentVersion(storedV);
    const localUpdated: Record<string, { menus: Set<string>; actions: Set<string> }> = {};
    for (const [code, cfg] of Object.entries(stored)) {
      localUpdated[code] = {
        menus: new Set(cfg.enabledMenus || []),
        actions: new Set(cfg.enabledActions || []),
      };
    }
    setPermissionsState(localUpdated);

    // 2. Determine current user role
    void getMe(true).then(me => {
      if (!me.authenticated || !me.role) {
        setIdentityError("Sesi tidak tersedia. Silakan login kembali.");
        return;
      }
      const role = me.role === "spb_dki" ? "sitearea" : me.role;
      setCurrentUserRole(role);
      setSelectedRoleCode(role);
    }).catch(() => setIdentityError("Gagal memuat identitas akun. Silakan coba lagi."));

    // 3. Fetch latest permissions and version from server and sync
    fetchPermissionsWithVersionFromServer().then(({ map, version }) => {
      setCurrentVersion(version);
      const updated: Record<string, { menus: Set<string>; actions: Set<string> }> = {};
      for (const [code, cfg] of Object.entries(map)) {
        updated[code] = {
          menus: new Set(cfg.enabledMenus || []),
          actions: new Set(cfg.enabledActions || []),
        };
      }
      setPermissionsState(updated);
    });
  }, []);

  const isPusat = currentUserRole === "pusat";
  // Effective read-only view: true if non-pusat user, or if pusat has activated preview mode
  const isEffectiveReadOnly = !isPusat || previewAsUser;

  const selectedRole = useMemo(() => {
    return EXISTING_ROLES.find((r) => r.code === selectedRoleCode) || EXISTING_ROLES[0];
  }, [selectedRoleCode]);

  const currentRolePerms = useMemo(() => {
    return permissionsState[selectedRoleCode] || { menus: new Set(), actions: new Set() };
  }, [permissionsState, selectedRoleCode]);

  // Persist role permissions to server & local cache
  const persistRolePermissions = (roleCode: string, menus: Set<string>, actions: Set<string>) => {
    if (!isPusat) return;
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveRolePermissionsToServer(
      roleCode,
      {
        enabledMenus: Array.from(menus),
        enabledActions: Array.from(actions),
      },
      currentVersion
    ).then((res) => {
      if (res.ok) {
        setCurrentVersion(res.version);
        setSaveStatus("saved");
        saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } else {
        setSaveStatus("idle");
        alert(res.error || "Gagal menyimpan hak akses.");
        fetchPermissionsWithVersionFromServer().then(({ map, version }) => {
          setCurrentVersion(version);
          const updated: Record<string, { menus: Set<string>; actions: Set<string> }> = {};
          for (const [code, cfg] of Object.entries(map)) {
            updated[code] = {
              menus: new Set(cfg.enabledMenus || []),
              actions: new Set(cfg.enabledActions || []),
            };
          }
          setPermissionsState(updated);
        });
      }
    });
  };

  // Toggle Menu in Sidebar
  const handleToggleMenu = (menuId: string, enabled: boolean) => {
    const rolePerm = permissionsState[selectedRoleCode] || { menus: new Set(), actions: new Set() };
    const newMenus = new Set(rolePerm.menus);
    const newActions = new Set(rolePerm.actions);

    if (enabled) {
      newMenus.add(menuId);
      const menuDef = SYSTEM_MENUS.find((m) => m.id === menuId);
      if (menuDef) {
        menuDef.actions.forEach((a) => {
          if (a.type === "view") newActions.add(a.id);
        });
      }
    } else {
      newMenus.delete(menuId);
      const menuDef = SYSTEM_MENUS.find((m) => m.id === menuId);
      if (menuDef) {
        menuDef.actions.forEach((a) => newActions.delete(a.id));
      }
    }

    setPermissionsState((prev) => ({
      ...prev,
      [selectedRoleCode]: { menus: newMenus, actions: newActions },
    }));

    persistRolePermissions(selectedRoleCode, newMenus, newActions);
  };

  // Toggle Action under a Menu
  const handleToggleAction = (actionId: string, enabled: boolean, parentMenuId: string) => {
    const rolePerm = permissionsState[selectedRoleCode] || { menus: new Set(), actions: new Set() };
    const newMenus = new Set(rolePerm.menus);
    const newActions = new Set(rolePerm.actions);

    if (enabled) {
      newActions.add(actionId);
      newMenus.add(parentMenuId);
    } else {
      newActions.delete(actionId);
    }

    setPermissionsState((prev) => ({
      ...prev,
      [selectedRoleCode]: { menus: newMenus, actions: newActions },
    }));

    persistRolePermissions(selectedRoleCode, newMenus, newActions);
  };

  // Enable/Disable All Actions for a Menu
  const handleToggleAllActionsForMenu = (menuId: string, enableAll: boolean) => {
    const menuDef = SYSTEM_MENUS.find((m) => m.id === menuId);
    if (!menuDef) return;

    const rolePerm = permissionsState[selectedRoleCode] || { menus: new Set(), actions: new Set() };
    const newMenus = new Set(rolePerm.menus);
    const newActions = new Set(rolePerm.actions);

    if (enableAll) {
      newMenus.add(menuId);
      menuDef.actions.forEach((a) => newActions.add(a.id));
    } else {
      menuDef.actions.forEach((a) => newActions.delete(a.id));
    }

    setPermissionsState((prev) => ({
      ...prev,
      [selectedRoleCode]: { menus: newMenus, actions: newActions },
    }));

    persistRolePermissions(selectedRoleCode, newMenus, newActions);
  };

  // Reset to default configuration for current selected role
  const handleResetToDefault = async () => {
    if (!isPusat) return;
    setSaveStatus("saving");
    const res = await resetRolePermissionsOnServer(selectedRoleCode, currentVersion);
    if (!res.ok) {
      setSaveStatus("idle");
      alert(res.error || "Gagal mereset hak akses.");
      fetchPermissionsWithVersionFromServer().then(({ map, version }) => {
        setCurrentVersion(version);
        const updated: Record<string, { menus: Set<string>; actions: Set<string> }> = {};
        for (const [code, cfg] of Object.entries(map)) {
          updated[code] = {
            menus: new Set(cfg.enabledMenus || []),
            actions: new Set(cfg.enabledActions || []),
          };
        }
        setPermissionsState(updated);
      });
      return;
    }

    setCurrentVersion(res.version);
    const updatedMap = res.data;
    const def = updatedMap[selectedRoleCode] || DEFAULT_ROLE_CONFIGS[selectedRoleCode];
    if (!def) return;

    setPermissionsState((prev) => ({
      ...prev,
      [selectedRoleCode]: {
        menus: new Set(def.enabledMenus),
        actions: new Set(def.enabledActions),
      },
    }));
    setSaveStatus("saved");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("idle");
    }, 2000);
  };

  const allAreExpanded =
    SYSTEM_MENUS.length > 0 && SYSTEM_MENUS.every((m) => !!expandedMenus[m.id]);

  const handleToggleExpandAll = () => {
    if (allAreExpanded) {
      setExpandedMenus({});
    } else {
      const exp: Record<string, boolean> = {};
      SYSTEM_MENUS.forEach((m) => {
        exp[m.id] = true;
      });
      setExpandedMenus(exp);
    }
  };

  // Filtered menus
  const filteredMenus = useMemo(() => {
    return SYSTEM_MENUS.filter((m) => {
      const isMenuOn = currentRolePerms.menus.has(m.id);

      // In read-only mode (non-pusat role or preview mode), strictly show ONLY menus granted to this role
      if (isEffectiveReadOnly && !isMenuOn) return false;

      // In admin edit mode, apply visibilityFilter
      if (!isEffectiveReadOnly) {
        if (visibilityFilter === "active" && !isMenuOn) return false;
        if (visibilityFilter === "inactive" && isMenuOn) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchMenu = m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q);
      const matchAction = m.actions.some((a) => {
        // If read-only, only consider actions granted to this role
        if (isEffectiveReadOnly && !currentRolePerms.actions.has(a.id)) return false;
        return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      });
      return matchMenu || matchAction;
    });
  }, [currentRolePerms, visibilityFilter, searchQuery, isEffectiveReadOnly]);

  // Group filtered menus by category
  const groupedMenus = useMemo(() => {
    const groups: Record<string, MenuDef[]> = {};
    filteredMenus.forEach((m) => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [filteredMenus]);

  const totalEnabledMenus = currentRolePerms.menus.size;
  const totalEnabledActions = currentRolePerms.actions.size;
  const totalPossibleActions = SYSTEM_MENUS.reduce((acc, m) => acc + m.actions.length, 0);

  if (identityError) return <div className="p-6 space-y-3" role="alert"><p>{identityError}</p><button type="button" className="rounded-lg bg-slate-900 text-white px-4 py-2" onClick={() => window.location.reload()}>Coba Lagi</button></div>;
  if (!currentUserRole) return <div className="p-6">Memuat identitas dan hak akses...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#004a87]/10 dark:bg-blue-500/10 text-[#004a87] dark:text-blue-400">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {isEffectiveReadOnly && !isPusat
                  ? "Daftar Hak Akses Akun"
                  : "Access Control Management"}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isEffectiveReadOnly && !isPusat
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}>
                {isEffectiveReadOnly && !isPusat ? "Hak Akses Aktif" : "Simulasi Interaktif RBAC"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isEffectiveReadOnly && !isPusat
                ? "Daftar modul menu sidebar dan hak aksi operasional yang diberikan untuk akun Anda"
                : "Konfigurasi visibilitas menu sidebar (ON/OFF) serta daftar aksi operasional (actions) per modul"}
            </p>
          </div>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 w-fit"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Settings</span>
        </Link>
      </div>

      {/* Info Banner Roadmap */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-2xl p-5 border border-blue-200/80 dark:border-blue-900/50 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-[#004a87] dark:text-blue-400 flex-shrink-0">
          <Sparkles size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            {isEffectiveReadOnly && !isPusat
              ? `Hak Akses Aktif Akun Anda (${selectedRole.name})`
              : "Simulasi Matriks Hak Akses Peran (Interactive Preview)"}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {isEffectiveReadOnly && !isPusat
              ? "Berikut adalah daftar modul menu sidebar dan tindakan operasional yang diizinkan untuk peran akun Anda. Modul dan aksi yang tidak tertera tidak dapat diakses sesuai dengan kebijakan keamanan sistem."
              : "Klik salah satu peran di bawah untuk melihat dan menyimulasikan menu sidebar mana saja yang tampil (ON/OFF), beserta sub-daftar aksi spesifik (View, Create, Edit, Delete, Export, Approve) di tiap halamannya."}
          </p>
        </div>
      </div>

      {/* Roles Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#004a87] dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {!isPusat ? "Peran Akun Anda" : "Pilih Peran Sistem (Existing Roles)"}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {!isPusat ? "Hak akses yang berlaku saat ini" : "Klik kartu untuk mengelola izin"}
          </span>
        </div>

        <RoleCardList
          roles={EXISTING_ROLES}
          selectedRoleCode={selectedRoleCode}
          onSelectRole={(code) => {
            if (isPusat) setSelectedRoleCode(code);
          }}
          currentUserRole={currentUserRole}
          permissionsState={permissionsState}
          totalMenusCount={SYSTEM_MENUS.length}
          isReadOnly={!isPusat}
        />
      </div>

      {/* Permissions Matrix Panel for Selected Role */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Panel Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sliders size={18} className="text-[#004a87] dark:text-blue-400" />
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                  {isEffectiveReadOnly
                    ? `Daftar Hak Akses: ${selectedRole.name}`
                    : `Konfigurasi Hak Akses: ${selectedRole.name}`}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedRole.badgeColor}`}>
                  {selectedRole.scope}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEffectiveReadOnly
                  ? "Daftar menu sidebar dan aksi operasional yang aktif dan dapat Anda akses di sistem."
                  : "Atur menu yang muncul di sidebar dan sesuaikan izin aksi (Action Buttons) di masing-masing modul."}
              </p>
            </div>

            {/* Quick Stats & Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400">
                  {isEffectiveReadOnly ? "Menu Sidebar Aktif: " : "Sidebar Menus: "}
                </span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black" suppressHydrationWarning>
                  {totalEnabledMenus}
                </strong>
                <span className="text-slate-400 font-normal">
                  {isEffectiveReadOnly ? " Menu" : ` / ${SYSTEM_MENUS.length} ON`}
                </span>
              </div>

              <div className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400">
                  {isEffectiveReadOnly ? "Aksi Operasional: " : "Total Actions: "}
                </span>
                <strong className="text-[#004a87] dark:text-blue-400 font-black" suppressHydrationWarning>
                  {totalEnabledActions}
                </strong>
                <span className="text-slate-400 font-normal">
                  {isEffectiveReadOnly ? " Diizinkan" : ` / ${totalPossibleActions} Diizinkan`}
                </span>
              </div>

              {/* Real-time Save Status Indicator */}
              {saveStatus === "saving" && (
                <div className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Menyimpan...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
                  <Check size={13} className="stroke-[3]" />
                  <span>Tersimpan di Sistem</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                title={allAreExpanded ? "Tutup semua sub-action" : "Buka semua sub-action"}
              >
                <span>{allAreExpanded ? "Tutup Semua Sub-Action" : "Buka Semua Sub-Action"}</span>
              </button>

              {/* Admin-only controls: Preview toggle & Reset to default */}
              {isPusat && (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewAsUser(!previewAsUser)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      previewAsUser
                        ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                    }`}
                    title="Simulasikan tampilan seperti yang dilihat oleh user dengan peran ini"
                  >
                    <Eye size={13} />
                    <span>{previewAsUser ? "Mode Pratinjau User: ON" : "Pratinjau Tampilan User"}</span>
                  </button>

                  {!previewAsUser && (
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                      title="Kembalikan konfigurasi role ini ke standar bawaan sistem"
                    >
                      <RotateCcw size={13} />
                      <span>Reset ke Default</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-700/80">
            {/* Search Input */}
            <div className={`relative w-full ${isEffectiveReadOnly ? "sm:max-w-md" : "sm:w-80"}`}>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu atau aksi..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004a87]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills (Admin only) */}
            {!isEffectiveReadOnly && (
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                  Tampilkan:
                </span>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    visibilityFilter === "all"
                      ? "bg-[#004a87] text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Semua ({SYSTEM_MENUS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter("active")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    visibilityFilter === "active"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Menu Aktif ({totalEnabledMenus})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter("inactive")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    visibilityFilter === "inactive"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Nonaktif ({SYSTEM_MENUS.length - totalEnabledMenus})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel Body: Category Groups */}
        <div className="p-5 sm:p-6 space-y-8">
          {Object.keys(groupedMenus).length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {isEffectiveReadOnly
                  ? "Tidak ada hak akses menu yang aktif untuk peran ini."
                  : "Tidak ada menu yang sesuai dengan filter pencarian."}
              </p>
            </div>
          ) : (
            Object.entries(groupedMenus).map(([category, menus]) => (
              <div key={category} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    {category}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                    {menus.length} Menu
                  </span>
                </div>

                {/* Menus in this category */}
                <div className="space-y-3">
                  {menus.map((menu) => (
                    <MenuPermissionCard
                      key={menu.id}
                      menu={menu}
                      isMenuEnabled={currentRolePerms.menus.has(menu.id)}
                      isExpanded={!!expandedMenus[menu.id]}
                      onToggleMenu={handleToggleMenu}
                      onToggleExpand={(id) =>
                        setExpandedMenus((prev) => ({
                          ...prev,
                          [id]: !prev[id],
                        }))
                      }
                      onToggleAction={handleToggleAction}
                      onToggleAllActions={handleToggleAllActionsForMenu}
                      enabledActionsSet={currentRolePerms.actions}
                      isReadOnly={isEffectiveReadOnly}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
