import { useState, useEffect, useCallback } from "react"
import { Save, RefreshCw, Server, Settings2, AlertCircle } from "lucide-react"
import { api } from "../../../lib/api"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

interface SystemStatus {
  version: string
  start_time: string
  [key: string]: unknown
}

interface OptionItem {
  key: string
  value: string
  description?: string
  group?: string
}

interface OptionGroup {
  name: string
  label: string
  options: OptionItem[]
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
      second: "2-digit",
    })
  } catch {
    return iso
  }
}

/** Compute uptime from start_time. */
function computeUptime(startTime: string): string {
  try {
    const diff = Date.now() - new Date(startTime).getTime()
    if (diff <= 0) return "just now"
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    parts.push(`${mins}m`)
    return parts.join(" ")
  } catch {
    return "—"
  }
}

/** Guess a human-readable label from an option key. */
function keyToLabel(key: string): string {
  return key
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Default tab groups when options lack a `group` field. */
function inferGroups(options: OptionItem[]): OptionGroup[] {
  const groups: Record<string, OptionItem[]> = {}
  for (const opt of options) {
    const group = opt.group || "general"
    if (!groups[group]) groups[group] = []
    groups[group].push(opt)
  }
  return Object.entries(groups).map(([name, opts]) => ({
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    options: opts,
  }))
}

/* ──────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────── */

function SystemInfoCard({ status }: { status: SystemStatus | null }) {
  if (!status) return null

  const rows: [string, string][] = [
    ["Version", status.version || "—"],
    ["Start Time", status.start_time ? formatDate(status.start_time) : "—"],
    ["Uptime", status.start_time ? computeUptime(status.start_time) : "—"],
  ]

  // Extra fields the API might return
  for (const [key, val] of Object.entries(status)) {
    if (key === "version" || key === "start_time") continue
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      rows.push([keyToLabel(key), String(val)])
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Server className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <CardTitle className="text-lg">System Information</CardTitle>
          <CardDescription>Server version and status details</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col sm:flex-row sm:items-center py-3 gap-1 sm:gap-4"
            >
              <span className="text-sm text-muted-foreground sm:w-40 shrink-0">
                {label}
              </span>
              <span className="text-sm font-mono font-medium break-all">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function OptionsTab({
  group,
  values,
  onChange,
  saving,
}: {
  group: OptionGroup
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  saving: boolean
}) {
  return (
    <div className="space-y-5">
      {group.options.map((opt) => (
        <div key={opt.key} className="space-y-1.5">
          <Label htmlFor={`opt-${opt.key}`}>
            {opt.description || keyToLabel(opt.key)}
          </Label>
          {opt.description && opt.description !== keyToLabel(opt.key) && (
            <p className="text-xs text-muted-foreground">{opt.key}</p>
          )}
          <Input
            id={`opt-${opt.key}`}
            value={values[opt.key] ?? ""}
            onChange={(e) => onChange(opt.key, e.target.value)}
            disabled={saving}
            className="max-w-lg"
          />
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */

export default function AdminSettingsPage() {
  /* ── State ───────────────────────────────────────────────── */
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [options, setOptions] = useState<OptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [values, setValues] = useState<Record<string, string>>({})
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const [activeTab, setActiveTab] = useState<string>("general")

  /* ── Groups (derived) ────────────────────────────────────── */
  const groups = inferGroups(options)
  const activeGroup = groups.find((g) => g.name === activeTab) || groups[0]

  /* Sync active tab when groups change */
  useEffect(() => {
    if (groups.length > 0 && !groups.find((g) => g.name === activeTab)) {
      setActiveTab(groups[0].name)
    }
  }, [groups, activeTab])

  /* ── Fetch status ────────────────────────────────────────── */
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await api.get<SystemStatus>("/api/status")
      setStatus(res)
    } catch (err) {
      console.error("Failed to fetch system status:", err)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  /* ── Fetch options ───────────────────────────────────────── */
  const fetchOptions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<OptionItem[]>("/api/option/")
      const items = Array.isArray(res) ? res : []
      setOptions(items)
      // Seed values
      const seed: Record<string, string> = {}
      for (const item of items) {
        seed[item.key] = item.value
      }
      setValues(seed)
      setDirtyKeys(new Set())
    } catch (err) {
      console.error("Failed to fetch options:", err)
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchOptions()
  }, [fetchStatus, fetchOptions])

  /* ── Value change ────────────────────────────────────────── */
  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setDirtyKeys((prev) => new Set(prev).add(key))
    setSaveMessage(null)
  }

  /* ── Save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (dirtyKeys.size === 0) return
    setSaving(true)
    setSaveMessage(null)

    try {
      // Save each dirty option individually
      const keys = Array.from(dirtyKeys)
      for (const key of keys) {
        await api.put("/api/option/", { key, value: values[key] })
      }
      setDirtyKeys(new Set())
      setSaveMessage({ type: "success", text: "Settings saved successfully." })
      // Refresh to get any server-side transformed values
      await fetchOptions()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save settings"
      setSaveMessage({ type: "error", text: msg })
    } finally {
      setSaving(false)
    }
  }

  /* ── Determine which tabs have unsaved changes ───────────── */
  const tabHasDirty = (group: OptionGroup): boolean =>
    group.options.some((opt) => dirtyKeys.has(opt.key))

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            System status and configuration options
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStatus()
              fetchOptions()
            }}
            disabled={loading || statusLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading || statusLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status */}
      {statusLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading system status...
          </CardContent>
        </Card>
      ) : (
        <SystemInfoCard status={status} />
      )}

      {/* Options */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Settings2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>View and update system options</CardDescription>
          </div>
          {dirtyKeys.size > 0 && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes ({dirtyKeys.size})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              Loading configuration...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchOptions}>
                Retry
              </Button>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No configuration options available.
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex flex-wrap gap-1 border-b pb-3 mb-6 overflow-x-auto">
                {groups.map((group) => {
                  const isActive = activeTab === group.name
                  const hasDirty = tabHasDirty(group)
                  return (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => setActiveTab(group.name)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-b-2 border-primary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      {group.label}
                      {hasDirty && (
                        <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Active tab content */}
              {activeGroup && (
                <>
                  <OptionsTab
                    group={activeGroup}
                    values={values}
                    onChange={handleValueChange}
                    saving={saving}
                  />

                  {/* Inline save button for mobile */}
                  {dirtyKeys.size > 0 && (
                    <div className="mt-6 sm:hidden">
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes ({dirtyKeys.size})
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Save message */}
              {saveMessage && (
                <div
                  className={`mt-4 rounded-md px-4 py-3 text-sm ${
                    saveMessage.type === "success"
                      ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
