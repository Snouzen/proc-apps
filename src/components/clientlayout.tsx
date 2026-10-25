"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Menu, LogOut, Sun, Moon, ChevronDown, Settings, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getMe, getMeSync, clearMeCache, announceSessionChange } from "@/lib/me";
import { AutoRefreshProvider } from "@/components/auto-refresh";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// Dynamic imports to reduce initial bundle size & main-thread work
const Sidebar = dynamic(() => import("@/components/sidebar"), { ssr: false });
const Modal = dynamic(() => import("@/components/modal"), { ssr: false });
const Breadcrumbs = dynamic(() => import("@/components/breadcrumbs"), { ssr: false });
const IdleTimeoutDetector = dynamic(() => import("@/components/IdleTimeoutDetector"), { ssr: false });

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isLogin = pathname === "/login";
  const isFullWidthPage = pathname === "/po" || pathname.startsWith("/po/");

  const [profileRole, setProfileRole] = useState<
    "pusat" | "rm" | "sitearea" | "magang" | null
  >(null);
  const [profileRegional, setProfileRegional] = useState<string | null>(null);
  const [profileSiteArea, setProfileSiteArea] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);

  const profileDisplayName =
    profileRole === "magang"
      ? "Admin Sales 1"
      : profileRole === "sitearea"
        ? profileEmail
          ? profileEmail.split("@")[0].toUpperCase()
          : "ADMIN CABANG"
        : profileRole === "rm"
          ? profileRegional || "Regional Manager"
          : "ADMIN PUSAT";

  const profileRoleLabel =
    profileRole === "magang"
      ? "Admin Bisnis"
      : profileRole === "sitearea"
        ? profileRegional || "Admin Cabang"
        : profileRole === "rm"
          ? "Regional Manager"
          : "Super Admin";

  const profileUsername = profileEmail
    ? profileEmail.split("@")[0]
    : (profileRole || "user");

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Sync sidebar state and body scroll with breakpoint changes (e.g. resize, device rotation)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(min-width: 1024px)");
    const handleBreakpointChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const isDesktop = e.matches;
      if (isDesktop) {
        document.body.style.overflow = "";
        setSidebarOpen(pathname !== "/report/realisasi");
      } else {
        setSidebarOpen(false);
        document.body.style.overflow = "";
      }
    };

    handleBreakpointChange(mql);

    if (mql.addEventListener) {
      mql.addEventListener("change", handleBreakpointChange);
      return () => mql.removeEventListener("change", handleBreakpointChange);
    } else {
      mql.addListener(handleBreakpointChange);
      return () => mql.removeListener(handleBreakpointChange);
    }
  }, [pathname]);

  // Lock body scroll on mobile when sidebar drawer is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 1024;
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    let mounted = true;
    const cached = getMeSync();
    if (mounted && cached?.authenticated && cached.role) {
      setProfileRole(cached.role as any);
      setProfileRegional(cached.regional || null);
      setProfileSiteArea(cached.siteArea || null);
      setProfileEmail(cached.email || null);
    }
    getMe()
      .then((data) => {
        if (!mounted) return;
        if (data?.authenticated && data?.role) {
          setProfileRole(data.role as any);
          setProfileRegional(data.regional || null);
          setProfileSiteArea(data.siteArea || null);
          setProfileEmail(data.email || null);
        } else {
          setProfileRole(null);
          setProfileRegional(null);
          setProfileSiteArea(null);
          setProfileEmail(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setProfileRole(null);
        setProfileRegional(null);
        setProfileSiteArea(null);
        setProfileEmail(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // SECURITY: Redirect logic moved to page-level if needed.
  // Whitelist roles have been expanded in sidebar and shared layouts.
  useEffect(() => {
    if (profileRole === "sitearea") {
      // Allow /report, /branch, /po for these roles
      const restricted = ["/master-data", "/credit-limit/approval"]; // Keep master-data and CL approval restricted
      if (restricted.some((p) => pathname.startsWith(p))) {
        router.push("/");
      }
    }
    if (profileRole === "magang") {
      const allowed = ["/purchase-order", "/retur", "/checklist-docs", "/settings", "/access-control"];
      if (!allowed.some(p => pathname.startsWith(p))) {
        router.push("/purchase-order");
      }
    }
  }, [profileRole, pathname, router]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AutoRefreshProvider intervalMs={60000}>
      <IdleTimeoutDetector />
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex transition-colors duration-300">
        {/* 1. SIDEBAR */}
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          initialRole={profileRole}
          initialRegional={profileRegional}
          initialSiteArea={profileSiteArea}
        />

        {/* 2. MAIN AREA */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out min-w-0
        ${sidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}
        >
          {/* HEADER PINDAH KE SINI */}
          <div className="p-3 sm:p-5 lg:p-6 min-w-0">
            <header className="flex justify-between items-center mb-6 sm:mb-8 bg-white/50 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-white dark:border-slate-700/50 sticky top-3 sm:top-4 z-30 transition-colors duration-300">
              <div className="flex items-center gap-4">
                {/* SEKARANG TOGGLE INI PASTI FUNGSI */}
                <button
                  id="sidebar-toggle-btn"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  suppressHydrationWarning
                  aria-label="Buka atau tutup menu navigasi"
                  aria-expanded={sidebarOpen}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-gray-500 dark:text-slate-400 cursor-pointer"
                >
                  <Menu size={22} />
                </button>

                <div className="hidden lg:block h-6 w-[1px] bg-slate-200 dark:bg-slate-600 mx-1"></div>

                {/* BREADCRUMBS */}
                <div className="hidden md:block">
                  <Breadcrumbs />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  suppressHydrationWarning
                  className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all group relative"
                >
                  {theme === "light" ? <Sun size={20} /> : <Moon size={20} className="text-blue-500" />}
                  {/* Tooltip */}
                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {theme === "light" ? "Light Mode" : "Dark Mode"}
                  </span>
                </button>

                {/* Garis Pembatas Utama */}
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-600 mx-2 hidden sm:block"></div>

                {/* Profile & Logout Section */}
                <div className="flex items-center gap-3">
                  {/* Dropdown Profile */}
                  <Popover open={profileDropdownOpen} onOpenChange={setProfileDropdownOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2.5 p-1 sm:p-1.5 -m-1 sm:-m-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-right group outline-none select-none cursor-pointer"
                        title="Klik untuk membuka menu profil"
                      >
                        {/* Info Teks */}
                        <div className="text-right hidden sm:block leading-tight">
                          <div className="flex items-center justify-end gap-1.5">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase group-hover:text-[#004a87] dark:group-hover:text-blue-400 transition-colors">
                              {profileDisplayName}
                            </p>
                            <ChevronDown
                              size={14}
                              className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
                                profileDropdownOpen ? "rotate-180 text-[#004a87] dark:text-blue-400" : ""
                              }`}
                            />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                            {profileRoleLabel}
                            {profileRole === "rm" &&
                              profileEmail &&
                              ` • ${profileEmail.split("@")[0]}`}
                          </p>
                        </div>

                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full border-2 border-[#004a87] p-0.5 shadow-sm overflow-hidden flex-shrink-0 group-hover:border-blue-600 transition-colors"
                          title={profileEmail || ""}
                        >
                          {profileRole ? (
                            <div className="w-full h-full rounded-full bg-[#004a87] flex items-center justify-center text-white font-bold text-xs">
                              {profileRole === "magang"
                                ? "AS"
                                : profileRole === "sitearea"
                                  ? "SC"
                                  : profileRole === "rm"
                                    ? "RM"
                                    : "AD"}
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-full bg-slate-200 animate-pulse" />
                          )}
                        </div>
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      align="end"
                      sideOffset={8}
                      className="w-64 p-2 shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl z-50"
                    >
                      {/* Dropdown User Info Header */}
                      <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-1.5 border border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#004a87] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs">
                            {profileRole === "magang"
                              ? "AS"
                              : profileRole === "sitearea"
                                ? "SC"
                                : profileRole === "rm"
                                  ? "RM"
                                  : "AD"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                              {profileDisplayName}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                              @{profileUsername}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Role
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#004a87] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                            {profileRoleLabel}
                          </span>
                        </div>
                      </div>

                      {/* Menu Options */}
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            router.push("/settings");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left group cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-[#004a87] dark:group-hover:bg-blue-950/50 dark:group-hover:text-blue-300 transition-colors">
                            <Settings size={15} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#004a87] dark:group-hover:text-blue-400 transition-colors">
                              Settings
                            </div>
                            <div className="text-[10px] font-normal text-slate-400">
                              Info profil & kredensial
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            router.push("/access-control");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left group cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-[#004a87] dark:group-hover:bg-blue-950/50 dark:group-hover:text-blue-300 transition-colors">
                            <ShieldCheck size={15} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#004a87] dark:group-hover:text-blue-400 transition-colors">
                              Access Control
                            </div>
                            <div className="text-[10px] font-normal text-slate-400">
                              Manajemen hak akses & peran
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="my-1.5 h-[1px] bg-slate-100 dark:bg-slate-800" />

                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setLogoutOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left group cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500">
                          <LogOut size={15} />
                        </div>
                        <span className="font-bold">Keluar Akun</span>
                      </button>
                    </PopoverContent>
                  </Popover>

                  {/* Garis Pembatas Kecil */}
                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-600"></div>

                  {/* Tombol Logout Langsung */}
                  <button
                    onClick={() => {
                      setLogoutOpen(true);
                    }}
                    suppressHydrationWarning
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all group relative cursor-pointer"
                  >
                    <LogOut size={20} />
                    {/* Tooltip */}
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Keluar Akun
                    </span>
                  </button>
                </div>
              </div>
            </header>

            {/* ISI PAGE.TSX MASUK KE SINI */}
            <div
              className={`min-w-0 ${isFullWidthPage ? "w-full" : "max-w-[1600px] mx-auto"}`}
            >
              {children}
            </div>
          </div>
        </main>
        <Modal
          open={logoutOpen}
          onClose={() => setLogoutOpen(false)}
          title="Keluar dari Aplikasi?"
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Anda yakin ingin logout dari akun{" "}
              {profileRole === "rm" ? "Regional Manager" : profileRole === "sitearea" ? "Admin Cabang" : profileRole === "magang" ? "Admin Bisnis" : "Admin Pusat"}?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-slate-200"
                onClick={() => setLogoutOpen(false)}
              >
                Batal
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 text-white text-sm px-3 py-2 hover:bg-red-700"
                onClick={() => {
                  fetch("/api/auth/logout", { method: "POST" })
                    .catch(() => {})
                    .finally(() => {
                      clearMeCache();
                      announceSessionChange();
                      setProfileRole(null);
                      setProfileRegional(null);
                      setLogoutOpen(false);
                      router.push("/login");
                    });
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AutoRefreshProvider>
  );
}
