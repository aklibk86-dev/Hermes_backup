import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Copy, Check, Edit, Trash2, X, Key } from "lucide-react"
import { api, type Token, type Model, type ApiListResponse } from "../../lib/api"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
interface TokenFormData {
  name: string
  models: string[]
  unlimited_quota: boolean
}

const emptyForm = (): TokenFormData => ({
  name: "",
  models: [],
  unlimited_quota: false,
})

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function maskKey(key: string): string {
  if (key.length <= 8) return key
  return key.slice(0, 4) + "****" + key.slice(-4)
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
export default function TokensPage() {
  /* data state */
  const [tokens, setTokens] = useState<Token[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  /* dialog state */
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TokenFormData>(emptyForm())
  const [saving, setSaving] = useState(false)

  /* delete confirmation */
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* copy feedback */
  const [copiedId, setCopiedId] = useState<number | null>(null)

  /* fetch data */
  const fetchTokens = useCallback(async () => {
    try {
      const res = await api.get<ApiListResponse<Token>>("/api/user/token/")
      setTokens(res.data || [])
    } catch (err) {
      console.error("Failed to fetch tokens:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchModels = useCallback(async () => {
    try {
      const res = await api.get<{ data: Model[] }>("/api/models")
      setModels(res.data || [])
    } catch (err) {
      console.error("Failed to fetch models:", err)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
    fetchModels()
  }, [fetchTokens, fetchModels])

  /* filtered list */
  const filtered = tokens.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  /* ── form helpers ──────────────────────────────────────────── */
  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (token: Token) => {
    setEditingId(token.id)
    setForm({ name: token.name, models: token.models, unlimited_quota: token.unlimited_quota })
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
        await api.put(`/api/user/token/`, { id: editingId, ...form })
      } else {
        await api.post("/api/user/token/", form)
      }
      closeDialog()
      await fetchTokens()
    } catch (err) {
      console.error("Failed to save token:", err)
    } finally {
      setSaving(false)
    }
  }

  /* ── delete ────────────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (deletingId === null) return
    setDeleting(true)
    try {
      await api.delete(`/api/user/token/${deletingId}`)
      setTokens((prev) => prev.filter((t) => t.id !== deletingId))
    } catch (err) {
      console.error("Failed to delete token:", err)
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  /* ── copy ──────────────────────────────────────────────────── */
  const copyKey = async (token: Token) => {
    try {
      await navigator.clipboard.writeText(token.key)
      setCopiedId(token.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback
      const ta = document.createElement("textarea")
      ta.value = token.key
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopiedId(token.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  /* ── model selection ────────────────────────────────────────── */
  const toggleModel = (model: string) => {
    setForm((prev) => ({
      ...prev,
      models: prev.models.includes(model)
        ? prev.models.filter((m) => m !== model)
        : [...prev.models, model],
    }))
  }

  /* ── render ───────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Tokens</h1>
          <p className="text-sm text-muted-foreground">
            Manage your API access tokens
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Token
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tokens by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading tokens...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {search ? "No tokens match your search." : "No tokens yet. Create one to get started."}
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
                      <Th>Name</Th>
                      <Th>Key</Th>
                      <Th>Status</Th>
                      <Th>Quota</Th>
                      <Th>Created</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((token) => (
                      <tr key={token.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <Td className="font-medium">{token.name}</Td>
                        <Td>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {maskKey(token.key)}
                          </code>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              token.status
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {token.status ? "Active" : "Disabled"}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              {token.used_quota.toLocaleString()} used
                            </span>
                            {token.unlimited_quota ? (
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                Unlimited
                              </span>
                            ) : (
                              <span className="text-xs font-medium">
                                {token.remaining_quota.toLocaleString()} remaining
                              </span>
                            )}
                          </div>
                        </Td>
                        <Td className="text-muted-foreground">{formatDate(token.created_at)}</Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyKey(token)}
                              title="Copy key"
                            >
                              {copiedId === token.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(token)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingId(token.id)}
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
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((token) => (
              <Card key={token.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{token.name}</p>
                      <code className="text-xs text-muted-foreground font-mono">
                        {maskKey(token.key)}
                      </code>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        token.status
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {token.status ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{token.used_quota.toLocaleString()} used</span>
                    {token.unlimited_quota ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Unlimited</span>
                    ) : (
                      <span>{token.remaining_quota.toLocaleString()} remaining</span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">{formatDate(token.created_at)}</div>

                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => copyKey(token)}>
                      {copiedId === token.id ? (
                        <><Check className="mr-1 h-4 w-4 text-green-500" /> Copied</>
                      ) : (
                        <><Copy className="mr-1 h-4 w-4" /> Copy Key</>
                      )}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(token)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeletingId(token.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Token" : "Create Token"}</DialogTitle>
            <DialogDescription>
              {editingId !== null
                ? "Update the token settings below."
                : "Fill in the details to create a new API token."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="token-name">Name</Label>
              <Input
                id="token-name"
                placeholder="My API Token"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Models */}
            <div className="space-y-2">
              <Label>Models</Label>
              {models.length === 0 ? (
                <p className="text-xs text-muted-foreground">No models available</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {models.map((m) => {
                    const selected = form.models.includes(m.model || m.name)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModel(m.model || m.name)}
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Unlimited Quota */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.unlimited_quota}
                onClick={() => setForm((p) => ({ ...p, unlimited_quota: !p.unlimited_quota }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  form.unlimited_quota ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                    form.unlimited_quota ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <Label className="cursor-pointer" onClick={() => setForm((p) => ({ ...p, unlimited_quota: !p.unlimited_quota }))}>
                Unlimited quota
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
            <DialogTitle>Delete Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this token? This action cannot be undone. Any services using this token will lose access immediately.
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
