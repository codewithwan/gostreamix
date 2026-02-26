import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary/15 text-primary",
      muted: "bg-muted text-muted-foreground",
      success: "bg-emerald-500/15 text-emerald-500",
      warning: "bg-amber-500/15 text-amber-500",
      danger: "bg-danger/15 text-danger",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
