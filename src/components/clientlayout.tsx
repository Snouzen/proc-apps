"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { Menu, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Modal from "@/components/modal";
import { getMe, getMeSync, clearMeCache } from "@/lib/me";
import Breadcrumbs from "@/components/breadcrumbs";
import { AutoRefreshProvider } from "@/components/auto-refresh";

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

  const [profileRole, setProfileRole] = useState<"pusat" | "rm" | null>(null);
  const [profileRegional, setProfileRegional] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const cached = getMeSync();
    if (mounted && cached?.authenticated && cached.role) {
      if (cached.role === "rm") {
        setProfileRole("rm");
        setProfileRegional(cached.regional || null);
      } else {
        setProfileRole("pusat");
        setProfileRegional(null);
      }
    }
    getMe()
      .then((data) => {
        if (!mounted) return;
        if (data?.authenticated && data?.role === "rm") {
          setProfileRole("rm");
          setProfileRegional(data?.regional || null);
        } else if (data?.authenticated) {
          setProfileRole("pusat");
          setProfileRegional(null);
        } else {
          setProfileRole(null);
          setProfileRegional(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setProfileRole(null);
        setProfileRegional(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
                    <p className="text-sm font-black text-slate-800">
                      {profileRole === "rm"
                        ? (() => {
                            let reg = String(profileRegional || "");
                            if (reg.startsWith("Reg "))
                              reg = reg.replace(/^Reg\s+/i, "Regional ");
                            // Tambahkan kota default jika belum ada
                            const low = reg.toLowerCase();
                            if (
                              /regional\s*1\b/i.test(reg) &&
                              !low.includes("bandung")
                            )
                              reg = reg + " Bandung";
                            if (
                              /regional\s*2\b/i.test(reg) &&
                              !low.includes("surabaya")
                            )
                              reg = reg + " Surabaya";
                            if (
                              /regional\s*3\b/i.test(reg) &&
                              !low.includes("makassar")
                            )
                              reg = reg + " Makassar";
                            return reg.trim();
                          })()
                        : profileRole === "pusat"
                          ? "Admin Pusat"
                          : ""}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {profileRole === "rm"
                        ? (() => {
                            const reg = String(profileRegional || "");
                            const m =
                              reg.match(/\bReg(?:ional)?\s+(\d+)/i) ||
                              reg.match(/\b(\d+)\b/);
                            const num = m && m[1] ? m[1] : "";
                            return `RM ${num}`.trim();
                          })()
                        : profileRole === "pusat"
                          ? "Super Admin"
                          : ""}
                    </p>
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full border-2 border-[#004a87] p-0.5 shadow-sm">
                    {profileRole ? (
                      <img
                        src={
                          profileRole === "rm"
                            ? "https://ui-avatars.com/api/?name=RM&background=004a87&color=fff"
                            : "https://ui-avatars.com/api/?name=Administrator+Pusat&background=004a87&color=fff"
                        }
                        alt="user"
                        className="w-full h-full rounded-full object-cover"
                      />
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
