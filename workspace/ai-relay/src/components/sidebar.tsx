import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/lib/store'
import { mainNav, manageNav } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { X, Sparkles, ChevronRight } from 'lucide-react'

export function Sidebar() {
  const { isOpen, setOpen } = useSidebarStore()

  const navContent = (
    <div className='flex h-full flex-col'>
      <div className='flex h-14 items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'>
            <Sparkles className='h-4 w-4 text-primary-foreground' />
          </div>
          <span className='text-lg font-semibold'>AI Relay</span>
        </div>
        <Button variant='ghost' size='icon' className='lg:hidden' onClick={() => setOpen(false)}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      <ScrollArea className='flex-1 px-3'>
        <div className='space-y-1 py-2'>
          <p className='px-2 text-xs font-medium text-muted-foreground'>功能</p>
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className='h-4 w-4 shrink-0' />
              <span className='flex-1'>{item.title}</span>
              {item.badge && (
                <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <Separator className='my-3' />

        <div className='space-y-1 pb-4'>
          <p className='px-2 text-xs font-medium text-muted-foreground'>管理</p>
          {manageNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className='h-4 w-4 shrink-0' />
              <span className='flex-1'>{item.title}</span>
              <ChevronRight className='h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100' />
            </NavLink>
          ))}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className='hidden w-60 shrink-0 border-r bg-card lg:block'>
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className='fixed inset-0 z-50 lg:hidden'>
          <div className='fixed inset-0 bg-black/50' onClick={() => setOpen(false)} />
          <aside className='fixed inset-y-0 left-0 z-50 w-72 border-r bg-card shadow-xl animate-in slide-in-from-left'>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
