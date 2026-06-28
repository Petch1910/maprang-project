import {
  Bell,
  Compass,
  Download,
  Folder,
  Gauge,
  Heart,
  HelpCircle,
  Image,
  MessageCircle,
  Palette,
  PlusCircle,
  Settings,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type MissAiNavItem = {
  to?: string
  label: string
  icon: LucideIcon
  badge?: string
  disabledReason?: string
}

export type MissAiNavSection = {
  label?: string
  items: MissAiNavItem[]
}

export const missAiPrimaryNav: MissAiNavItem[] = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/wallet', label: 'เครดิตใช้งาน', icon: Gauge },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/works', label: 'พลาซ่านักสร้าง', icon: Palette },
  { to: '/ai-creator', label: 'แกลเลอรี AI', icon: Image },
  { to: '/announcements', label: 'ประกาศ', icon: Bell },
  { to: '/creators', label: 'นักสร้างยอดนิยม', icon: Trophy },
  { label: 'ดาวน์โหลดแอป', icon: Download, disabledReason: 'เซิร์ฟเวอร์ในเครื่องยังไม่มีแพ็กเกจแอปให้ดาวน์โหลด' },
  { to: '/support', label: 'ช่วยเหลือ', icon: HelpCircle },
]

export const missAiAccountNav: MissAiNavItem[] = [
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/events', label: 'อีเวนต์', icon: Bell },
  { to: '/favorites', label: 'รายการโปรด', icon: Heart },
  { to: '/works', label: 'ผลงาน', icon: Folder },
  { to: '/profile', label: 'ตั้งค่า', icon: Settings },
]

export const missAiMobileNav: MissAiNavItem[] = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/wallet', label: 'เครดิต', icon: Gauge },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/ai-creator', label: 'AI', icon: Image },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
]

export const missAiNavSections: MissAiNavSection[] = [
  { items: missAiPrimaryNav },
  { label: 'บัญชี', items: missAiAccountNav },
]
