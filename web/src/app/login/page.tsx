"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/statistics";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    // Let server decide where to go — middleware bounces unapproved users.
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          autoComplete="email"
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">비밀번호</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? "로그인 중..." : "로그인"}
      </Button>
      <div className="text-center text-[12px] text-muted-foreground pt-2">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          가입 신청
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-44px)] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px] bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">로그인</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            전사 현장 통합 대시보드에 접근하려면 로그인하세요.
          </p>
        </div>
        <Suspense fallback={<div className="text-sm text-muted-foreground">로딩 중...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
