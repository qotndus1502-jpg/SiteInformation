import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border-transparent font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none gap-1 focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // Semantic status variants
        brand:
          "bg-info-muted text-info-muted-foreground",
        gray:
          "bg-muted text-muted-foreground",
        error:
          "bg-destructive-muted text-destructive-muted-foreground",
        warning:
          "bg-warning-muted text-warning-muted-foreground",
        success:
          "bg-success-muted text-success-muted-foreground",
        blue:
          "bg-info-muted text-info-muted-foreground",
        sky:
          "bg-info-muted text-info-muted-foreground",
        slate:
          "bg-muted text-muted-foreground",
        orange:
          "bg-orange-muted text-orange-muted-foreground",
        // Backward-compatible aliases
        default:
          "bg-info-muted text-info-muted-foreground",
        secondary:
          "bg-muted text-muted-foreground",
        destructive:
          "bg-destructive-muted text-destructive-muted-foreground",
        outline:
          "border border-border bg-transparent text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[13px] [&>svg]:size-3",
        md: "px-2.5 py-0.5 text-sm [&>svg]:size-3.5",
        lg: "px-3 py-1 text-sm [&>svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "sm",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
