import { Globe2 } from "lucide-react"
import { SiFacebook, SiTiktok, SiTwitch, SiYoutube } from "react-icons/si"

interface PlatformIconProps {
  type: string
}

export function PlatformIcon({ type }: PlatformIconProps) {
  if (type === "youtube") {
    return <SiYoutube className="h-4 w-4" color="#ff0033" />
  }
  if (type === "twitch") {
    return <SiTwitch className="h-4 w-4" color="#8b5cf6" />
  }
  if (type === "facebook") {
    return <SiFacebook className="h-4 w-4" color="#1877f2" />
  }
  if (type === "tiktok") {
    return <SiTiktok className="h-4 w-4" color="#111111" />
  }
  return <Globe2 className="h-4 w-4 text-muted-foreground" />
}
