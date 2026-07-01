import { useState, useRef, useEffect, useCallback } from "react"
import { api, type Model } from "../../lib/api"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import { Label } from "../../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { cn } from "../../lib/utils"
import { Send, Loader2, Bot, User, Sparkles, Menu } from "lucide-react"

// ── Types ──────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ModelsResponse {
  data: Model[]
}

// ── Helpers ────────────────────────────────────────

let msgIdCounter = 0
function nextId() {
  msgIdCounter += 1
  return `msg-${msgIdCounter}-${Date.now()}`
}

function scrollToBottom(el: HTMLDivElement | null) {
  if (!el) return
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight
  })
}

// ── Simple Markdown Renderer ───────────────────────

function MarkdownRender({ content }: { content: string }) {
  // Split on fenced code blocks, preserving delimiters
  const parts = content.split(/(```[\s\S]*?```)/g)

  return (
    <span className="prose-sm max-w-none break-words">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Code block
          const inner = part.slice(3, -3)
          const nl = inner.indexOf("\n")
          const lang = nl > -1 ? inner.slice(0, nl).trim() : ""
          const code = nl > -1 ? inner.slice(nl + 1) : inner
          return (
            <pre
              key={i}
              className="bg-muted/60 border rounded-md p-3 my-2 overflow-x-auto text-sm leading-relaxed"
            >
              <code>{code}</code>
            </pre>
          )
        }

        // Inline text — split by newline
        return part.split("\n").map((line, j) => {
          // Skip rendering the empty zero-width element for blank lines
          if (line === "") {
            return <br key={`${i}-${j}`} />
          }
          // Bold/italic via regex
          let html = line
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
            // Inline code
            .replace(/`([^`]+)`/g, "<code class='bg-muted/60 px-1 rounded text-sm'>$1</code>")

          return (
            <p
              key={`${i}-${j}`}
              className="mb-1 last:mb-0"
              dangerouslySetInnerHTML={{ __html: html || "\u00A0" }}
            />
          )
        })
      })}
    </span>
  )
}

// ── Component ──────────────────────────────────────

export default function PlaygroundPage() {
  // ── State ──

  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [streamingContent, setStreamingContent] = useState("")
  const streamingRef = useRef("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch models ──

  useEffect(() => {
    api
      .get<ModelsResponse>("/api/models")
      .then((res) => {
        const enabled = res.data.filter((m) => m.enabled)
        setModels(enabled)
        if (enabled.length > 0) setSelectedModel(enabled[0].model)
      })
      .catch(() => {
        // silently fail; empty list shows placeholder
      })
  }, [])

  // ── Scroll to bottom when messages change ──

  useEffect(() => {
    scrollToBottom(messagesEndRef.current)
  }, [messages, streamingContent])

  // ── Send message ──

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading || !selectedModel) return

    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text }
    const assistantId = nextId()

    // Optimistically add user message
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)
    setStreamingContent("")
    streamingRef.current = ""

    // Build the messages payload for the API
    const apiMessages: Array<{ role: string; content: string }> = []
    if (systemPrompt.trim()) {
      apiMessages.push({ role: "system", content: systemPrompt.trim() })
    }
    apiMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })))
    apiMessages.push({ role: "user", content: text })

    try {
      await api.streamChat(
        "/v1/chat/completions",
        { model: selectedModel, messages: apiMessages, stream: true },
        (chunkText) => {
          streamingRef.current += chunkText
          setStreamingContent(streamingRef.current)
        },
      )

      const finalContent = streamingRef.current
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: finalContent },
      ])
      setStreamingContent("")
      streamingRef.current = ""
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: `**Error:** ${err instanceof Error ? err.message : "Something went wrong"}`,
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [input, isLoading, selectedModel, messages, systemPrompt])

  // ── Keyboard shortcut ──

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Clear conversation ──

  const handleClear = () => {
    setMessages([])
    setStreamingContent("")
    streamingRef.current = ""
  }

  // ── Render ──

  const sidebarContent = (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-sm">Playground</h2>
      </div>

      {/* Model selector */}
      <div className="space-y-1.5">
        <Label htmlFor="model-select" className="text-xs text-muted-foreground">
          Model
        </Label>
        <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
          <SelectTrigger id="model-select" className="w-full">
            <SelectValue placeholder="Select a model…" />
          </SelectTrigger>
          <SelectContent>
            {models.length === 0 && (
              <SelectItem value="" disabled>
                No models available
              </SelectItem>
            )}
            {models.map((m) => (
              <SelectItem key={m.model} value={m.model}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* System prompt */}
      <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
        <Label htmlFor="system-prompt" className="text-xs text-muted-foreground">
          System Prompt
        </Label>
        <textarea
          id="system-prompt"
          className={cn(
            "flex-1 w-full rounded-md border border-input bg-transparent",
            "px-3 py-2 text-sm shadow-sm resize-none",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          placeholder="You are a helpful assistant…"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={isLoading}
          rows={6}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Messages are sent to <code className="bg-muted px-1 rounded text-[11px]">{selectedModel || "—"}</code> via the Chat API.
        </p>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={isLoading}>
            Clear conversation
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 md:gap-4">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col w-72 lg:w-80 shrink-0",
          "border-r md:border-r-0 md:border-border pr-0 md:pr-4",
        )}
      >
        <Card className="flex-1 p-4 overflow-y-auto">{sidebarContent}</Card>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <Menu className="h-4 w-4 rotate-45" />
              </Button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 mb-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Inline model dropdown on mobile */}
          <div className="flex-1">
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full text-xs h-8">
                <SelectValue placeholder="Model…" />
              </SelectTrigger>
              <SelectContent>
                {models.length === 0 && (
                  <SelectItem value="" disabled>
                    No models available
                  </SelectItem>
                )}
                {models.map((m) => (
                  <SelectItem key={m.model} value={m.model}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesEndRef}
          className={cn(
            "flex-1 overflow-y-auto rounded-lg border border-border p-4",
            "space-y-4 mb-4",
          )}
        >
          {messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Start a conversation</p>
              <p className="text-xs mt-1 max-w-xs">
                Select a model from the sidebar, optionally set a system prompt, and send your
                first message.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming message */}
          {isLoading && streamingContent && (
            <MessageBubble
              message={{ id: "streaming", role: "assistant", content: streamingContent }}
              isStreaming
            />
          )}

          {/* Thinking indicator */}
          {isLoading && !streamingContent && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message…"
              disabled={isLoading || !selectedModel}
              className={cn(
                "flex w-full rounded-lg border border-input bg-background",
                "px-4 py-3 pr-10 text-sm shadow-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "transition-colors",
              )}
              autoFocus
            />
            {!selectedModel && (
              <p className="absolute -top-5 left-0 text-[11px] text-destructive">
                Select a model first
              </p>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !selectedModel}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-lg"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Message Bubble ──────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage
  isStreaming?: boolean
}) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 h-8 w-8 rounded-full flex items-center justify-center ring-1 ring-border",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm",
          isStreaming && "animate-pulse",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownRender content={message.content} />
        )}
      </div>
    </div>
  )
}
