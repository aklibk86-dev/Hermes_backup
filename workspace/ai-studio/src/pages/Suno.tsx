import { useState } from 'react'
import {
  Music,
  Play,
  Pause,
  Download,
  Headphones,
  WandSparkles,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const GENRES = [
  'Pop',
  'Rock',
  'Electronic',
  'Hip-Hop',
  'Jazz',
  'Classical',
  'R&B',
  'Lo-fi',
] as const

type Genre = (typeof GENRES)[number]

const DURATIONS = [30, 60, 90] as const

interface Track {
  id: string
  title: string
  genre: Genre
  duration: number
  isPlaying: boolean
}

const WaveformBars = ({ animated = false }: { animated?: boolean }) => (
  <div className="flex items-end gap-[2px] h-8 flex-1 max-w-[120px]">
    {Array.from({ length: 16 }).map((_, i) => (
      <span
        key={i}
        className={cn(
          'w-[3px] rounded-full bg-accent/40 transition-all duration-300',
          animated && 'animate-pulse',
        )}
        style={{
          height: `${Math.max(20, Math.sin(i * 0.8) * 50 + 50)}%`,
          animationDelay: animated ? `${i * 0.08}s` : undefined,
          animationDuration: '0.6s',
        }}
      />
    ))}
  </div>
)

export default function Suno() {
  const [lyrics, setLyrics] = useState('')
  const [stylePrompt, setStylePrompt] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<Genre>('Pop')
  const [duration, setDuration] = useState<number>(60)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)

  const handleGenerate = () => {
    if (!lyrics.trim() && !stylePrompt.trim()) return

    setIsGenerating(true)
    setTracks([])

    // Simulate generation
    setTimeout(() => {
      const newTrack: Track = {
        id: crypto.randomUUID(),
        title: stylePrompt.trim() || 'Untitled Track',
        genre: selectedGenre,
        duration,
        isPlaying: false,
      }
      setTracks([newTrack])
      setIsGenerating(false)
    }, 2000)
  }

  const togglePlay = (trackId: string) => {
    setNowPlaying((prev) => (prev === trackId ? null : trackId))
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        isPlaying: t.id === trackId ? t.id !== nowPlaying : false,
      })),
    )
  }

  const handleDownload = (track: Track) => {
    // Placeholder: would trigger actual download
    console.log('Downloading track:', track.title)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <Music className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI Music Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Generate unique songs from your lyrics and ideas
          </p>
        </header>

        {/* Input Section */}
        <section className="mb-10 space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create a Track</h2>

          {/* Lyrics */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Lyrics
            </label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Write your lyrics here…"
              rows={6}
              className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Style prompt */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Style / Prompt
            </label>
            <input
              type="text"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="A pop song about…"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Genre selector — pill buttons */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    selectedGenre === genre
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground',
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Duration segmented control */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Duration
            </label>
            <div className="inline-flex overflow-hidden rounded-lg border border-input bg-background">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'px-5 py-2 text-sm font-medium transition-colors',
                    duration === d
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || (!lyrics.trim() && !stylePrompt.trim())}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all',
              isGenerating || (!lyrics.trim() && !stylePrompt.trim())
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.98]',
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <WandSparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        </section>

        {/* Tracks Section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Generated Tracks</h2>

          {tracks.length === 0 && !isGenerating ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Headphones className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Create your first track</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Write some lyrics and pick a style to begin
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Loading skeleton */}
              {isGenerating && (
                <div className="flex animate-pulse items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-3 w-16 rounded bg-muted" />
                      <div className="h-3 w-12 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-20 rounded bg-muted" />
                    <div className="h-8 w-8 rounded bg-muted" />
                  </div>
                </div>
              )}

              {/* Track cards */}
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border p-4 transition-colors',
                    track.isPlaying
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-card',
                  )}
                >
                  {/* Play button */}
                  <button
                    type="button"
                    onClick={() => togglePlay(track.id)}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                      track.isPlaying
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground',
                    )}
                  >
                    {track.isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium">
                      {track.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        {track.genre}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {track.duration}s
                      </span>
                    </div>
                  </div>

                  {/* Waveform */}
                  <div className="hidden sm:block">
                    <WaveformBars animated={track.isPlaying} />
                  </div>

                  {/* Download */}
                  <button
                    type="button"
                    onClick={() => handleDownload(track)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
