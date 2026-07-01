import {
  LayoutDashboard,
  MessageSquare,
  Image,
  Music,
  GitBranch,
  Key,
  FileText,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
}

export const mainNav: NavItem[] = [
  { title: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Playground', href: '/playground', icon: MessageSquare, badge: '聊天' },
  { title: 'Midjourney', href: '/midjourney', icon: Image, badge: '绘图' },
  { title: 'Suno', href: '/suno', icon: Music, badge: '音乐' },
]

export const manageNav: NavItem[] = [
  { title: '渠道管理', href: '/channels', icon: GitBranch },
  { title: 'Token 管理', href: '/tokens', icon: Key },
  { title: '日志记录', href: '/logs', icon: FileText },
  { title: '用户管理', href: '/users', icon: Users },
  { title: '系统设置', href: '/settings', icon: Settings },
]
