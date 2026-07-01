import { useState } from 'react'
import { Music, Play, Pause, Download, Trash2, Volume2, Loader2, Sparkles } from 'lucide-react'
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

const genres = [
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'hip-hop', label: 'Hip-hop' },
  { value: 'classical', label: 'Classical' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'rnb', label: 'R&B' },
  { value: 'folk', label: 'Folk' },
]

const accentColors = [
  'bg-pink-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-blue-500',
  'bg-lime-500',
]

const mockTracks = [
  {
    title: 'Neon Nights',
    genre: 'Electronic',
    duration: '3:24',
    genreValue: 'electronic',
    progress: 45,
    playing: false,
  },
  {
    title: 'Autumn Leaves Jazz',
    genre: 'Jazz',
    duration: '4:12',
    genreValue: 'jazz',
    progress: 0,
    playing: false,
  },
  {
    title: 'Starlight Symphony',
    genre: 'Classical',
    duration: '5:08',
    genreValue: 'classical',
    progress: 0,
    playing: false,
  },
  {
    title: 'Urban Flow',
    genre: 'Hip-hop',
    duration: '3:45',
    genreValue: 'hip-hop',
    progress: 0,
    playing: false,
  },
]

export function SunoPage() {
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('pop')
  const [isGenerating, setIsGenerating] = useState(false)
  const [tracks, setTracks] = useState(mockTracks)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)

  const handleGenerate = () => {
    if (!description.trim()) return
    setIsGenerating(true)
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false)
      setTracks((prev) => [
        {
          title: description.trim().slice(0, 30) + (description.length > 30 ? '...' : ''),
          genre: genres.find((g) => g.value === genre)?.label ?? 'Pop',
          duration: `${Math.floor(Math.random() * 2) + 3}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          genreValue: genre,
          progress: 0,
          playing: false,
        },
        ...prev.slice(0, 3),
      ])
      setDescription('')
    }, 3000)
  }

  const togglePlay = (index: number) => {
    setPlayingIndex(playingIndex === index ? null : index)
    setTracks((prev) =>
      prev.map((t, i) => ({
        ...t,
        playing: i === index ? !t.playing : false,
      }))
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Music className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suno</h1>
          <p className="text-sm text-muted-foreground">
            Generate AI music from song descriptions
          </p>
        </div>
      </div>

      {/* Input section */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Song Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the song you want to create... (e.g. 'A chill lo-fi beat with piano and soft drums')"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {/* Genre */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Genre</label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Music className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Track list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Generated Tracks</h2>

        {/* Loading skeleton */}
        {isGenerating && (
          <Card className="mb-4 overflow-hidden">
            <div className="flex">
              <div className={cn('w-1 shrink-0', accentColors[tracks.length % accentColors.length])} />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
                <div className="flex justify-between">
                  <div className="h-3 w-1/6 animate-pulse rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-7 w-7 animate-pulse rounded bg-muted" />
                    <div className="h-7 w-7 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Track cards */}
        <div className="space-y-3">
          {tracks.map((track, i) => (
            <Card
              key={i}
              className={cn(
                'overflow-hidden transition-shadow hover:shadow-md',
                track.playing && 'ring-1 ring-primary'
              )}
            >
              <div className="flex">
                {/* Colored accent bar */}
                <div
                  className={cn(
                    'w-1 shrink-0',
                    accentColors[i % accentColors.length]
                  )}
                />

                <div className="flex flex-1 flex-col gap-3 p-4">
                  {/* Top row: play button, title, genre */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant={track.playing ? 'default' : 'secondary'}
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => togglePlay(i)}
                    >
                      {track.playing ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{track.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {track.genre}
                        </Badge>
                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Volume2 className="h-3 w-3" />
                          {track.duration}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
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
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          track.playing ? 'bg-primary' : 'bg-muted-foreground/30'
                        )}
                        style={{ width: `${track.progress}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                      {track.progress}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {!isGenerating && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No tracks yet. Describe a song and generate one!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
