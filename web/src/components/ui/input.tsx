import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, size = "default", ...props }: Omit<React.ComponentProps<"input">, "size"> & { size?: "default" | "sm" }) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "w-full min-w-0 rounded-lg border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
        "data-[size=default]:h-11 data-[size=sm]:h-9",
        "placeholder:text-muted-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        "focus-visible:border-primary-light focus-visible:ring-[4px] focus-visible:ring-ring/15",
        "aria-invalid:border-destructive aria-invalid:ring-[4px] aria-invalid:ring-destructive/15",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
