import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, FileText, ChevronLeft, ChevronRight, Download } from 'lucide-react'

const initialLogs = [
  { id: 1, time: '10:23:45', user: 'user@demo.com', model: 'gpt-4o', type: 'chat', tokens: 1524, cost: '$0.076', status: 'success', duration: '2.3s' },
  { id: 2, time: '10:22:10', user: 'user@demo.com', model: 'midjourney-v6', type: 'image', tokens: 0, cost: '$0.40', status: 'success', duration: '12.1s' },
  { id: 3, time: '10:20:33', user: 'admin@demo.com', model: 'claude-3-opus', type: 'chat', tokens: 2891, cost: '$0.145', status: 'success', duration: '4.7s' },
  { id: 4, time: '10:18:22', user: 'user@demo.com', model: 'deepseek-chat', type: 'chat', tokens: 567, cost: '$0.011', status: 'success', duration: '1.1s' },
  { id: 5, time: '10:15:00', user: 'admin@demo.com', model: 'gpt-4o', type: 'chat', tokens: 0, cost: '$0.00', status: 'error', duration: '0.3s' },
  { id: 6, time: '10:12:45', user: 'user@demo.com', model: 'suno-v4', type: 'music', tokens: 0, cost: '$0.10', status: 'success', duration: '30.5s' },
  { id: 7, time: '10:10:00', user: 'user@demo.com', model: 'gpt-4o-mini', type: 'chat', tokens: 234, cost: '$0.002', status: 'success', duration: '0.8s' },
  { id: 8, time: '10:08:30', user: 'test@demo.com', model: 'gpt-4o', type: 'chat', tokens: 4567, cost: '$0.228', status: 'success', duration: '5.2s' },
  { id: 9, time: '10:05:15', user: 'admin@demo.com', model: 'deepseek-chat', type: 'chat', tokens: 1234, cost: '$0.025', status: 'success', duration: '2.0s' },
  { id: 10, time: '10:00:00', user: 'user@demo.com', model: 'gpt-4o', type: 'chat', tokens: 890, cost: '$0.045', status: 'success', duration: '1.5s' },
]

const typeBadge: Record<string, string> = { chat: 'default', image: 'secondary', music: 'outline' }

export default function LogsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const filtered = initialLogs.filter(
    (l) =>
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.model.toLowerCase().includes(search.toLowerCase())
  )
  const total = filtered.length
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>日志记录</h1>
          <p className='text-sm text-muted-foreground'>查看 API 调用日志</p>
        </div>
        <Button variant='outline' size='sm'>
          <Download className='mr-2 h-4 w-4' />
          导出日志
        </Button>
      </div>

      <div className='relative max-w-sm'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='搜索用户或模型...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-9'
        />
      </div>

      <Card>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/50'>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>时间</th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>用户</th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>模型</th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>类型</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Token</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>费用</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>耗时</th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>状态</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id} className='border-b last:border-0 hover:bg-muted/30 transition-colors'>
                    <td className='px-4 py-3 text-muted-foreground'>{log.time}</td>
                    <td className='px-4 py-3'>{log.user}</td>
                    <td className='px-4 py-3'><span className='font-medium'>{log.model}</span></td>
                    <td className='px-4 py-3'>
                      <Badge variant={typeBadge[log.type] as 'default' | 'secondary' | 'outline'}>
                        {log.type === 'chat' ? '对话' : log.type === 'image' ? '图片' : '音乐'}
                      </Badge>
                    </td>
                    <td className='px-4 py-3 text-right font-mono text-xs'>{log.tokens.toLocaleString()}</td>
                    <td className='px-4 py-3 text-right font-mono text-xs'>{log.cost}</td>
                    <td className='px-4 py-3 text-right text-muted-foreground'>{log.duration}</td>
                    <td className='px-4 py-3'>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                        {log.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className='flex items-center justify-between text-sm text-muted-foreground'>
        <span>共 {total} 条</span>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='icon' className='h-8 w-8' disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='min-w-10 text-center'>
            {page} / {totalPages}
          </span>
          <Button variant='outline' size='icon' className='h-8 w-8' disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
