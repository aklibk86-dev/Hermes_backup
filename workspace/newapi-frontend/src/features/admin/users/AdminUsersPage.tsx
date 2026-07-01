import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Edit, Trash2, Check, X } from "lucide-react"
import { api, type User, type ApiListResponse } from "../../../lib/api"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../../../components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
interface UserFormData {
  username: string
  email: string
  password: string
  role: string
  status: boolean
  quota: number
  group: string
}

const emptyForm = (): UserFormData => ({
  username: "",
  email: "",
  password: "",
  role: "user",
  status: true,
  quota: 0,
  group: "default",
})

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

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  /* data state */
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)

  /* pagination */
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  /* dialog state */
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<UserFormData>(emptyForm())
  const [saving, setSaving] = useState(false)

  /* delete confirmation */
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* toggling status */
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  /* total pages */
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  /* fetch data */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get<ApiListResponse<User>>(`/api/user/?page=${page}&pageSize=${pageSize}`)
      setUsers(res.data || [])
      setTotal(res.total ?? 0)
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  /* search */
  useEffect(() => {
    if (!search.trim()) {
      setSearching(false)
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get<ApiListResponse<User>>(`/api/user/search?keyword=${encodeURIComponent(search)}`)
        setUsers(res.data || [])
        setTotal(res.total ?? 0)
      } catch (err) {
        console.error("Failed to search users:", err)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  /* ── form helpers ──────────────────────────────────────────── */
  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingId(user.id)
    setForm({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
      quota: user.quota,
      group: user.group,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleSave = async () => {
    if (!form.username.trim() || !form.email.trim()) return
    if (editingId === null && !form.password.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        username: form.username,
        email: form.email,
        role: form.role,
        status: form.status,
        quota: form.quota,
        group: form.group,
      }
      if (form.password.trim()) body.password = form.password

      if (editingId !== null) {
        await api.put(`/api/user/`, { id: editingId, ...body })
      } else {
        await api.post("/api/user/", body)
      }
      closeDialog()
      await fetchUsers()
    } catch (err) {
      console.error("Failed to save user:", err)
    } finally {
      setSaving(false)
    }
  }

  /* ── delete ────────────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (deletingId === null) return
    setDeleting(true)
    try {
      await api.delete(`/api/user/${deletingId}`)
      setUsers((prev) => prev.filter((u) => u.id !== deletingId))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Failed to delete user:", err)
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  /* ── toggle status ─────────────────────────────────────────── */
  const toggleStatus = async (user: User) => {
    setTogglingIds((prev) => new Set(prev).add(user.id))
    try {
      await api.put("/api/user/", {
        id: user.id,
        status: !user.status,
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: !u.status } : u))
      )
    } catch (err) {
      console.error("Failed to toggle user status:", err)
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(user.id)
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
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage platform users
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by username or email..."
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
            {searching ? "Searching users..." : "Loading users..."}
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {search ? "No users match your search." : "No users yet."}
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
                      <Th>ID</Th>
                      <Th>Username</Th>
                      <Th>Email</Th>
                      <Th>Role</Th>
                      <Th>Status</Th>
                      <Th>Quota</Th>
                      <Th>Used</Th>
                      <Th>Group</Th>
                      <Th>Created</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <Td className="text-muted-foreground font-mono text-xs">
                          {user.id}
                        </Td>
                        <Td className="font-medium">{user.username}</Td>
                        <Td className="text-muted-foreground">{user.email}</Td>
                        <Td>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              user.role === "admin" || user.role === "root"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {user.role}
                          </span>
                        </Td>
                        <Td>
                          <button
                            type="button"
                            disabled={togglingIds.has(user.id)}
                            onClick={() => toggleStatus(user)}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${
                              user.status
                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                            } disabled:opacity-50 cursor-pointer hover:opacity-80`}
                            title={user.status ? "Click to disable" : "Click to enable"}
                          >
                            {togglingIds.has(user.id) ? (
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                            ) : user.status ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            {user.status ? "Active" : "Disabled"}
                          </button>
                        </Td>
                        <Td className="font-mono text-xs">{user.quota.toLocaleString()}</Td>
                        <Td className="font-mono text-xs text-muted-foreground">
                          {user.used_quota.toLocaleString()}
                        </Td>
                        <Td>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {user.group}
                          </span>
                        </Td>
                        <Td className="text-muted-foreground whitespace-nowrap">
                          {formatDate(user.created_at)}
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(user)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingId(user.id)}
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

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      disabled={togglingIds.has(user.id)}
                      onClick={() => toggleStatus(user)}
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${
                        user.status
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                          : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                      } disabled:opacity-50 cursor-pointer`}
                    >
                      {togglingIds.has(user.id) ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                      ) : user.status ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {user.status ? "Active" : "Disabled"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Role:</span>{" "}
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          user.role === "admin" || user.role === "root"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Group:</span>{" "}
                      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                        {user.group}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quota:</span>{" "}
                      <span className="font-mono">{user.quota.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Used:</span>{" "}
                      <span className="font-mono">{user.used_quota.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {formatDate(user.created_at)}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(user)}
                    >
                      <Edit className="mr-1 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeletingId(user.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

      {/* ── Create / Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {editingId !== null
                ? "Update the user details below."
                : "Fill in the details to create a new user."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="user-username">Username</Label>
              <Input
                id="user-username"
                placeholder="johndoe"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="user-password">
                Password {editingId !== null && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder={editingId !== null ? "New password (optional)" : "Password"}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
              >
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="root">Root</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group */}
            <div className="space-y-2">
              <Label htmlFor="user-group">Group</Label>
              <Input
                id="user-group"
                placeholder="default"
                value={form.group}
                onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}
              />
            </div>

            {/* Quota */}
            <div className="space-y-2">
              <Label htmlFor="user-quota">Quota</Label>
              <Input
                id="user-quota"
                type="number"
                min={0}
                placeholder="0"
                value={form.quota}
                onChange={(e) => setForm((p) => ({ ...p, quota: Number(e.target.value) }))}
              />
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-3 pt-1">
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
            <Button
              onClick={handleSave}
              disabled={saving || !form.username.trim() || !form.email.trim() || (editingId === null && !form.password.trim())}
            >
              {saving ? "Saving..." : editingId !== null ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────── */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone. The user will lose all access immediately.
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
