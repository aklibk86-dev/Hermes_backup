import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Edit, Trash2, TestTube, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { api, type Channel, type ApiListResponse } from "../../lib/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../../components/ui/dialog"

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
interface ChannelFormData {
  name: string
  type: number
  models: string[]
  balance: number
  status: boolean
}

const emptyForm = (): ChannelFormData => ({
  name: "",
  type: 1,
  models: [],
  balance: 0,
  status: true,
})

/** Known channel type names – extend as needed */
const CHANNEL_TYPES: Record<number, string> = {
  1: "OpenAI",
  2: "Anthropic",
  3: "Azure",
  4: "Google",
  5: "DeepSeek",
  6: "Custom",
}

function channelTypeName(type: number): string {
  return CHANNEL_TYPES[type] ?? `Type ${type}`
}

function formatBalance(b: number): string {
  return b.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */
export default function AdminChannelsPage() {
  /* data state */
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  /* dialog state */
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ChannelFormData>(emptyForm())
  const [saving, setSaving] = useState(false)

  /* delete confirmation */
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* test state */
  const [testingId, setTestingId] = useState<number | null>(null)
  const [testResult, setTestResult] = useState<{ id: number; ok: boolean; message: string } | null>(null)

  /* fetch channels */
  const fetchChannels = useCallback(async () => {
    try {
      const res = await api.get<ApiListResponse<Channel>>("/api/channel/")
      setChannels(res.data || [])
    } catch (err) {
      console.error("Failed to fetch channels:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  /* filtered list */
  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  /* ── form helpers ──────────────────────────────────────────── */
  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (ch: Channel) => {
    setEditingId(ch.id)
    setForm({
      name: ch.name,
      type: ch.type,
      models: ch.models,
      balance: ch.balance,
      status: ch.status,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId !== null) {
        await api.put("/api/channel/", { id: editingId, ...form })
      } else {
        await api.post("/api/channel/", form)
      }
      closeDialog()
      await fetchChannels()
    } catch (err) {
      console.error("Failed to save channel:", err)
    } finally {
      setSaving(false)
    }
  }

  /* ── delete ────────────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (deletingId === null) return
    setDeleting(true)
    try {
      await api.delete(`/api/channel/${deletingId}`)
      setChannels((prev) => prev.filter((c) => c.id !== deletingId))
    } catch (err) {
      console.error("Failed to delete channel:", err)
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  /* ── test ──────────────────────────────────────────────────── */
  const testChannel = async (id: number) => {
    setTestingId(id)
    setTestResult(null)
    try {
      const res = await api.get<{ ok: boolean; message: string }>(`/api/channel/test/${id}`)
      setTestResult({ id, ok: res.ok, message: res.message })
      setTimeout(() => setTestResult(null), 4000)
    } catch (err) {
      setTestResult({ id, ok: false, message: String(err) })
      setTimeout(() => setTestResult(null), 4000)
    } finally {
      setTestingId(null)
    }
  }

  /* ── model toggle ──────────────────────────────────────────── */
  const toggleModel = (model: string) => {
    setForm((prev) => ({
      ...prev,
      models: prev.models.includes(model)
        ? prev.models.filter((m) => m !== model)
        : [...prev.models, model],
    }))
  }

  /* ── render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
          <p className="text-sm text-muted-foreground">
            Manage provider channels and their balances
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Channel
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search channels by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading channels...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {search ? "No channels match your search." : "No channels yet. Create one to get started."}
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
                      <Th>Name</Th>
                      <Th>Type</Th>
                      <Th>Status</Th>
                      <Th>Models</Th>
                      <Th>Balance</Th>
                      <Th>Created</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ch) => (
                      <tr
                        key={ch.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <Td className="font-medium">{ch.name}</Td>
                        <Td>
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                            {channelTypeName(ch.type)}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              ch.status
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {ch.status ? "Active" : "Disabled"}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            {ch.models.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              ch.models.map((m) => (
                                <span
                                  key={m}
                                  className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground"
                                >
                                  {m}
                                </span>
                              ))
                            )}
                          </div>
                        </Td>
                        <Td className="font-mono text-xs tabular-nums">
                          {formatBalance(ch.balance)}
                        </Td>
                        <Td className="text-muted-foreground whitespace-nowrap">
                          {formatDate(ch.created_at)}
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* test */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => testChannel(ch.id)}
                              disabled={testingId === ch.id}
                              title="Test channel"
                            >
                              {testingId === ch.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : testResult?.id === ch.id ? (
                                testResult.ok ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )
                              ) : (
                                <TestTube className="h-4 w-4" />
                              )}
                            </Button>
                            {/* edit */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(ch)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingId(ch.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`mt-3 rounded-md border px-4 py-3 text-sm ${
                  testResult.ok
                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800/40 dark:bg-green-950/30 dark:text-green-400"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400"
                }`}
              >
                <span className="font-medium">
                  {testResult.ok ? "✓ Passed" : "✗ Failed"}
                </span>
                : {testResult.message}
              </div>
            )}
          </div>

          {/* ═══ Mobile cards ═══ */}
          <div className="sm:hidden space-y-3">
            {filtered.map((ch) => (
              <Card key={ch.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Top row: name + status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{ch.name}</p>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium mt-1">
                        {channelTypeName(ch.type)}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        ch.status
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {ch.status ? "Active" : "Disabled"}
                    </span>
                  </div>

                  {/* Models */}
                  <div className="flex flex-wrap gap-1">
                    {ch.models.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No models</span>
                    ) : (
                      ch.models.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium"
                        >
                          {m}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Balance + date */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">
                      {formatBalance(ch.balance)}
                    </span>
                    <span>{formatDate(ch.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => testChannel(ch.id)}
                      disabled={testingId === ch.id}
                    >
                      {testingId === ch.id ? (
                        <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Testing</>
                      ) : testResult?.id === ch.id ? (
                        testResult.ok ? (
                          <><CheckCircle className="mr-1 h-4 w-4 text-green-500" /> Passed</>
                        ) : (
                          <><XCircle className="mr-1 h-4 w-4 text-destructive" /> Failed</>
                        )
                      ) : (
                        <><TestTube className="mr-1 h-4 w-4" /> Test</>
                      )}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(ch)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeletingId(ch.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Test result inline */}
                  {testResult?.id === ch.id && (
                    <div
                      className={`rounded px-3 py-2 text-xs ${
                        testResult.ok
                          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      }`}
                    >
                      <span className="font-medium">
                        {testResult.ok ? "✓" : "✗"}
                      </span>{" "}
                      {testResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Create / Edit Dialog ──────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Channel" : "Create Channel"}</DialogTitle>
            <DialogDescription>
              {editingId !== null
                ? "Update the channel settings below."
                : "Fill in the details to create a new provider channel."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="channel-name">Name</Label>
              <Input
                id="channel-name"
                placeholder="My Channel"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="channel-type">Type</Label>
              <Select
                value={String(form.type)}
                onValueChange={(v) => setForm((p) => ({ ...p, type: Number(v) }))}
              >
                <SelectTrigger id="channel-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Models (free-text comma-separated) */}
            <div className="space-y-2">
              <Label htmlFor="channel-models">Models</Label>
              <Input
                id="channel-models"
                placeholder="gpt-4, gpt-3.5-turbo, claude-3"
                value={form.models.join(", ")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    models: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated model names
              </p>
            </div>

            {/* Balance */}
            <div className="space-y-2">
              <Label htmlFor="channel-balance">Balance</Label>
              <Input
                id="channel-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.balance}
                onChange={(e) =>
                  setForm((p) => ({ ...p, balance: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.status}
                onClick={() => setForm((p) => ({ ...p, status: !p.status }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  form.status ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                    form.status ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <Label
                className="cursor-pointer"
                onClick={() => setForm((p) => ({ ...p, status: !p.status }))}
              >
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : editingId !== null ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────── */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this channel? This action cannot be undone. All associated configurations will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
