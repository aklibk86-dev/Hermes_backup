import { useState } from 'react'
import {
  Sparkles,
  Download,
  Shuffle,
  CopyPlus,
  Wand2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
]

const STYLE_PRESETS = [
  'Cinematic',
  'Anime',
  'Realistic',
  'Fantasy',
  'Cyberpunk',
]

interface GalleryImage {
  id: string
  prompt: string
  aspectRatio: string
  style: string
  timestamp: Date
  gradient: string
}

const GRADIENTS = [
  'from-purple-600 via-pink-500 to-orange-400',
  'from-cyan-500 via-blue-600 to-indigo-700',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-rose-500 via-red-500 to-orange-500',
  'from-violet-600 via-purple-600 to-fuchsia-500',
  'from-sky-500 via-indigo-500 to-violet-600',
  'from-amber-500 via-orange-500 to-red-500',
  'from-pink-500 via-rose-500 to-red-600',
]

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

function randomGradient() {
  return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)]
}

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="aspect-[4/3] rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-lg bg-muted" />
        <div className="h-8 w-16 rounded-lg bg-muted" />
        <div className="h-8 w-16 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

export default function Midjourney() {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)

  async function handleGenerate() {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setHasGenerated(true)

    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const newImage: GalleryImage = {
      id: generateId(),
      prompt: prompt.trim(),
      aspectRatio,
      style: selectedStyle ?? 'None',
      timestamp: new Date(),
      gradient: randomGradient(),
    }

    setGallery((prev) => [newImage, ...prev])
    setIsGenerating(false)
  }

  function handleDownload(id: string) {
    // Placeholder — would trigger actual image download
    console.log('Download image', id)
  }

  function handleUpscale(id: string) {
    // Placeholder — would trigger upscale
    console.log('Upscale image', id)
  }

  function handleVary(id: string) {
    // Placeholder — would trigger variation generation
    console.log('Vary image', id)
  }

  function formatTimestamp(date: Date) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const showEmptyState = !isGenerating && gallery.length === 0 && !hasGenerated

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="px-4 pt-20 pb-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            Midjourney
          </h1>
          <p className="mb-10 text-center text-lg text-muted-foreground">
            Generate stunning AI imagery from text prompts
          </p>

          {/* Prompt input */}
          <div className="relative mb-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
              placeholder="Describe the image you want to create…"
              rows={3}
              className="w-full resize-none rounded-2xl border border-input bg-card px-5 py-4 pr-14 text-base placeholder-muted-foreground shadow-sm outline-none ring-accent transition-all focus:ring-2"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={cn(
                'absolute right-3 bottom-3 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                isGenerating || !prompt.trim()
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-accent text-accent-foreground hover:opacity-90',
              )}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {/* Aspect ratio pills */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Aspect:
            </span>
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                type="button"
                onClick={() => setAspectRatio(ar.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  aspectRatio === ar.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {ar.label}
              </button>
            ))}
          </div>

          {/* Style presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Style:
            </span>
            {STYLE_PRESETS.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() =>
                  setSelectedStyle(selectedStyle === style ? null : style)
                }
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  selectedStyle === style
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          {/* Generating skeleton */}
          {isGenerating && (
            <div className="mb-8 grid gap-6 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Empty state */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Wand2 className="mb-4 h-16 w-16 opacity-40" />
              <p className="text-lg font-medium">No images yet</p>
              <p className="mt-1 text-sm">
                Enter a prompt above to generate your first AI image
              </p>
            </div>
          )}

          {/* Image grid */}
          {gallery.length > 0 && (
            <>
              {!isGenerating && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">
                    Gallery
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({gallery.length} image{gallery.length !== 1 && 's'})
                    </span>
                  </h2>
                </div>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                {gallery.map((img) => (
                  <div
                    key={img.id}
                    className="group rounded-2xl border border-border bg-card p-3 shadow-sm transition-all hover:border-foreground/20"
                  >
                    {/* Image placeholder */}
                    <div
                      className={cn(
                        'mb-3 aspect-[4/3] w-full rounded-xl bg-gradient-to-br',
                        img.gradient,
                      )}
                    />

                    {/* Prompt & meta */}
                    <div className="mb-3 space-y-1">
                      <p className="line-clamp-2 text-sm leading-snug">
                        {img.prompt}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatTimestamp(img.timestamp)}</span>
                        <span className="opacity-40">·</span>
                        <span>{img.aspectRatio}</span>
                        {img.style !== 'None' && (
                          <>
                            <span className="opacity-40">·</span>
                            <span>{img.style}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(img.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpscale(img.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground"
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                        Upscale
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVary(img.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground"
                      >
                        <CopyPlus className="h-3.5 w-3.5" />
                        Vary
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
