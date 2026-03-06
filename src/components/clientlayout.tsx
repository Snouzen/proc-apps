"use client";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Menu, Search, Bell, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Modal from "@/components/modal";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* 1. SIDEBAR */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

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

              <div className="hidden sm:flex items-center gap-2 bg-gray-100/50 px-4 py-2 rounded-xl border border-gray-100">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none focus:outline-none text-sm w-40 lg:w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              {/* Garis Pembatas Utama */}
              <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>

              {/* Profile & Logout Section */}
              <div className="flex items-center gap-4">
                {/* Info Teks */}
                <div className="text-right hidden sm:block leading-tight">
                  <p className="text-sm font-black text-slate-800">
                    Admin Pusat
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    Super Admin
                  </p>
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full border-2 border-[#004a87] p-0.5 shadow-sm">
                  <img
                    src="https://ui-avatars.com/api/?name=Administrator+Pusat&background=004a87&color=fff"
                    alt="user"
                    className="w-full h-full rounded-full object-cover"
                  />
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
          <div className="max-w-[1600px] mx-auto">{children}</div>
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
            Anda yakin ingin logout dari akun Admin Pusat?
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
  );
}
