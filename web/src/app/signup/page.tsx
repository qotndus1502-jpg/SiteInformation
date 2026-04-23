"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CORPORATIONS = [
  { id: 1, name: "남광토건" },
  { id: 2, name: "극동건설" },
  { id: 3, name: "금광기업" },
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [corporationId, setCorporationId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!fullName.trim() || !employeeNumber.trim() || !corporationId || !phone.trim()) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          employee_number: employeeNumber.trim(),
          corporation_id: corporationId,
          phone: phone.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message || "가입 중 오류가 발생했습니다.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-[calc(100vh-44px)] flex items-center justify-center px-4">
        <div className="w-full max-w-[420px] bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4 text-center">
          <h1 className="text-[18px] font-semibold text-foreground">가입 신청 완료</h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            관리자 승인 후 이용하실 수 있습니다.<br />
            승인까지 시간이 걸릴 수 있습니다.
          </p>
          <Button onClick={() => router.replace("/login")}>로그인 페이지로</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-44px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px] bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">가입 신청</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            관리자 승인 후 이용하실 수 있습니다.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">비밀번호 <span className="text-muted-foreground font-normal">(8자 이상)</span></Label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-confirm">비밀번호 확인</Label>
            <PasswordInput id="password-confirm" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} autoComplete="new-password" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">이름</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-number">사번</Label>
            <Input id="employee-number" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="corporation">소속 법인</Label>
            <Select value={corporationId} onValueChange={setCorporationId}>
              <SelectTrigger id="corporation">
                <SelectValue placeholder="법인을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {CORPORATIONS.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">전화번호</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" autoComplete="tel" required />
          </div>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "신청 중..." : "가입 신청"}
          </Button>
          <div className="text-center text-[12px] text-muted-foreground pt-1">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
