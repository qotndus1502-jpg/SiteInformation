"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * 간단한 클라이언트 측 인증 컨텍스트.
 *
 * ⚠️ 현재는 데모용 — 아이디/비번이 클라이언트에 하드코딩되어 있다.
 *    UI 게이팅만 담당하며 실제 보안 경계는 아님.
 *    민감한 mutation 엔드포인트는 추후 백엔드에서 토큰 검증 추가 필요.
 */

const STORAGE_KEY = "site-info-admin";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

interface AuthContextValue {
  isAdmin: boolean;
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  /* 초기 로드 시 localStorage 에서 복원 */
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setIsAdmin(true);
    } catch {
      /* SSR 또는 private mode */
    }
  }, []);

  const login = useCallback((username: string, password: string) => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      setIsAdmin(true);
      return { ok: true as const };
    }
    return { ok: false as const, error: "아이디 또는 비밀번호가 올바르지 않습니다" };
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
