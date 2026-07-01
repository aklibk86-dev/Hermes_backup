import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "../../lib/api"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { cn } from "../../lib/utils"
import {
  Loader2,
  Music,
  Play,
  Disc3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
} from "lucide-react"

// ── Types ──────────────────────────────────────────

interface SunoTask {
  id: string
  action: string
  status: "pending" | "running" | "succeed" | "failed" | "timeout"
  progress?: string
  fail_reason?: string
  submit_time?: string
  finish_time?: string
  data?: SunoResult[]
}

interface SunoResult {
  id: string
  title?: string
  lyrics?: string
  audio_url?: string
  image_url?: string
  video_url?: string
  model_name?: string
  style?: string
  duration?: number
}

interface SubmitResponse {
  data: SunoTask
}

interface FetchResponse {
  data: SunoTask
}

type GenerationAction = "generate" | "custom_generate"

// ── Status helpers ─────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  pending: {
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: <Clock className="h-4 w-4" />,
    label: "Pending",
  },
  running: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "Generating…",
  },
  succeed: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Completed",
  },
  failed: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: <XCircle className="h-4 w-4" />,
    label: "Failed",
  },
  timeout: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    icon: <AlertCircle className="h-4 w-4" />,
    label: "Timed out",
  },
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ── Component ──────────────────────────────────────

export default function SunoPage() {
  // ── Form state ──
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("")
  const [title, setTitle] = useState("")
  const [action, setAction] = useState<GenerationAction>("generate")

  // ── Task tracking ──
  const [currentTask, setCurrentTask] = useState<SunoTask | null>(null)
  const [completedTasks, setCompletedTasks] = useState<SunoTask[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Polling cleanup ──
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const startPolling = useCallback(
    (taskId: string) => {
      stopPolling()

      pollingRef.current = setInterval(async () => {
        try {
          const res = await api.get<FetchResponse>(`/suno/fetch/${taskId}`)
          const task = res.data

          setCurrentTask(task)

          // Terminal states
          if (
            task.status === "succeed" ||
            task.status === "failed" ||
            task.status === "timeout"
          ) {
            stopPolling()
            setIsSubmitting(false)
            setCompletedTasks((prev) => [task, ...prev])
          }
        } catch {
          stopPolling()
          setIsSubmitting(false)
          setError("Failed to fetch task status")
        }
      }, 2000)
    },
    [stopPolling],
  )

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) return

    setError(null)
    setIsSubmitting(true)
    setCurrentTask(null)

    try {
      const body: Record<string, string> = {
        action,
        prompt: trimmedPrompt,
      }
      if (style.trim()) body.style = style.trim()
      if (title.trim()) body.title = title.trim()

      const res = await api.post<SubmitResponse>("/suno/submit/generate", body)
      const task = res.data

      setCurrentTask(task)
      startPolling(task.id)
    } catch (err) {
      setIsSubmitting(false)
      setError(
        err instanceof Error ? err.message : "Failed to submit generation",
      )
    }
  }, [prompt, style, title, action, startPolling])

  // ── Render ──
  const currentTaskStatus = currentTask
    ? STATUS_CONFIG[currentTask.status] ?? STATUS_CONFIG.pending
    : null

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Suno Music</h1>
          <p className="text-sm text-muted-foreground">
            Generate music with AI-powered Suno
          </p>
        </div>
      </div>

      {/* Generation form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Music</CardTitle>
          <CardDescription>
            Describe the music you want to create
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={action === "generate" ? "default" : "outline"}
              size="sm"
              onClick={() => setAction("generate")}
            >
              Generate
            </Button>
            <Button
              type="button"
              variant={action === "custom_generate" ? "default" : "outline"}
              size="sm"
              onClick={() => setAction("custom_generate")}
            >
              Custom Generate
            </Button>
          </div>

          {/* Prompt / Lyrics */}
          <div className="space-y-1.5">
            <Label htmlFor="prompt">
              {action === "custom_generate" ? "Lyrics" : "Prompt"}
            </Label>
            <textarea
              id="prompt"
              className={cn(
                "flex w-full rounded-lg border border-input bg-background",
                "px-3 py-2 text-sm shadow-sm min-h-[100px] resize-y",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              placeholder={
                action === "custom_generate"
                  ? "Enter your lyrics here…"
                  : "Describe the music you want… e.g. 'A soulful lo-fi beat with jazz piano'"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Style */}
          <div className="space-y-1.5">
            <Label htmlFor="style">Style</Label>
            <Input
              id="style"
              placeholder="e.g. Lo-fi, Jazz, Electronic, Cinematic…"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Optional song title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current task progress */}
      {currentTask && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Disc3 className="h-4 w-4" />
              Current Task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status badge */}
            {currentTaskStatus && (
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  currentTaskStatus.bg,
                  currentTaskStatus.color,
                )}
              >
                {currentTaskStatus.icon}
                {currentTaskStatus.label}
              </div>
            )}

            {/* Progress bar for running tasks */}
            {currentTask.status === "running" && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full animate-pulse w-2/3" />
              </div>
            )}

            {/* Fail reason */}
            {currentTask.status === "failed" && currentTask.fail_reason && (
              <p className="text-sm text-destructive">{currentTask.fail_reason}</p>
            )}

            {/* Completed results */}
            {currentTask.status === "succeed" && currentTask.data && (
              <div className="grid gap-3 sm:grid-cols-2">
                {currentTask.data.map((item) => (
                  <ResultCard key={item.id} result={item} />
                ))}
              </div>
            )}

            {/* Timestamps */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {currentTask.submit_time && (
                <span>
                  Submitted:{" "}
                  {new Date(currentTask.submit_time).toLocaleString()}
                </span>
              )}
              {currentTask.finish_time && (
                <span>
                  Finished:{" "}
                  {new Date(currentTask.finish_time).toLocaleString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </h2>

          <div className="grid gap-3">
            {completedTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Task #{task.id.slice(0, 8)}
                      </span>
                    </div>
                    {STATUS_CONFIG[task.status] && (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATUS_CONFIG[task.status].bg,
                          STATUS_CONFIG[task.status].color,
                        )}
                      >
                        {STATUS_CONFIG[task.status].icon}
                        {STATUS_CONFIG[task.status].label}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {task.status === "failed" && task.fail_reason && (
                    <p className="text-xs text-destructive">
                      {task.fail_reason}
                    </p>
                  )}
                  {task.status === "succeed" && task.data && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {task.data.map((item) => (
                        <ResultCard key={item.id} result={item} compact />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!currentTask && completedTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Music className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            No generations yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            Fill in the form above with a prompt, style, and optional title,
            then click Generate to create your first piece of music.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Result Card ────────────────────────────────────

function ResultCard({
  result,
  compact,
}: {
  result: SunoResult
  compact?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyLyrics = async () => {
    if (result.lyrics) {
      try {
        await navigator.clipboard.writeText(result.lyrics)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Clipboard not available
      }
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        compact ? "p-3" : "p-4",
      )}
    >
      {/* Cover art */}
      {result.image_url && (
        <div className="relative aspect-square rounded-md overflow-hidden bg-muted mb-3">
          <img
            src={result.image_url}
            alt={result.title || "Cover art"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Info */}
      <div className="space-y-1.5">
        {result.title && (
          <p
            className={cn(
              "font-medium text-foreground truncate",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {result.title}
          </p>
        )}

        {result.style && (
          <p className="text-xs text-muted-foreground">{result.style}</p>
        )}

        {result.duration && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(result.duration)}
          </p>
        )}

        {result.model_name && (
          <p className="text-[11px] text-muted-foreground">
            Model: {result.model_name}
          </p>
        )}
      </div>

      {/* Audio player */}
      {result.audio_url && (
        <audio
          controls
          preload="none"
          className="w-full mt-3 h-9 rounded-md"
          src={result.audio_url}
        >
          Your browser does not support the audio element.
        </audio>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {result.lyrics && !compact && (
          <Button variant="outline" size="sm" onClick={handleCopyLyrics}>
            {copied ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <HelpCircle className="h-3 w-3" />
            )}
            {copied ? "Copied!" : "Lyrics"}
          </Button>
        )}

        {result.audio_url && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={result.audio_url}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Download
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
