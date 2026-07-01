import { useState } from 'react'
import { Image, Wand2, Download, Copy, Clock, Loader2 } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:2'

const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:2']

const styles = [
  { value: 'default', label: 'Default' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'anime', label: 'Anime' },
  { value: 'realistic', label: 'Realistic' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'pixel-art', label: 'Pixel Art' },
]

const gradients = [
  'from-pink-500 via-red-500 to-yellow-500',
  'from-cyan-400 via-blue-500 to-purple-600',
  'from-green-400 via-emerald-500 to-teal-600',
  'from-orange-400 via-rose-500 to-pink-600',
  'from-indigo-400 via-purple-500 to-fuchsia-600',
  'from-yellow-300 via-amber-500 to-orange-600',
  'from-teal-400 via-cyan-500 to-blue-600',
  'from-violet-400 via-purple-500 to-pink-600',
]

const mockGallery = [
  { prompt: 'A serene mountain landscape at sunset with vibrant colors', ratio: '16:9', style: 'Cinematic', time: '12s' },
  { prompt: 'Cyberpunk city street in the rain with neon lights', ratio: '9:16', style: 'Realistic', time: '15s' },
  { prompt: 'Fantasy castle floating among cotton candy clouds', ratio: '1:1', style: 'Fantasy', time: '10s' },
  { prompt: 'Anime-style cherry blossom garden with a mystical pond', ratio: '4:3', style: 'Anime', time: '14s' },
  { prompt: 'Pixel art village with medieval tavern and market stalls', ratio: '3:2', style: 'Pixel Art', time: '18s' },
  { prompt: 'Cinematic shot of a spaceship landing on an alien planet', ratio: '16:9', style: 'Cinematic', time: '11s' },
  { prompt: 'Realistic portrait of a wolf with glowing blue eyes', ratio: '1:1', style: 'Realistic', time: '13s' },
  { prompt: 'Fantasy dragon perched atop a mountain of gold treasure', ratio: '16:9', style: 'Fantasy', time: '16s' },
]

export function MidjourneyPage() {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [style, setStyle] = useState('default')
  const [isGenerating, setIsGenerating] = useState(false)
  const [gallery, setGallery] = useState(mockGallery)

  const handleGenerate = () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false)
      setGallery((prev) => [
        {
          prompt: prompt.trim(),
          ratio: aspectRatio,
          style: styles.find((s) => s.value === style)?.label ?? 'Default',
          time: `${Math.floor(Math.random() * 20) + 5}s`,
        },
        ...prev.slice(0, 7),
      ])
      setPrompt('')
    }, 2500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Image className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Midjourney</h1>
          <p className="text-sm text-muted-foreground">
            Generate stunning AI images from text prompts
          </p>
        </div>
      </div>

      {/* Input section */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Aspect ratio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Aspect Ratio</label>
              <div className="flex gap-1.5">
                {aspectRatios.map((ratio) => (
                  <Button
                    key={ratio}
                    variant={aspectRatio === ratio ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAspectRatio(ratio)}
                    className="min-w-[52px] text-xs"
                  >
                    {ratio}
                  </Button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Style</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Gallery */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Generated Images</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Loading card */}
          {isGenerating && (
            <Card className="overflow-hidden">
              <div className="flex h-[200px] items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Generating...
                  </p>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          )}

          {/* Gallery cards */}
          {gallery.map((item, i) => (
            <Card
              key={i}
              className={cn(
                'group overflow-hidden transition-shadow hover:shadow-md',
                i === 0 && isGenerating && 'opacity-50'
              )}
            >
              {/* Gradient placeholder image */}
              <div
                className={cn(
                  'flex h-[200px] items-end bg-gradient-to-br p-3',
                  gradients[i % gradients.length]
                )}
              >
                <div className="rounded bg-black/40 px-2 py-1 text-xs text-white backdrop-blur-sm">
                  {item.ratio}
                </div>
              </div>
              <CardContent className="space-y-2 p-3">
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {item.prompt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Copy prompt"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.style}
                    </Badge>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
