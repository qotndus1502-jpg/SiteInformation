"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton({ variant = "default" }: { variant?: "default" | "ghost" }) {
  const router = useRouter();

  async function onClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant={variant} size="sm" onClick={onClick} className="gap-1 text-[12px] h-7 px-2">
      <LogOut className="h-3 w-3" />
      로그아웃
    </Button>
  );
}
