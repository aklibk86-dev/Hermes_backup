import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Bell, Shield, Palette } from 'lucide-react'
import { useThemeStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 1000)
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>系统设置</h1>
        <p className='text-sm text-muted-foreground'>管理系统配置</p>
      </div>

      <Tabs defaultValue='general' className='space-y-6'>
        <TabsList>
          <TabsTrigger value='general' className='gap-2'>
            <Palette className='h-4 w-4' />
            通用
          </TabsTrigger>
          <TabsTrigger value='security' className='gap-2'>
            <Shield className='h-4 w-4' />
            安全
          </TabsTrigger>
          <TabsTrigger value='notification' className='gap-2'>
            <Bell className='h-4 w-4' />
            通知
          </TabsTrigger>
        </TabsList>

        <TabsContent value='general' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>站点设置</CardTitle>
              <CardDescription>配置站点名称和外观</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>站点名称</label>
                <Input defaultValue='AI Relay' className='max-w-sm' />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>API 基础地址</label>
                <Input defaultValue='https://api.example.com' className='max-w-sm' />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>主题模式</label>
                <div className='flex gap-2'>
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <Button
                      key={t}
                      variant={theme === t ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setTheme(t)}
                    >
                      {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>模型设置</CardTitle>
              <CardDescription>默认模型参数</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>默认模型</label>
                <Input defaultValue='gpt-4o' className='max-w-sm' />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>最大 Token 上限</label>
                <Input type='number' defaultValue='4096' className='max-w-sm' />
              </div>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <label className='text-sm font-medium'>自动重试</label>
                  <p className='text-xs text-muted-foreground'>请求失败时自动重试</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='security' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>安全设置</CardTitle>
              <CardDescription>API 安全配置</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <label className='text-sm font-medium'>IP 白名单</label>
                  <p className='text-xs text-muted-foreground'>仅允许白名单 IP 访问 API</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <label className='text-sm font-medium'>频率限制</label>
                  <p className='text-xs text-muted-foreground'>限制每个用户的请求频率</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className='space-y-2'>
                <label className='text-sm font-medium'>速率限制（次/分钟）</label>
                <Input type='number' defaultValue='60' className='max-w-sm' />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='notification' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>通知渠道配置</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <label className='text-sm font-medium'>余额告警</label>
                  <p className='text-xs text-muted-foreground'>渠道余额不足时发送通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className='space-y-2'>
                <label className='text-sm font-medium'>余额阈值（$）</label>
                <Input type='number' defaultValue='10' className='max-w-sm' />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <label className='text-sm font-medium'>每日用量报告</label>
                  <p className='text-xs text-muted-foreground'>每日发送用量统计</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className='flex items-center gap-2'>
        <Button onClick={handleSave} disabled={saving}>
          <Save className='mr-2 h-4 w-4' />
          {saving ? '保存中...' : '保存设置'}
        </Button>
        <Button variant='outline'>重置</Button>
      </div>
    </div>
  )
}
