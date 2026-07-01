import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Search, Key, Copy, Eye, EyeOff, Trash2, Calendar } from 'lucide-react'

const initialTokens = [
  { id: 1, name: '生产环境 Key', key: 'sk-8f3a...b2d1', model: 'gpt-4o, claude-3', created: '2026-06-01', expires: '2026-12-31', used: 15234, limit: 100000, status: 'active' },
  { id: 2, name: '测试环境 Key', key: 'sk-7c2e...9a4f', model: 'gpt-4o-mini', created: '2026-06-10', expires: '2026-07-10', used: 3421, limit: 10000, status: 'active' },
  { id: 3, name: '开发用 Key', key: 'sk-1b4d...5c8e', model: 'deepseek-chat', created: '2026-06-15', expires: '', used: 892, limit: 50000, status: 'active' },
  { id: 4, name: '老 Key（已过期）', key: 'sk-9e2f...3a7b', model: 'gpt-3.5-turbo', created: '2025-01-01', expires: '2025-12-31', used: 98765, limit: 100000, status: 'expired' },
]

export default function TokensPage() {
  const [tokens] = useState(initialTokens)
  const [search, setSearch] = useState('')
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({})

  const filtered = tokens.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Token 管理</h1>
          <p className='text-sm text-muted-foreground'>管理 API 访问密钥</p>
        </div>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          创建 Token
        </Button>
      </div>

      <div className='relative max-w-sm'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='搜索 Token...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-9'
        />
      </div>

      <div className='space-y-3'>
        {filtered.map((token) => (
          <Card key={token.id} className='transition-colors hover:border-primary/50'>
            <CardContent className='p-4'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3 min-w-0 flex-1'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                    <Key className='h-4 w-4 text-primary' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-medium text-sm'>{token.name}</span>
                      <Badge variant={token.status === 'active' ? 'default' : 'secondary'}>
                        {token.status === 'active' ? '生效中' : '已过期'}
                      </Badge>
                    </div>
                    <div className='mt-1 flex items-center gap-2'>
                      <code className='rounded bg-muted px-2 py-0.5 text-xs font-mono'>
                        {visibleKeys[token.id] ? token.key : token.key.slice(0, 7) + '•••••'}
                      </code>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={() => setVisibleKeys((prev) => ({ ...prev, [token.id]: !prev[token.id] }))}
                      >
                        {visibleKeys[token.id] ? <EyeOff className='h-3 w-3' /> : <Eye className='h-3 w-3' />}
                      </Button>
                      <Button variant='ghost' size='icon' className='h-6 w-6'>
                        <Copy className='h-3 w-3' />
                      </Button>
                    </div>
                    <div className='mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap'>
                      <span className='flex items-center gap-1'>
                        <Calendar className='h-3 w-3' />
                        {token.created}
                      </span>
                      {token.expires && (
                        <span className='flex items-center gap-1'>
                          <Calendar className='h-3 w-3' />
                          至 {token.expires}
                        </span>
                      )}
                      <span>模型: {token.model}</span>
                    </div>
                    <div className='mt-2 flex items-center gap-2'>
                      <div className='flex-1 max-w-48 h-2 rounded-full bg-muted overflow-hidden'>
                        <div
                          className='h-full rounded-full bg-primary transition-all'
                          style={{ width: `${Math.min(100, (token.used / token.limit) * 100)}%` }}
                        />
                      </div>
                      <span className='text-xs text-muted-foreground'>{token.used.toLocaleString()} / {token.limit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0 text-destructive hover:text-destructive'>
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
