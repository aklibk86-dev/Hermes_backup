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
import { Plus, Search, GitBranch, Edit, Trash2, Power, PowerOff } from 'lucide-react'

const initialChannels = [
  { id: 1, name: 'OpenAI', baseUrl: 'https://api.openai.com', model: 'gpt-4o', status: 'active', balance: '$120.50', priority: 1 },
  { id: 2, name: 'Claude', baseUrl: 'https://api.anthropic.com', model: 'claude-3-opus', status: 'active', balance: '$85.30', priority: 2 },
  { id: 3, name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', status: 'active', balance: '¥200.00', priority: 3 },
  { id: 4, name: 'Midjourney', baseUrl: 'https://api.midjourney.com', model: 'midjourney-v6', status: 'inactive', balance: '$0.00', priority: 4 },
  { id: 5, name: 'Suno', baseUrl: 'https://api.suno.ai', model: 'suno-v4', status: 'active', balance: '$45.00', priority: 5 },
]

export default function ChannelsPage() {
  const [channels] = useState(initialChannels)
  const [search, setSearch] = useState('')

  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>渠道管理</h1>
          <p className='text-sm text-muted-foreground'>管理 AI 模型 API 渠道</p>
        </div>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          添加渠道
        </Button>
      </div>

      <div className='flex items-center gap-4'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='搜索渠道...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {filtered.map((channel) => (
          <Card key={channel.id} className='transition-colors hover:border-primary/50'>
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
                    <GitBranch className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <CardTitle className='text-base'>{channel.name}</CardTitle>
                    <CardDescription className='text-xs mt-0.5'>{channel.baseUrl}</CardDescription>
                  </div>
                </div>
                <Badge variant={channel.status === 'active' ? 'default' : 'secondary'}>
                  {channel.status === 'active' ? '启用' : '停用'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>模型</span>
                  <span className='font-medium'>{channel.model}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>余额</span>
                  <span className='font-medium'>{channel.balance}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>优先级</span>
                  <span className='font-medium'>#{channel.priority}</span>
                </div>
              </div>
              <div className='mt-4 flex items-center gap-2 border-t pt-3'>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <Edit className='h-4 w-4' />
                </Button>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  {channel.status === 'active' ? <PowerOff className='h-4 w-4 text-destructive' /> : <Power className='h-4 w-4 text-green-500' />}
                </Button>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0 ml-auto text-destructive hover:text-destructive'>
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
