"use client";

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileLock,
  FileText,
  Home,
  LayoutDashboard,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/lib/me";
// Hindari Next/Image untuk logo agar tidak terjadi error validasi gambar saat dev

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialRole?: "pusat" | "rm" | null;
  initialRegional?: string | null;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  initialRole,
  initialRegional,
}: SidebarProps) {
  const pathname = usePathname();
  const [poMenuOpen, setPoMenuOpen] = useState(false);
  const [role, setRole] = useState<"pusat" | "rm" | null>(initialRole || null);
  const [regional, setRegional] = useState<string | null>(
    initialRegional ?? null,
  );

  // Otomatis buka sub-menu kalau kita lagi di halaman PO
  useEffect(() => {
    if (pathname.includes("/po-details")) {
      setPoMenuOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole === "rm" ? "rm" : "pusat");
      setRegional(initialRegional ?? null);
      return;
    }
    (async () => {
      try {
        const data = await getMe();
        if (data?.authenticated && data?.role === "rm") {
          setRole("rm");
          setRegional(data?.regional || null);
        } else if (data?.authenticated) {
          setRole("pusat");
          setRegional(null);
        } else {
          setRole(null);
          setRegional(null);
        }
      } catch {
        setRole(null);
        setRegional(null);
      }
    })();
  }, [initialRole, initialRegional]);

  const baseMenu = [
    { name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/" },
    { name: "Report", icon: <BarChart3 size={20} />, path: "/report" },
  ];
  const pusatExtras = [
    { name: "Company", icon: <BookOpen size={20} />, path: "/company" },
  ];
  const rmExtras = [
    { name: "Company", icon: <BookOpen size={20} />, path: "/company" },
  ];

  let menuItems = baseMenu;
  if (role === "pusat") {
    menuItems = [...baseMenu, ...pusatExtras];
  } else if (role === "rm") {
    menuItems = [...baseMenu, ...rmExtras];
  }

  const subItems =
    role === "rm" || !role
      ? []
      : [
          {
            name: `Unit Produksi`,
            icon: <FileLock size={16} />,
            path: "/master-data/unit-produksi",
          },
          {
            name: `Produk`,
            icon: <FileCheck size={16} />,
            path: "/master-data/produk",
          },
          {
            name: `Ritel Modern`,
            icon: <ClipboardList size={16} />,
            path: "/master-data/ritel-modern",
          },
        ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-50 transition-all duration-300 ease-in-out
        ${isOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"}`}
      >
        {/* Header Logo */}
        <div className="h-20 flex items-center px-6 mb-4">
          {isOpen ? (
            <div className="relative w-full h-10 transition-all duration-300">
              <img
                src="/logo-bulog.png"
                alt="Bulog Logo"
                className="w-full h-full object-contain object-left"
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0 mx-auto transition-all duration-300">
              <span className="text-white font-black text-xl italic">B</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group
                  ${
                    isActive
                      ? "bg-amber-50 text-amber-600 font-bold shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
              >
                <span
                  className={`shrink-0 ${isActive ? "text-amber-600" : "group-hover:scale-110 transition-transform"}`}
                >
                  {item.icon}
                </span>
                {isOpen && (
                  <span className="text-sm whitespace-nowrap animate-in slide-in-from-left-2">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Collapsible Master Data (hide for RM) */}
          <div className="space-y-1">
            {role !== "rm" && (
              <>
                <div
                  onClick={() =>
                    isOpen ? setPoMenuOpen(!poMenuOpen) : setIsOpen(true)
                  }
                  className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
                ${pathname.includes("/master-data") ? "bg-slate-50 text-amber-600 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="shrink-0" />
                    {isOpen && (
                      <span className="text-sm whitespace-nowrap animate-in slide-in-from-left-2">
                        Master Data
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <span
                      className={`transition-transform duration-200 ${poMenuOpen ? "rotate-90" : ""}`}
                    >
                      <ChevronRight size={16} />
                    </span>
                  )}
                </div>

                {isOpen && poMenuOpen && (
                  <div className="mt-1 space-y-1 ml-4 border-l-2 border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    {subItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all
                        ${subActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                        >
                          <span className="shrink-0">{sub.icon}</span>
                          <span className="text-xs whitespace-nowrap">
                            {sub.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </nav>

        {/* User Profile Section removed as requested */}
      </aside>
    </>
  );
}
