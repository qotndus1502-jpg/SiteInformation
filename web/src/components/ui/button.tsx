import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg cursor-pointer font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary border border-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:border-primary/90",
        secondary:
          "bg-accent border border-accent text-primary shadow-xs hover:bg-accent/80 hover:border-accent/80",
        outline:
          "bg-card border border-border text-foreground shadow-xs hover:bg-muted hover:text-foreground",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-destructive border border-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:border-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
      },
      size: {
        sm: "h-9 px-3.5 py-2 text-sm has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-4",
        default: "h-10 px-4 py-2.5 text-sm has-[>svg]:px-3.5",
        lg: "h-11 px-4.5 py-2.5 text-base has-[>svg]:px-4 [&_svg:not([class*='size-'])]:size-5",
        xl: "h-12 px-5 py-3 text-base has-[>svg]:px-4.5 [&_svg:not([class*='size-'])]:size-5",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
