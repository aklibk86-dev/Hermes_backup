import { useEffect } from "react"
import { RouterProvider, createRouter, createRoute, createRootRoute, redirect } from "@tanstack/react-router"
import { useAuthStore } from "./stores/auth"
import { useThemeStore } from "./stores/theme"
import AppLayout from "./components/layout/AppLayout"
import LoginPage from "./features/auth/LoginPage"
import DashboardPage from "./features/dashboard/DashboardPage"
import TokensPage from "./features/tokens/TokensPage"
import PlaygroundPage from "./features/playground/PlaygroundPage"
import WalletPage from "./features/wallet/WalletPage"
import LogsPage from "./features/logs/LogsPage"
import MidjourneyPage from "./features/midjourney/MidjourneyPage"
import SunoPage from "./features/suno/SunoPage"
import AdminUsersPage from "./features/admin/users/AdminUsersPage"
import AdminChannelsPage from "./features/admin/channels/AdminChannelsPage"
import AdminModelsPage from "./features/admin/models/AdminModelsPage"
import AdminSettingsPage from "./features/admin/settings/AdminSettingsPage"

const rootRoute = createRootRoute({
  component: () => {
    const { theme } = useThemeStore()
    const { checkAuth } = useAuthStore()
    useEffect(() => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      checkAuth()
    }, [theme])
    return <AppLayout />
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" })
  },
})

const tokensRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tokens",
  component: TokensPage,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" })
  },
})

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playground",
  component: PlaygroundPage,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" })
  },
})

const walletRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallet",
  component: WalletPage,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" })
  },
})

const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs",
  component: LogsPage,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" })
  },
})

const midjourneyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/midjourney",
  component: MidjourneyPage,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" })
  },
})

const sunoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/suno",
  component: SunoPage,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" })
  },
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  component: AdminUsersPage,
  beforeLoad: () => {
    const state = useAuthStore.getState()
    if (!state.isAuthenticated) throw redirect({ to: "/login" })
    if (state.user?.role !== "admin") throw redirect({ to: "/dashboard" })
  },
})

const adminChannelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/channels",
  component: AdminChannelsPage,
  beforeLoad: () => {
    const state = useAuthStore.getState()
    if (!state.isAuthenticated) throw redirect({ to: "/login" })
    if (state.user?.role !== "admin") throw redirect({ to: "/dashboard" })
  },
})

const adminModelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/models",
  component: AdminModelsPage,
  beforeLoad: () => {
    const state = useAuthStore.getState()
    if (!state.isAuthenticated) throw redirect({ to: "/login" })
    if (state.user?.role !== "admin") throw redirect({ to: "/dashboard" })
  },
})

const adminSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/settings",
  component: AdminSettingsPage,
  beforeLoad: () => {
    const state = useAuthStore.getState()
    if (!state.isAuthenticated) throw redirect({ to: "/login" })
    if (state.user?.role !== "admin") throw redirect({ to: "/dashboard" })
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" })
  },
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  tokensRoute,
  playgroundRoute,
  walletRoute,
  logsRoute,
  midjourneyRoute,
  sunoRoute,
  adminUsersRoute,
  adminChannelsRoute,
  adminModelsRoute,
  adminSettingsRoute,
  indexRoute,
])

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

export default function AppRouter() {
  return <RouterProvider router={router} />
}
