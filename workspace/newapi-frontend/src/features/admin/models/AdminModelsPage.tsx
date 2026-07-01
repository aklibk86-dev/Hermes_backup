import { useState, useEffect, useCallback } from "react"
import { Search, Check, X } from "lucide-react"
import { api, type Model, type ApiListResponse } from "../../../lib/api"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent } from "../../../components/ui/card"

/* ──────────────────────────────────────────────────────────────
   Type badge colors
   ────────────────────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, string> = {
  chat: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  image: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  embedding: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  audio: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completion: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  moderation: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  rerank: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  tts: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  stt: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

function typeBadgeClass(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? "bg-muted text-muted-foreground"
}

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function formatPrice(p: number): string {
  return p.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

function formatRatio(r: number): string {
  return r.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 })
}

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */
export default function AdminModelsPage() {
  /* data state */
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)

  /* pagination */
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  /* toggling enabled */
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  /* total pages */
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  /* fetch data */
  const fetchModels = useCallback(async () => {
    try {
      const res = await api.get<ApiListResponse<Model>>(`/api/models/?page=${page}&pageSize=${pageSize}`)
      setModels(res.data || [])
      setTotal(res.total ?? 0)
    } catch (err) {
      console.error("Failed to fetch models:", err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  /* search */
  useEffect(() => {
    if (!search.trim()) {
      setSearching(false)
      setPage(1)
      setLoading(true)
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get<ApiListResponse<Model>>(`/api/models/search?keyword=${encodeURIComponent(search)}`)
        setModels(res.data || [])
        setTotal(res.total ?? 0)
      } catch (err) {
        console.error("Failed to search models:", err)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  /* ── toggle enabled ────────────────────────────────────────── */
  const toggleEnabled = async (model: Model) => {
    setTogglingIds((prev) => new Set(prev).add(model.id))
    try {
      await api.put("/api/models/", {
        id: model.id,
        enabled: !model.enabled,
      })
      setModels((prev) =>
        prev.map((m) => (m.id === model.id ? { ...m, enabled: !m.enabled } : m))
      )
    } catch (err) {
      console.error("Failed to toggle model enabled:", err)
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(model.id)
        return next
      })
    }
  }

  /* ── pagination ────────────────────────────────────────────── */
  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
    setLoading(true)
  }

  /* ── render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Models</h1>
          <p className="text-sm text-muted-foreground">
            Manage AI models and their pricing
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search models by name or model ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!e.target.value.trim()) {
              setPage(1)
              setLoading(true)
            }
          }}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {loading || searching ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {searching ? "Searching models..." : "Loading models..."}
          </CardContent>
        </Card>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {search ? "No models match your search." : "No models yet."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ═══ Desktop table ═══ */}
          <div className="hidden sm:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <Th>ID</Th>
                      <Th>Model</Th>
                      <Th>Name</Th>
                      <Th>Type</Th>
                      <Th>Price</Th>
                      <Th>Ratio</Th>
                      <Th>Enabled</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <Td className="text-muted-foreground font-mono text-xs">
                          {m.id}
                        </Td>
                        <Td className="font-mono text-xs font-medium">{m.model}</Td>
                        <Td className="font-medium">{m.name}</Td>
                        <Td>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(m.type)}`}
                          >
                            {m.type}
                          </span>
                        </Td>
                        <Td className="font-mono text-xs tabular-nums">
                          {formatPrice(m.price)}
                        </Td>
                        <Td className="font-mono text-xs tabular-nums">
                          {formatRatio(m.ratio)}
                        </Td>
                        <Td>
                          <button
                            type="button"
                            disabled={togglingIds.has(m.id)}
                            onClick={() => toggleEnabled(m)}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${
                              m.enabled
                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                            } disabled:opacity-50 cursor-pointer hover:opacity-80`}
                            title={m.enabled ? "Click to disable" : "Click to enable"}
                          >
                            {togglingIds.has(m.id) ? (
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                            ) : m.enabled ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            {m.enabled ? "Enabled" : "Disabled"}
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            {!search && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* ═══ Mobile cards ═══ */}
          <div className="sm:hidden space-y-3">
            {models.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Top row: name + enabled toggle */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{m.model}</p>
                    </div>
                    <button
                      type="button"
                      disabled={togglingIds.has(m.id)}
                      onClick={() => toggleEnabled(m)}
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${
                        m.enabled
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                          : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                      } disabled:opacity-50 cursor-pointer`}
                    >
                      {togglingIds.has(m.id) ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                      ) : m.enabled ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {m.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  {/* Type badge */}
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(m.type)}`}
                    >
                      {m.type}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Price:</span>{" "}
                      <span className="font-mono tabular-nums">{formatPrice(m.price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ratio:</span>{" "}
                      <span className="font-mono tabular-nums">{formatRatio(m.ratio)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Mobile pagination */}
            {!search && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Table helpers
   ────────────────────────────────────────────────────────────── */
function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>
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
