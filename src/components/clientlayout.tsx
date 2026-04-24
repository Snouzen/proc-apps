"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getMe, getMeSync, clearMeCache } from "@/lib/me";
import { AutoRefreshProvider } from "@/components/auto-refresh";

// Dynamic imports to reduce initial bundle size & main-thread work
const Sidebar = dynamic(() => import("@/components/sidebar"), { ssr: false });
const Modal = dynamic(() => import("@/components/modal"), { ssr: false });
const Breadcrumbs = dynamic(() => import("@/components/breadcrumbs"), { ssr: false });

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isLogin = pathname === "/login";
  const isFullWidthPage = pathname === "/po" || pathname.startsWith("/po/");

  const [profileRole, setProfileRole] = useState<
    "pusat" | "rm" | "sitearea" | null
  >(null);
  const [profileRegional, setProfileRegional] = useState<string | null>(null);
  const [profileSiteArea, setProfileSiteArea] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);

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
      const restricted = ["/master-data"]; // Keep master-data restricted
      if (restricted.some((p) => pathname.startsWith(p))) {
        router.push("/");
      }
    }
  }, [profileRole, pathname, router]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AutoRefreshProvider intervalMs={60000}>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        {/* 1. SIDEBAR */}
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          initialRole={profileRole}
          initialRegional={profileRegional}
        />

        {/* 2. MAIN AREA */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out min-w-0
        ${sidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}
        >
          {/* HEADER PINDAH KE SINI */}
          <div className="p-4 md:p-8">
            <header className="flex justify-between items-center mb-8 bg-white/50 p-4 rounded-3xl backdrop-blur-md border border-white sticky top-4 z-30">
              <div className="flex items-center gap-4">
                {/* SEKARANG TOGGLE INI PASTI FUNGSI */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  suppressHydrationWarning
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                >
                  <Menu size={22} />
                </button>

                <div className="hidden lg:block h-6 w-[1px] bg-slate-200 mx-1"></div>

                {/* BREADCRUMBS */}
                <div className="hidden md:block">
                  <Breadcrumbs />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Garis Pembatas Utama */}
                <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>

                {/* Profile & Logout Section */}
                <div className="flex items-center gap-4">
                  {/* Info Teks */}
                  <div className="text-right hidden sm:block leading-tight">
                    <p className="text-sm font-black text-slate-800 uppercase">
                      {profileRole === "sitearea"
                        ? profileEmail
                          ? profileEmail.split("@")[0]
                          : "ADMIN CABANG"
                        : profileRole === "rm"
                          ? profileRegional || "Regional Manager"
                          : "ADMIN PUSAT"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {profileRole === "sitearea"
                        ? profileRegional || "-"
                        : profileRole === "rm"
                          ? "Regional Manager"
                          : "Super Admin"}
                      {/* Email disembunyiin buat sitearea (sudah di judul) dan pusat (permintaan user) */}
                      {profileRole === "rm" &&
                        profileEmail &&
                        ` • ${profileEmail.split("@")[0]}`}
                    </p>
                  </div>
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full border-2 border-[#004a87] p-0.5 shadow-sm overflow-hidden"
                    title={profileEmail || ""}
                  >
                    {profileRole ? (
                      <div className="w-full h-full rounded-full bg-[#004a87] flex items-center justify-center text-white font-bold text-xs">
                        {profileRole === "sitearea"
                          ? "SC"
                          : profileRole === "rm"
                            ? "RM"
                            : "AD"}
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-200 animate-pulse" />
                    )}
                  </div>

                  {/* Garis Pembatas Kecil */}
                  <div className="h-6 w-[1px] bg-slate-200"></div>

                  {/* Tombol Logout Langsung */}
                  <button
                    onClick={() => {
                      setLogoutOpen(true);
                    }}
                    suppressHydrationWarning
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group relative"
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
              className={isFullWidthPage ? "w-full" : "max-w-[1600px] mx-auto"}
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
            <p className="text-sm text-slate-600">
              Anda yakin ingin logout dari akun{" "}
              {profileRole === "rm" ? "Regional Manager" : "Admin Pusat"}?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 text-sm px-3 py-2 hover:bg-gray-50"
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
