import { useState, useEffect, useCallback } from "react"
import { Loader2, Gift, History, ArrowUpRight, Ticket } from "lucide-react"
import { api } from "../../lib/api"
import { useAuthStore } from "../../stores/auth"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card"

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
interface TopupRecord {
  id: number
  key: string
  amount: number
  status: string
  created_at: string
}

interface TopupHistoryResponse {
  data: TopupRecord[]
  total: number
  page: number
  pageSize: number
}

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function statusLabel(status: string): { text: string; className: string } {
  switch (status) {
    case "success":
    case "completed":
      return {
        text: "Success",
        className:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      }
    case "pending":
      return {
        text: "Pending",
        className:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      }
    case "failed":
      return {
        text: "Failed",
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      }
    default:
      return {
        text: status,
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      }
  }
}

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */
export default function WalletPage() {
  const { user, checkAuth } = useAuthStore()

  /* redemption */
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /* history */
  const [history, setHistory] = useState<TopupRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  /* fetch history */
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get<TopupHistoryResponse>("/api/user/topup/self")
      setHistory(res.data || [])
    } catch (err) {
      console.error("Failed to fetch top-up history:", err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  /* submit redemption code */
  const handleRedeem = async () => {
    const trimmed = code.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await api.post<{ data?: { amount?: number } }>("/api/user/topup", {
        key: trimmed,
      })
      setSuccess("Redemption successful! Your balance has been updated.")
      setCode("")
      /* refresh auth to get updated quota */
      await checkAuth()
      await fetchHistory()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to redeem code."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const balance = user?.quota ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Manage your balance and redeem top-up codes
        </p>
      </div>

      {/* Balance Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Your Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight sm:text-5xl">
              {balance.toLocaleString()}
            </span>
            <span className="text-lg text-muted-foreground">quota</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Available quota for API requests
          </p>
        </CardContent>
      </Card>

      {/* Redemption Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle>Redeem Code</CardTitle>
          </div>
          <CardDescription>
            Enter a redemption code to top up your balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter redemption code..."
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError(null)
                    setSuccess(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRedeem()
                  }}
                  className="pl-10"
                  disabled={submitting}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              {success && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {success}
                </p>
              )}
            </div>
            <Button
              onClick={handleRedeem}
              disabled={submitting || !code.trim()}
              className="shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redeeming...
                </>
              ) : (
                <>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Redeem
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">
            Redemption History
          </h2>
        </div>

        {historyLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading history...
            </CardContent>
          </Card>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No redemption history yet. Enter a code above to get started.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <Th>Code</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                        <Th>Date</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => {
                        const status = statusLabel(record.status)
                        return (
                          <tr
                            key={record.id}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <Td className="font-mono text-xs">
                              {record.key}
                            </Td>
                            <Td className="font-medium">
                              +{record.amount.toLocaleString()}
                            </Td>
                            <Td>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                              >
                                {status.text}
                              </span>
                            </Td>
                            <Td className="text-muted-foreground">
                              {formatDate(record.created_at)}
                            </Td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {history.map((record) => {
                const status = statusLabel(record.status)
                return (
                  <Card key={record.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono text-muted-foreground">
                          {record.key}
                        </code>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          +{record.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          quota
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(record.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Table helpers
   ────────────────────────────────────────────────────────────── */
function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  )
}

function Td({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <td className={`px-4 py-3 text-sm ${className ?? ""}`}>
      {children}
    </td>
  )
}
