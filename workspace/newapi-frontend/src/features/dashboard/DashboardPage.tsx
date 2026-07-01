import { useEffect, useState } from "react"
import { useAuthStore } from "../../stores/auth"
import { api } from "../../lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import {
  Users,
  Activity,
  BarChart3,
  Server,
  Zap,
  CalendarDays,
  TrendingUp,
  Globe,
} from "lucide-react"

interface UserListResponse {
  total: number
  data: Array<Record<string, unknown>>
}

interface LogStatResponse {
  data: {
    today_quota?: number
    today_requests?: number
    total_quota?: number
    total_requests?: number
    [key: string]: unknown
  }
}

interface StatusResponse {
  data: {
    version?: string
    start_time?: string
    uptime?: number
    [key: string]: unknown
  }
}

interface SelfStatResponse {
  data: {
    today_quota?: number
    today_requests?: number
    total_quota?: number
    total_requests?: number
    [key: string]: unknown
  }
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [logStat, setLogStat] = useState<LogStatResponse["data"] | null>(null)
  const [selfStat, setSelfStat] = useState<SelfStatResponse["data"] | null>(null)
  const [status, setStatus] = useState<StatusResponse["data"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, logRes, selfRes, statusRes] = await Promise.allSettled([
          api.get<UserListResponse>("/api/user/"),
          api.get<LogStatResponse>("/api/log/stat"),
          api.get<SelfStatResponse>("/api/log/self/stat"),
          api.get<StatusResponse>("/api/status"),
        ])

        if (usersRes.status === "fulfilled") {
          setTotalUsers(usersRes.value.total)
        }
        if (logRes.status === "fulfilled") {
          setLogStat(logRes.value.data)
        }
        if (selfRes.status === "fulfilled") {
          setSelfStat(selfRes.value.data)
        }
        if (statusRes.status === "fulfilled") {
          setStatus(statusRes.value.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatNumber = (n: number | null | undefined): string => {
    if (n == null) return "—"
    return n.toLocaleString()
  }

  const formatDuration = (seconds: number | undefined): string => {
    if (seconds == null) return "—"
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const parts: string[] = []
    if (d > 0) parts.push(`${d}d`)
    if (h > 0) parts.push(`${h}h`)
    parts.push(`${m}m`)
    return parts.join(" ")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-2">
              <Activity className="h-10 w-10 mx-auto" />
            </div>
            <p className="text-destructive font-medium">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{user?.username ? `, ${user.username}` : ""} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your platform today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalUsers)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(logStat?.total_requests)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time API calls
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Usage
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(logStat?.today_requests)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requests today
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
            <Server className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.version ? `v${status.version}` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {status?.start_time
                ? `Started ${new Date(status.start_time).toLocaleDateString()}`
                : "System info"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Overview */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-4">
          Your Quick Stats
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Today&apos;s Requests
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(selfStat?.today_requests)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                API calls used today
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Total Requests
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(selfStat?.total_requests)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time API calls
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Quota
              </CardTitle>
              <Zap className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user?.quota != null
                  ? `${formatNumber(user.quota)}`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Remaining quota
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today&apos;s Quota Used
              </CardTitle>
              <Globe className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(logStat?.today_quota)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total quota consumed today
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quota
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(logStat?.total_quota)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time quota consumed
              </p>
            </CardContent>
          </Card>

          {status?.uptime != null && (
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Server Uptime
                </CardTitle>
                <Server className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(status.uptime)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Since last restart
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
