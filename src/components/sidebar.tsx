"use client";

import {
  BarChart3,
  BookOpen,
  Calculator,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileLock,
  FileText,
  RotateCcw,
  X,
  TrendingDown,
  CalendarDays,
  CalendarClock,
  PackageSearch,
  Database,
  Package,
  Undo2,
  Target,
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getMe } from "@/lib/me";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialRole?: "pusat" | "rm" | "spb_dki" | "sitearea" | null;
  initialRegional?: string | null;
}

const RenderLink = ({
  item,
  pathname,
  isOpen,
}: {
  item: any;
  pathname: string;
  isOpen: boolean;
}) => {
  const isActive = pathname === item.path;
  return (
    <Link
      href={item.path}
      prefetch={false}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group
        ${
          isActive
            ? "bg-amber-50 text-amber-600 font-bold shadow-sm"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        }`}
    >
      <div className="w-6 h-6 flex items-center justify-center shrink-0">
        <span
          className={`${isActive ? "text-amber-600" : "group-hover:scale-110 transition-transform"}`}
        >
          {item.icon}
        </span>
      </div>
      {isOpen && <span className="text-sm whitespace-nowrap">{item.name}</span>}
    </Link>
  );
};

export default function Sidebar({
  isOpen,
  setIsOpen,
  initialRole,
  initialRegional,
}: SidebarProps) {
  const pathname = usePathname();
  const [poMenuOpen, setPoMenuOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [rekonMenuOpen, setRekonMenuOpen] = useState(false);
  const [actionPlanOpen, setActionPlanOpen] = useState(false);
  const [role, setRole] = useState<
    "pusat" | "rm" | "sitearea" | "spb_dki" | null
  >(initialRole || null);
  const [regional, setRegional] = useState<string | null>(
    initialRegional ?? null,
  );

  // Otomatis buka sub-menu kalau kita lagi di halaman terkait
  useEffect(() => {
    if (pathname.includes("/po-details") || pathname.includes("/master-data")) {
      setPoMenuOpen(true);
    }
    if (pathname.includes("/branch")) {
      setBranchMenuOpen(true);
    }
    if (pathname.includes("/rekon")) {
      setRekonMenuOpen(true);
    }
    if (pathname === "/schedule" || pathname === "/need-assign") {
      setActionPlanOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
      setRegional(initialRegional ?? null);
      return;
    }
    (async () => {
      try {
        const data = await getMe();
        if (data?.authenticated) {
          const r =
            data.role === "rm" || data.role === "sitearea"
              ? data.role
              : "pusat";
          setRole(r as any);
          setRegional(data?.regional || null);
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

  const dashboardItem = { name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/" };
  const poItem = { name: "Purchase Order", icon: <Package size={20} />, path: "/purchase-order" };
  const reportItem = { name: "Report", icon: <BarChart3 size={20} />, path: "/report" };
  const returItem = { name: "Data Retur", icon: <Undo2 size={20} />, path: "/retur" };

  const actionPlanSubItems = [
    { name: "Schedule", icon: <CalendarDays size={16} />, path: "/schedule" },
    {
      name: "Need To Assign",
      icon: <ClipboardList size={16} />,
      path: "/need-assign",
    },
  ];

  const rekonSubItems = [
    { name: "Kalkulasi", icon: <Calculator size={16} />, path: "/rekon/calc" },
    {
      name: "Data Rekonsiliasi",
      icon: <FileText size={16} />,
      path: "/rekon/data",
    },
  ];

  const branchSubItems = [
    {
      name: "Delivery Calendar",
      icon: <CalendarDays size={16} />,
      path: "/branch",
    },
    {
      name: "Expired Calendar",
      icon: <CalendarClock size={16} />,
      path: "/branch/expired",
    },
  ];

  const subItems = !role || role === "sitearea"
    ? []
    : role === "rm"
    ? [
        {
          name: `Ritel Modern`,
          icon: <ClipboardList size={16} />,
          path: "/master-data/ritel-modern",
        },
      ]
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
        {
          name: `Promo`,
          icon: <TrendingDown size={16} />,
          path: "/master-data/promo",
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
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-50 transition-all duration-300 ease-in-out flex flex-col
        ${isOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"}`}
      >
        {/* Header Logo */}
        <div className="h-20 flex items-center px-6 mb-2">
          {isOpen ? (
            <Link
              href="/"
              className="block transition-opacity hover:opacity-80"
            >
              <img
                src="https://mytkqzkpywdrpnrgafss.supabase.co/storage/v1/object/public/img_logo/logo-bulog/logo-bulog.png"
                alt="Bulog Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
          ) : (
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0 mx-auto transition-all duration-300">
              <span className="text-white font-black text-xl italic">B</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav 
          className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
          style={{ scrollbarGutter: 'stable' }}
        >
          {/* Helper to render a single link */}
          {/* 1. Dashboard */}
          <RenderLink item={dashboardItem} pathname={pathname} isOpen={isOpen} />

          {/* 2. Purchase Order */}
          {role !== "sitearea" && <RenderLink item={poItem} pathname={pathname} isOpen={isOpen} />}

          {/* 3. Action Plan */}
          <div className="space-y-1">
            <div
              onClick={() =>
                isOpen ? setActionPlanOpen(!actionPlanOpen) : setIsOpen(true)
              }
              className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
            ${pathname === "/schedule" || pathname === "/need-assign" ? "bg-amber-50 text-amber-600 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <Target size={20} />
                </div>
                {isOpen && (
                  <span className="text-sm whitespace-nowrap">
                    Action Plan
                  </span>
                )}
              </div>
              {isOpen && (
                <span
                  className={`transition-transform duration-200 ${actionPlanOpen ? "rotate-90" : ""}`}
                >
                  <ChevronRight size={16} />
                </span>
              )}
            </div>

            <div className={`grid transition-all duration-300 ease-in-out ${isOpen && actionPlanOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <div className="space-y-1 ml-4 border-l-2 border-slate-100">
                  {actionPlanSubItems
                    .filter(sub => role !== "sitearea" || sub.path === "/schedule")
                    .map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
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
              </div>
            </div>
          </div>

          {/* 4. Branch Plan */}
          {role !== "sitearea" && (
            <div className="space-y-1">
              <div
                onClick={() =>
                  isOpen ? setBranchMenuOpen(!branchMenuOpen) : setIsOpen(true)
                }
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
              ${pathname.includes("/branch") ? "bg-amber-50 text-amber-600 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <CalendarDays size={20} />
                  </div>
                  {isOpen && (
                    <span className="text-sm whitespace-nowrap">
                      Branch Plan
                    </span>
                  )}
                </div>
                {isOpen && (
                  <span
                    className={`transition-transform duration-200 ${branchMenuOpen ? "rotate-90" : ""}`}
                  >
                    <ChevronRight size={16} />
                  </span>
                )}
              </div>

              <div className={`grid transition-all duration-300 ease-in-out ${isOpen && branchMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 ml-4 border-l-2 border-slate-100">
                    {branchSubItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
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
                </div>
              </div>
            </div>
          )}

          {/* 5. Data Retur */}
          <RenderLink item={returItem} pathname={pathname} isOpen={isOpen} />

          {/* 6. Rekonsiliasi */}
          {role !== "sitearea" && (
            <div className="space-y-1">
              <div
                onClick={() =>
                  isOpen ? setRekonMenuOpen(!rekonMenuOpen) : setIsOpen(true)
                }
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
              ${pathname.includes("/rekon") ? "bg-amber-50 text-amber-600 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Calculator size={20} />
                  </div>
                  {isOpen && (
                    <span className="text-sm whitespace-nowrap">
                      Rekonsiliasi
                    </span>
                  )}
                </div>
                {isOpen && (
                  <span
                    className={`transition-transform duration-200 ${rekonMenuOpen ? "rotate-90" : ""}`}
                  >
                    <ChevronRight size={16} />
                  </span>
                )}
              </div>

              <div className={`grid transition-all duration-300 ease-in-out ${isOpen && rekonMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 ml-4 border-l-2 border-slate-100">
                    {rekonSubItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
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
                </div>
              </div>
            </div>
          )}

          {/* 7. Report */}
          <RenderLink item={reportItem} pathname={pathname} isOpen={isOpen} />

          {/* 8. Master Data */}
          {role !== "sitearea" && (
            <div className="space-y-1">
              <div
                onClick={() =>
                  isOpen ? setPoMenuOpen(!poMenuOpen) : setIsOpen(true)
                }
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
              ${pathname.includes("/master-data") ? "bg-slate-50 text-amber-600 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Database size={20} />
                  </div>
                  {isOpen && (
                    <span className="text-sm whitespace-nowrap">
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

              <div className={`grid transition-all duration-300 ease-in-out ${isOpen && poMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 ml-4 border-l-2 border-slate-100">
                    {subItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
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
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* User Profile Section removed as requested */}
      </aside>
    </>
  );
}
