import { useState } from 'react'
import { Bot, Send } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Role = 'user' | 'assistant'

interface Message {
  role: Role
  content: string
}

const models = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
]

const initialMessages: Message[] = [
  {
    role: 'user',
    content: 'Explain the quicksort algorithm and provide a code example in Python.',
  },
  {
    role: 'assistant',
    content:
      '## Quicksort Algorithm\n\nQuicksort is a **divide-and-conquer** sorting algorithm that works by:\n\n1. **Pivot selection** — pick an element as the pivot\n2. **Partitioning** — reorder the array so smaller elements go left, larger go right\n3. **Recursion** — recursively apply the same steps to the sub-arrays\n\nHere\'s an implementation in Python:\n\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n```\n\nTime complexity:\n- **Best / Average**: O(n log n)\n- **Worst**: O(n²) — occurs when the pivot is always the smallest or largest element',
  },
  {
    role: 'user',
    content: 'Can you show an in-place version instead?',
  },
]

export function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [model, setModel] = useState('gpt-4o')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful AI assistant.'
  )
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [topP, setTopP] = useState(0.95)

  const handleSend = () => {
    if (!input.trim()) return
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: input.trim() },
    ])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const tokenCount = messages.reduce((sum, m) => sum + m.content.length, 0)

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Left panel - settings */}
      <aside className="hidden w-[280px] shrink-0 lg:block">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Model select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* System prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">System Prompt</label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt..."
                className="min-h-[100px] resize-none"
              />
            </div>

            <Separator />

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Temperature</label>
                <span className="text-xs text-muted-foreground">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Max tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Max Tokens</label>
                <span className="text-xs text-muted-foreground">
                  {maxTokens}
                </span>
              </div>
              <input
                type="range"
                min="64"
                max="8192"
                step="64"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Top P */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Top P</label>
                <span className="text-xs text-muted-foreground">
                  {topP.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Right main area - chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between rounded-t-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Playground</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              {model}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {tokenCount.toLocaleString()} tokens
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden border-l border-r border-border">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Bot className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No messages yet. Start a conversation!
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input bar */}
        <div className="flex items-end gap-2 rounded-b-lg border border-border bg-card p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="min-h-[44px] resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
