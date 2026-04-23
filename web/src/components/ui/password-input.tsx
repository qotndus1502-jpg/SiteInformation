"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

function PasswordInput({ className, size = "default", ...props }: Omit<React.ComponentProps<"input">, "type" | "size"> & { size?: "default" | "sm" }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        data-slot="input"
        data-size={size}
        className={cn(
          "w-full min-w-0 rounded-lg border border-input bg-card px-3.5 py-2.5 pr-10 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
          "data-[size=default]:h-11 data-[size=sm]:h-9",
          "placeholder:text-muted-foreground",
          "selection:bg-primary selection:text-primary-foreground",
          "focus-visible:border-primary-light focus-visible:ring-[4px] focus-visible:ring-ring/15",
          "aria-invalid:border-destructive aria-invalid:ring-[4px] aria-invalid:ring-destructive/15",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export { PasswordInput };
