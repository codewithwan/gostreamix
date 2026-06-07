import { cn } from "@/lib/utils"

export const APP_ICON_SRC = "/main/assets/img/app_icon.png"

interface AppIconProps {
  className?: string
}

export function AppIcon({ className }: AppIconProps) {
  return <img src={APP_ICON_SRC} alt="GoStreamix logo" className={cn("shrink-0 rounded-sm object-contain", className)} />
}

interface BrandMarkProps {
  className?: string
  iconClassName?: string
  textClassName?: string
  showTagline?: boolean
  tagline?: string
}

export function BrandMark({ className, iconClassName = "h-7 w-7", textClassName, showTagline = false, tagline }: BrandMarkProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <AppIcon className={iconClassName} />
      <div className="min-w-0">
        <p className={cn("truncate font-display font-semibold tracking-tight", textClassName)}>GoStreamix</p>
        {showTagline ? <p className="truncate text-xs text-muted-foreground">{tagline}</p> : null}
      </div>
    </div>
  )
}
