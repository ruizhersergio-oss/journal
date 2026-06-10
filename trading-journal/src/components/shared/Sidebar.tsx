'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  DollarSign,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/diario',     label: 'Diario',        icon: BookOpen },
  { href: '/dol-stats',  label: 'DOL Stats',     icon: BarChart2 },
  { href: '/inversion',  label: 'Inversión',     icon: DollarSign },
  { href: '/backups',    label: 'Backups',        icon: Download },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col bg-[#13151c] border-r border-[#2a2d3a] z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2a2d3a]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#4f8ef7] flex items-center justify-center">
            <span className="text-white text-xs font-bold">TJ</span>
          </div>
          <span className="text-[#e8eaf0] font-semibold text-sm tracking-wide">
            Trading Journal
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#4f8ef7]/10 text-[#4f8ef7]'
                  : 'text-[#6b7280] hover:text-[#e8eaf0] hover:bg-[#1f2230]'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#2a2d3a]">
        <p className="text-[#6b7280] text-xs">v1.0.0</p>
      </div>
    </aside>
  )
}
