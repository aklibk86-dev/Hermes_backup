import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "../../lib/api"
import { Button } from "../../components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { cn } from "../../lib/utils"
import { Send, Loader2, Image, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

// ── Types ──────────────────────────────────────────

interface TaskRecord {
  id: string
  prompt: string
  progress: number
  status: "pending" | "running" | "completed" | "failed"
  createdAt: string
  imageUrl?: string
}

interface SubmitResponse {
  data: { taskId: string }
}

interface TaskStatusResponse {
  progress: number
  status: string
  imageUrl?: string
  failReason?: string
}

interface TasksListResponse {
  data: TaskRecord[]
}

// ── Helpers ────────────────────────────────────────

const STATUS_ICON: Record<TaskRecord["status"], React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
}

const STATUS_LABEL: Record<TaskRecord["status"], string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

// ── Component ──────────────────────────────────────

export default function MidjourneyPage() {
  // ── State ──
  const [prompt, setPrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeProgress, setActiveProgress] = useState(0)
  const [activeStatus, setActiveStatus] = useState<string>("")
  const [activeImageUrl, setActiveImageUrl] = useState<string | undefined>()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch recent tasks ──
  const fetchTasks = useCallback(async () => {
    try {
      setTasksError(null)
      const res = await api.get<TasksListResponse>("/api/mj/")
      setTasks(res.data ?? [])
    } catch (err) {
      setTasksError(
        err instanceof Error ? err.message : "Failed to load tasks",
      )
    } finally {
      setTasksLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // ── Clean up polling on unmount ──
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Poll task status ──
  const startPolling = useCallback((taskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<TaskStatusResponse>(
          `/mj/task/${taskId}/fetch`,
        )
        const progress = res.progress ?? 0
        const status = res.status ?? "running"

        setActiveProgress(progress)
        setActiveStatus(status)

        if (res.imageUrl) {
          setActiveImageUrl(res.imageUrl)
        }

        // Stop polling when done
        if (
          status === "completed" ||
          status === "failed" ||
          progress >= 100
        ) {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
          // Refresh the task list
          fetchTasks()
        }
      } catch {
        // Ignore polling errors — keep trying
      }
    }, 2000)
  }, [fetchTasks])

  // ── Submit prompt ──
  const handleSubmit = useCallback(async () => {
    const text = prompt.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setActiveTaskId(null)
    setActiveProgress(0)
    setActiveStatus("")
    setActiveImageUrl(undefined)

    try {
      const res = await api.post<SubmitResponse>("/mj/submit/imagine", {
        prompt: text,
      })
      const taskId = res.data?.taskId
      if (!taskId) throw new Error("No task ID returned")

      setActiveTaskId(taskId)
      setActiveStatus("pending")
      setPrompt("")

      // Start polling progress
      startPolling(taskId)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit prompt",
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [prompt, isSubmitting, startPolling])

  // ── Key handler ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── Render ──
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Image className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Midjourney</h1>
      </div>

      {/* ── Submit Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt input */}
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image you want to generate…"
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isSubmitting}
              className="shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Submit
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Active task progress */}
          {activeTaskId && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  Task: <span className="text-foreground">{activeTaskId}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {STATUS_ICON[statusFromString(activeStatus)] ?? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {STATUS_LABEL[statusFromString(activeStatus)] ?? activeStatus}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{activeProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      activeProgress >= 100
                        ? "bg-green-500"
                        : "bg-primary",
                    )}
                    style={{ width: `${Math.min(activeProgress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Generated image preview */}
              {activeImageUrl && (
                <div className="rounded-md overflow-hidden border bg-background">
                  <img
                    src={activeImageUrl}
                    alt="Generated image"
                    className="w-full h-auto object-cover max-h-80"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Tasks ── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Tasks</h2>

        {tasksLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading tasks…
          </div>
        )}

        {tasksError && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mr-1.5 shrink-0" />
            {tasksError}
          </div>
        )}

        {!tasksLoading && !tasksError && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Image className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No tasks yet</p>
            <p className="text-xs mt-1">
              Submit a prompt above to get started
            </p>
          </div>
        )}

        {!tasksLoading && !tasksError && tasks.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {tasks.map((task) => (
              <Card key={task.id} className="overflow-hidden">
                {task.imageUrl && (
                  <div className="aspect-video overflow-hidden border-b bg-muted">
                    <img
                      src={task.imageUrl}
                      alt={task.prompt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm line-clamp-2 leading-relaxed">
                    {task.prompt}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {STATUS_ICON[task.status] ?? null}
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                    <span>{formatTime(task.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers (internal) ─────────────────────────────

function statusFromString(s: string): TaskRecord["status"] {
  const lower = s.toLowerCase()
  if (lower === "completed" || lower === "finished" || lower === "done")
    return "completed"
  if (lower === "failed" || lower === "error") return "failed"
  if (lower === "running" || lower === "processing") return "running"
  return "pending"
}
