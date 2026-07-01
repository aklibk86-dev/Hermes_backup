import { Outlet, Link, useLocation } from "@tanstack/react-router"
import { useAuthStore } from "../../stores/auth"
import { useThemeStore } from "../../stores/theme"
import { Button } from "../ui/button"
import { Moon, Sun, LogOut, Menu, X, LayoutDashboard, Key, MessageSquare, Wallet, History, Users, Settings, Image, Music, BarChart3 } from "lucide-react"
import { useState } from "react"
import { cn } from "../../lib/utils"

const navItems = [
  { to: "/dashboard", label: "概览", icon: LayoutDashboard, roles: ["user", "admin"] },
  { to: "/tokens", label: "Token 管理", icon: Key, roles: ["user", "admin"] },
  { to: "/playground", label: "Playground", icon: MessageSquare, roles: ["user", "admin"] },
  { to: "/wallet", label: "钱包充值", icon: Wallet, roles: ["user", "admin"] },
  { to: "/logs", label: "用量日志", icon: History, roles: ["user", "admin"] },
  { to: "/midjourney", label: "Midjourney", icon: Image, roles: ["user", "admin"] },
  { to: "/suno", label: "Suno 音乐", icon: Music, roles: ["user", "admin"] },
  { to: "/admin/users", label: "用户管理", icon: Users, roles: ["admin"] },
  { to: "/admin/channels", label: "渠道管理", icon: Settings, roles: ["admin"] },
  { to: "/admin/models", label: "模型管理", icon: BarChart3, roles: ["admin"] },
  { to: "/admin/settings", label: "系统设置", icon: Settings, roles: ["admin"] },
]

export default function AppLayout() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated) return <Outlet />

  const isAdmin = user?.role === "admin"

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-sidebar-foreground text-lg">
              <BarChart3 className="h-5 w-5" />
              New API
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.filter(i => i.roles.includes(isAdmin ? "admin" : "user")).map((item) => (
              <Link
                key={item.to}
                to={item.to as any}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  location.pathname.startsWith(item.to)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-sidebar-foreground/70 truncate">
                {user?.username}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={toggle}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background flex items-center px-4 gap-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">New API</span>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="icon" onClick={toggle}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
