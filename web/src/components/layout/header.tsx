"use client";

import { useState } from "react";
import { Bell, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { LoginDialog } from "@/components/auth/login-dialog";

export function Header() {
  const { isAdmin, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <header className="h-11 bg-background backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sticky top-0 z-30 transition-colors shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-[15px] font-semibold text-foreground whitespace-nowrap tracking-tight">전사 현장 통합 대시보드</h1>
        <span className="text-[12px] text-muted-foreground truncate hidden md:inline">
          현재 데모 버전 운영 중입니다. 일부 데이터 누락 및 오류가 있으니 업무 시 참고 부탁드립니다.
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {isAdmin ? (
          <>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
              <ShieldCheck className="h-3 w-3" />
              관리자
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground hover:bg-card/60 gap-1 text-[12px] h-7 px-2"
            >
              <LogOut className="h-3 w-3" />
              로그아웃
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLoginOpen(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-card/60 gap-1 text-[12px] h-7 px-2"
          >
            <LogIn className="h-3 w-3" />
            로그인
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-card/60 h-7 w-7">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-7 w-7 rounded-full bg-blue-500 text-white text-[11px] font-semibold flex items-center justify-center shadow-sm ring-2 ring-border/60">
          {isAdmin ? "관" : "게"}
        </div>
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}
