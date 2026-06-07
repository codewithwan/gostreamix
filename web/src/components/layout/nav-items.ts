import { History, LayoutDashboard, Layers, PlaySquare, Settings, Video } from "lucide-react"

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/streams", label: "Streams", icon: PlaySquare },
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/platforms", label: "Platforms", icon: Layers },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
]
