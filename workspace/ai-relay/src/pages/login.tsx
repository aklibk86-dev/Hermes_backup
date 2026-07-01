import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore, applyTheme, useThemeStore } from '@/lib/store'
import { useEffect } from 'react'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    applyTheme(useThemeStore.getState().theme)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // For demo purposes — will connect to real API later
      login('demo-token', {
        id: '1',
        username: username || 'admin',
        email: 'admin@demo.com',
        role: 'admin',
      })
      navigate('/dashboard')
    } catch {
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
      <Card className='w-full max-w-sm'>
        <CardHeader className='space-y-1 text-center'>
          <div className='flex justify-center mb-2'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg'>
              <Sparkles className='h-6 w-6 text-primary-foreground' />
            </div>
          </div>
          <CardTitle className='text-2xl'>AI Relay</CardTitle>
          <CardDescription>登录你的 API 管理面板</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                用户名
              </label>
              <Input
                placeholder='输入用户名'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                密码
              </label>
              <Input
                type='password'
                placeholder='输入密码'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className='text-sm text-destructive'>{error}</p>}
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
