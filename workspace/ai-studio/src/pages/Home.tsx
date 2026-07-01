import { useNavigate } from 'react-router-dom'
import { Sparkles, Code2, Image, Music, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    title: 'Playground',
    description: 'Write HTML, CSS, and JavaScript in an interactive code editor with live preview.',
    icon: Code2,
    path: '/playground',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Midjourney',
    description: 'Generate stunning AI images with prompts, style presets, and aspect ratio controls.',
    icon: Image,
    path: '/midjourney',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Suno',
    description: 'Create AI-generated music with lyrics, genre selection, and duration control.',
    icon: Music,
    path: '/suno',
    gradient: 'from-amber-500 to-red-500',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Creative Studio
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4">
            Create with{' '}
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            An integrated creative studio for coding, image generation, and music creation — all powered by artificial intelligence.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-16 max-w-5xl mx-auto">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <button
                key={feature.path}
                onClick={() => navigate(feature.path)}
                className="group text-left p-6 rounded-2xl border border-border bg-card hover:border-accent/30 transition-all duration-200 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4',
                  feature.gradient
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
