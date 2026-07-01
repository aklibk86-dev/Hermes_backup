import {
  Activity,
  TrendingUp,
  Users,
  Key,
  FileText,
  GitBranch,
  DollarSign,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'

const stats = [
  {
    label: 'Total Users',
    value: '1,284',
    icon: Users,
    trend: '+12%',
    trendUp: true,
  },
  {
    label: 'Active Tokens',
    value: '3,592',
    icon: Key,
    trend: '+8%',
    trendUp: true,
  },
  {
    label: 'Channels',
    value: '24',
    icon: GitBranch,
    trend: '+2',
    trendUp: true,
  },
  {
    label: "Today's Calls",
    value: '48,293',
    icon: Activity,
    trend: '+23%',
    trendUp: true,
  },
  {
    label: 'Success Rate',
    value: '99.2%',
    icon: TrendingUp,
    trend: '+0.3%',
    trendUp: true,
  },
  {
    label: 'Total Usage',
    value: '1.4B',
    icon: DollarSign,
    trend: '+5.7%',
    trendUp: true,
  },
]

const recentActivity = [
  { time: '2 min ago', user: 'alice@demo.com', model: 'gpt-4o', tokens: '1,234', status: 'success' as const },
  { time: '5 min ago', user: 'bob@demo.com', model: 'claude-3-opus', tokens: '3,892', status: 'success' as const },
  { time: '12 min ago', user: 'charlie@demo.com', model: 'gpt-4o-mini', tokens: '567', status: 'error' as const },
  { time: '24 min ago', user: 'dave@demo.com', model: 'gemini-pro', tokens: '2,101', status: 'success' as const },
  { time: '37 min ago', user: 'eve@demo.com', model: 'gpt-4o', tokens: '4,523', status: 'success' as const },
]

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.username ?? 'Guest'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your API relay today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="mt-1 flex items-center text-xs text-muted-foreground">
                  <TrendingUp
                    className={`mr-1 h-3 w-3 ${
                      stat.trendUp ? 'text-green-500' : 'text-destructive'
                    }`}
                  />
                  <span
                    className={
                      stat.trendUp ? 'text-green-500' : 'text-destructive'
                    }
                  >
                    {stat.trend}
                  </span>
                  <span className="ml-1">vs last period</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-6 py-3 text-muted-foreground">
                      {row.time}
                    </td>
                    <td className="px-6 py-3">{row.user}</td>
                    <td className="px-6 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {row.model}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {row.tokens}
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          row.status === 'success' ? 'default' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
