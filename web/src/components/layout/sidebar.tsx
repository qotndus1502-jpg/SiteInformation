"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, Building2, Users, ClipboardList, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const menuItems = [
  { title: "현장 대시보드", href: "/dashboard", icon: LayoutDashboard },
  { title: "회사별 현황", href: "/company", icon: Building2 },
  { title: "인력 관리", href: "/employees", icon: Users },
  { title: "보고서", href: "/reports", icon: ClipboardList },
];

export function Sidebar({ isOpen, onOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* 오버레이 (모바일 + 데스크탑 열림 시) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* 힌트 바 — 사이드바 닫혀있을 때만 보임 */}
      {!isOpen && (
        <div
          className="fixed top-0 left-0 z-30 h-full w-3 hidden lg:flex items-center group cursor-pointer"
          onMouseEnter={onOpen}
        >
          {/* 세로 바 */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-border/40 group-hover:bg-primary/30 transition-colors" />
          {/* 화살표 힌트 */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronsRight className="h-4 w-4 text-primary/60" />
          </div>
        </div>
      )}

      {/* 사이드바 본체 */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-out flex flex-col shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onMouseLeave={onClose}
      >
        <div className="px-4 pt-5 pb-4 flex items-center justify-between border-b border-sidebar-border">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-sidebar-accent-foreground">현장정보</span>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="사이드바 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 pt-4 pb-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground/80 font-medium"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )}
                />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border text-sm text-sidebar-foreground/60 space-y-1">
          <p className="font-semibold text-sidebar-accent-foreground/80">건설현장 대시보드</p>
          <p className="text-xs">v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
