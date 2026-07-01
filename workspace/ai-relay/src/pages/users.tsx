import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Plus, Users, Shield, ShieldOff, Trash2, MoreHorizontal } from 'lucide-react'

const initialUsers = [
  { id: 1, username: 'admin', email: 'admin@demo.com', role: 'admin' as const, tokens: 5, calls: 45231, created: '2026-01-01' },
  { id: 2, username: 'user1', email: 'user@demo.com', role: 'user' as const, tokens: 2, calls: 12304, created: '2026-03-15' },
  { id: 3, username: 'testuser', email: 'test@demo.com', role: 'user' as const, tokens: 1, calls: 3456, created: '2026-05-01' },
  { id: 4, username: 'developer', email: 'dev@demo.com', role: 'user' as const, tokens: 3, calls: 8921, created: '2026-04-20' },
]

export default function UsersPage() {
  const [users] = useState(initialUsers)
  const [search, setSearch] = useState('')

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>用户管理</h1>
          <p className='text-sm text-muted-foreground'>管理系统用户</p>
        </div>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          添加用户
        </Button>
      </div>

      <div className='relative max-w-sm'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='搜索用户名或邮箱...'
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
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>用户</th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>角色</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Token 数</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>调用次数</th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>创建时间</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className='border-b last:border-0 hover:bg-muted/30 transition-colors'>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-8 w-8'>
                          <AvatarFallback className='text-xs bg-primary/10 text-primary'>
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='font-medium'>{user.username}</div>
                          <div className='text-xs text-muted-foreground'>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </Badge>
                    </td>
                    <td className='px-4 py-3 text-right font-mono'>{user.tokens}</td>
                    <td className='px-4 py-3 text-right font-mono'>{user.calls.toLocaleString()}</td>
                    <td className='px-4 py-3 text-muted-foreground'>{user.created}</td>
                    <td className='px-4 py-3 text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button variant='ghost' size='icon' className='h-8 w-8'>
                          {user.role === 'admin' ? <ShieldOff className='h-4 w-4' /> : <Shield className='h-4 w-4' />}
                        </Button>
                        <Button variant='ghost' size='icon' className='h-8 w-8 text-destructive hover:text-destructive'>
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
