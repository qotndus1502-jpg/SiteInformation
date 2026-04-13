"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth-context";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(username, password);
    if (result.ok) {
      setUsername("");
      setPassword("");
      setError(null);
      onOpenChange(false);
    } else {
      setError(result.error);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUsername("");
      setPassword("");
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>관리자 로그인</DialogTitle>
          <DialogDescription>
            관리자 권한이 필요한 기능을 사용하려면 로그인하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-username">아이디</Label>
            <Input
              id="login-username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">비밀번호</Label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-[12px] text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">로그인</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
