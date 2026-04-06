"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "대시보드", href: "/statistics", icon: BarChart3 },
  { title: "현황", href: "/dashboard", icon: LayoutDashboard },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around lg:hidden z-30">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center gap-1 px-5 py-2 cursor-pointer transition-all duration-200 rounded-xl",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
            <span className={cn("text-[0.65rem] leading-tight", isActive ? "font-bold" : "font-medium")}>
              {item.title}
            </span>
            {isActive && (
              <div className="absolute bottom-1.5 w-5 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
