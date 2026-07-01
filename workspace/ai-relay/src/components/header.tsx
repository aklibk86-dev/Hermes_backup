import { Menu, Bell, User, LogOut } from 'lucide-react'
import { useSidebarStore, useAuthStore } from '@/lib/store'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Header() {
  const { toggle } = useSidebarStore()
  const { user, logout } = useAuthStore()

  return (
    <header className='sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6'>
      <Button variant='ghost' size='icon' className='lg:hidden' onClick={toggle}>
        <Menu className='h-5 w-5' />
        <span className='sr-only'>菜单</span>
      </Button>

      <div className='flex-1' />

      <div className='flex items-center gap-2'>
        <ThemeToggle />

        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='h-4 w-4' />
          <span className='absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive' />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='gap-2'>
              <Avatar className='h-7 w-7'>
                <AvatarFallback className='text-xs bg-primary text-primary-foreground'>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className='hidden sm:inline-block text-sm font-medium'>
                {user?.username || '用户'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuLabel>
              <div className='flex flex-col'>
                <span>{user?.username || '用户'}</span>
                <span className='text-xs font-normal text-muted-foreground'>{user?.email || ''}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
              <User className='mr-2 h-4 w-4' />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className='text-destructive'>
              <LogOut className='mr-2 h-4 w-4' />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
