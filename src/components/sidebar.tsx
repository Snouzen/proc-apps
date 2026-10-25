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
  ShieldCheck,
  ScrollText,
  Presentation,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getMe } from "@/lib/me";
import { usePermissions } from "@/lib/permissions";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialRole?: "pusat" | "rm" | "spb_dki" | "sitearea" | "magang" | null;
  initialRegional?: string | null;
  initialSiteArea?: string | null;
}

const RenderLink = ({
  item,
  pathname,
  isOpen,
  onNavigate,
}: {
  item: any;
  pathname: string;
  isOpen: boolean;
  onNavigate?: () => void;
}) => {
  const isActive = pathname === item.path;
  return (
    <Link
      href={item.path}
      prefetch={false}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group
        ${
          isActive
            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
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
  initialSiteArea,
}: SidebarProps) {
  const pathname = usePathname();
  const [poMenuOpen, setPoMenuOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [rekonMenuOpen, setRekonMenuOpen] = useState(false);
  const [creditLimitMenuOpen, setCreditLimitMenuOpen] = useState(false);
  const [actionPlanOpen, setActionPlanOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [role, setRole] = useState<
    "pusat" | "rm" | "sitearea" | "spb_dki" | "magang" | null
  >(initialRole || null);
  const [regional, setRegional] = useState<string | null>(
    initialRegional ?? null,
  );
  const [siteArea, setSiteArea] = useState<string | null>(
    initialSiteArea ?? null,
  );

  const { isMenuAllowed } = usePermissions(role);

  const asideRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const update = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    update(mql);
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    } else {
      mql.addListener(update);
      return () => mql.removeListener(update);
    }
  }, []);

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  // Close drawer on ESC key in mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && isMobile) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile, setIsOpen]);

  // Focus management: initial focus, focus trap, and return focus on mobile
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (!isMobile) return;

    if (isOpen) {
      // 1. Initial focus: focus close button or first interactive element in drawer
      const timer = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (asideRef.current) {
          const firstFocusable = asideRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }, 50);

      // 2. Focus trap inside mobile drawer
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !asideRef.current) return;
        const focusableElements = asideRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      window.addEventListener("keydown", handleTabKey);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleTabKey);
      };
    } else if (wasOpen && !isOpen) {
      // 3. Return focus to toggle button when closed on mobile
      const toggleBtn = document.getElementById("sidebar-toggle-btn");
      if (toggleBtn) {
        toggleBtn.focus();
      }
    }
  }, [isOpen, isMobile]);

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
    if (pathname.includes("/credit-limit")) {
      setCreditLimitMenuOpen(true);
    }
    if (pathname.includes("/report")) {
      setReportMenuOpen(true);
    }
    if (pathname === "/schedule" || pathname === "/need-assign") {
      setActionPlanOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
      setRegional(initialRegional ?? null);
      setSiteArea(initialSiteArea ?? null);
      return;
    }
    (async () => {
      try {
        const data = await getMe();
        if (data?.authenticated) {
          const r =
            data.role === "rm" || data.role === "sitearea" || data.role === "magang"
              ? data.role
              : "pusat";
          setRole(r as any);
          setRegional(data?.regional || null);
          setSiteArea(data?.siteArea || null);
        } else {
          setRole(null);
          setRegional(null);
          setSiteArea(null);
        }
      } catch {
        setRole(null);
        setRegional(null);
        setSiteArea(null);
      }
    })();
  }, [initialRole, initialRegional, initialSiteArea]);

  const dashboardItem = { name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/" };
  const poItem = { name: "Purchase Order", icon: <Package size={20} />, path: "/purchase-order" };
  const checklistDocsItem = { name: "Checklist Docs", icon: <FileCheck size={20} />, path: "/checklist-docs" };
  const reportItem = { name: "Report", icon: <BarChart3 size={20} />, path: "/report" };
  const returItem = { name: "Data Retur", icon: <Undo2 size={20} />, path: "/retur" };
  const notaDinasItem = { name: "Nota Dinas", icon: <ScrollText size={20} />, path: "/tools/nota-dinas" };

  const allActionPlanSubItems = [
    { name: "Schedule", icon: <CalendarDays size={16} />, path: "/schedule", id: "action_plan_schedule" },
    {
      name: "Need To Assign",
      icon: <ClipboardList size={16} />,
      path: "/need-assign",
      id: "action_plan_need_assign",
    },
  ];
  const actionPlanSubItems = allActionPlanSubItems.filter((sub) => isMenuAllowed(sub.id));

  const allRekonSubItems = [
    { name: "Kalkulasi", icon: <Calculator size={16} />, path: "/rekon/calc", id: "rekon_calc" },
    {
      name: "Data Rekonsiliasi",
      icon: <FileText size={16} />,
      path: "/rekon/data",
      id: "rekon_data",
    },
  ];
  const rekonSubItems = allRekonSubItems.filter((sub) => isMenuAllowed(sub.id));

  const allCreditLimitSubItems = [
    {
      name: "Approval",
      icon: <ShieldCheck size={16} />,
      path: "/credit-limit/approval",
      id: "credit_limit_approval",
    },
    {
      name: "Data Credit Limit",
      icon: <FileText size={16} />,
      path: "/credit-limit/data",
      id: "credit_limit_data",
    },
  ];
  const creditLimitSubItems = allCreditLimitSubItems.filter((sub) => isMenuAllowed(sub.id));

  const allReportSubItems = [
    {
      name: "Report PO",
      icon: <FileText size={16} />,
      path: "/report",
      id: "report_po",
    },
    {
      name: "Realisasi Pemenuhan",
      icon: <Presentation size={16} />,
      path: "/report/realisasi",
      id: "report_realisasi",
    },
  ];
  const reportSubItems = allReportSubItems.filter((sub) => isMenuAllowed(sub.id));

  const allBranchSubItems = [
    {
      name: "Delivery Calendar",
      icon: <CalendarDays size={16} />,
      path: "/branch",
      id: "branch_calendar",
    },
    {
      name: "Expired Calendar",
      icon: <CalendarClock size={16} />,
      path: "/branch/expired",
      id: "branch_expired",
    },
  ];
  const branchSubItems = allBranchSubItems.filter((sub) => isMenuAllowed(sub.id));

  const allMasterDataSubItems = [
    {
      name: `Unit Produksi`,
      icon: <FileLock size={16} />,
      path: "/master-data/unit-produksi",
      id: "master_unit_produksi",
    },
    {
      name: `Produk`,
      icon: <FileCheck size={16} />,
      path: "/master-data/produk",
      id: "master_produk",
    },
    {
      name: `Ritel Modern`,
      icon: <ClipboardList size={16} />,
      path: "/master-data/ritel-modern",
      id: "master_ritel",
    },
    {
      name: `Promo`,
      icon: <TrendingDown size={16} />,
      path: "/master-data/promo",
      id: "master_promo",
    },
  ];
  const subItems = allMasterDataSubItems.filter((sub) => isMenuAllowed(sub.id));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[190] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile && isOpen ? "true" : undefined}
        aria-label={isMobile ? "Navigasi Menu" : undefined}
        aria-hidden={isMobile && !isOpen ? "true" : undefined}
        inert={isMobile && !isOpen ? true : undefined}
        className={`fixed left-0 top-0 h-screen bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 z-[200] lg:z-40 transition-all duration-300 ease-in-out flex flex-col
        ${isOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"}`}
      >
        {/* Header Logo */}
        <div className="h-20 flex items-center px-6 mb-2">
          {isOpen ? (
            <div className="flex items-center justify-between w-full">
              <Link
                href="/"
                onClick={handleNavClick}
                className="block transition-opacity hover:opacity-80"
              >
                <img
                  src="/logo-bulog.webp"
                  alt="Bulog Logo"
                  decoding="async"
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Tutup menu navigasi"
              >
                <X size={20} />
              </button>
            </div>
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
          {isMenuAllowed("dashboard") && <RenderLink item={dashboardItem} pathname={pathname} isOpen={isOpen} onNavigate={handleNavClick} />}

          {/* 2. Purchase Order */}
          {isMenuAllowed("po") && (role !== "sitearea" || !siteArea || siteArea.replace(/\s+/g, "").toUpperCase() === "SPBDKI") && (
            <RenderLink item={poItem} pathname={pathname} isOpen={isOpen} onNavigate={handleNavClick} />
          )}
          
          {/* 2.5 Checklist Docs */}
          {isMenuAllowed("checklist_docs") && <RenderLink item={checklistDocsItem} pathname={pathname} isOpen={isOpen} onNavigate={handleNavClick} />}

          {/* 3. Action Plan */}
          {actionPlanSubItems.length > 0 && (
          <div className="space-y-1">
            <div
              onClick={() =>
                isOpen ? setActionPlanOpen(!actionPlanOpen) : setIsOpen(true)
              }
              className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
            ${pathname === "/schedule" || pathname === "/need-assign" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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
                <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-slate-700">
                  {actionPlanSubItems.map((sub) => {
                    const subActive = pathname === sub.path;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.path}
                        prefetch={false}
                        onClick={handleNavClick}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all
                      ${subActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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

          {/* 4. Branch Plan */}
          {branchSubItems.length > 0 && (
          <div className="space-y-1">
            <div
              onClick={() =>
                isOpen ? setBranchMenuOpen(!branchMenuOpen) : setIsOpen(true)
              }
              className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
            ${pathname.includes("/branch") ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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
                <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-slate-700">
                  {branchSubItems.map((sub) => {
                    const subActive = pathname === sub.path;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.path}
                        prefetch={false}
                        onClick={handleNavClick}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all
                      ${subActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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
          {isMenuAllowed("retur") && <RenderLink item={returItem} pathname={pathname} isOpen={isOpen} onNavigate={handleNavClick} />}

          {/* 5.5 Nota Dinas */}
          {isMenuAllowed("nota_dinas") && <RenderLink item={notaDinasItem} pathname={pathname} isOpen={isOpen} onNavigate={handleNavClick} />}

          {/* 6. Rekonsiliasi */}
          {rekonSubItems.length > 0 && (
            <div className="space-y-1">
              <div
                onClick={() =>
                  isOpen ? setRekonMenuOpen(!rekonMenuOpen) : setIsOpen(true)
                }
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
              ${pathname.includes("/rekon") ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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
                  <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-slate-700">
                    {rekonSubItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all
                        ${subActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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

          {/* 7. Credit Limit */}
          {creditLimitSubItems.length > 0 && (
            <div className="space-y-1">
              <div
                onClick={() =>
                  isOpen ? setCreditLimitMenuOpen(!creditLimitMenuOpen) : setIsOpen(true)
                }
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
              ${pathname.includes("/credit-limit") ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  {isOpen && (
                    <span className="text-sm whitespace-nowrap">
                      Credit Limit
                    </span>
                  )}
                </div>
                {isOpen && (
                  <span
                    className={`transition-transform duration-200 ${creditLimitMenuOpen ? "rotate-90" : ""}`}
                  >
                    <ChevronRight size={16} />
                  </span>
                )}
              </div>

              <div className={`grid transition-all duration-300 ease-in-out ${isOpen && creditLimitMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-slate-700">
                    {creditLimitSubItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all
                        ${subActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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

          {/* 8. Report */}
          {reportSubItems.length > 1 ? (
            <div className="space-y-1">
              <div
                onClick={() =>
                  isOpen ? setReportMenuOpen(!reportMenuOpen) : setIsOpen(true)
                }
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
              ${pathname.includes("/report") ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <BarChart3 size={20} />
                  </div>
                  {isOpen && (
                    <span className="text-sm whitespace-nowrap">
                      Report
                    </span>
                  )}
                </div>
                {isOpen && (
                  <span
                    className={`transition-transform duration-200 ${reportMenuOpen ? "rotate-90" : ""}`}
                  >
                    <ChevronRight size={16} />
                  </span>
                )}
              </div>

              <div className={`grid transition-all duration-300 ease-in-out ${isOpen && reportMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-slate-700">
                    {reportSubItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all
                        ${subActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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
          ) : reportSubItems.length === 1 ? (
            <RenderLink
              item={{
                name: reportSubItems[0].name,
                icon: reportSubItems[0].icon,
                path: reportSubItems[0].path,
              }}
              pathname={pathname}
              isOpen={isOpen}
              onNavigate={handleNavClick}
            />
          ) : null}

          {/* 9. Master Data */}
          {subItems.length > 0 && (
            <div className="space-y-1">
              <div
                onClick={() =>
                  isOpen ? setPoMenuOpen(!poMenuOpen) : setIsOpen(true)
                }
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all
              ${pathname.includes("/master-data") ? "bg-slate-50 dark:bg-slate-700 text-amber-600 font-bold" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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
                  <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-slate-700">
                    {subItems.map((sub) => {
                      const subActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          prefetch={false}
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all
                        ${subActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
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
