"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-14 bg-background backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sticky top-0 z-30 transition-colors shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-lg font-bold text-foreground whitespace-nowrap tracking-tight">전사 현장 통합 대시보드</h1>
        <span className="text-[18px] text-muted-foreground truncate hidden md:inline">
          현재 데모 버전 운영 중입니다. 시스템 환경에 따라 데이터 누락 및 오류가 발생할 수 있으니 업무 시 참고 부탁드립니다.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-card/60">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-blue-500 text-white text-sm font-semibold flex items-center justify-center shadow-sm ring-2 ring-border/60">
          관
        </div>
      </div>
    </header>
  );
}
