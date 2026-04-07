"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BarChart3, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "현장 대시보드", href: "/statistics", icon: BarChart3 },
  { title: "현장 현황", href: "/dashboard", icon: LayoutDashboard },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="h-14 bg-background/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-foreground whitespace-nowrap">전사 현장 통합 대시보드</h1>

        {/* Nav buttons */}
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center shadow-sm">
          관
        </div>
      </div>
    </header>
  );
}
