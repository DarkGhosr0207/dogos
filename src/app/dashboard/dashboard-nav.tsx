'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/dashboard/dogs', label: 'My Dogs', icon: '🐾' },
  { href: '/dashboard/reminders', label: 'Reminders', icon: '🔔' },
  { href: '/dashboard/activity', label: 'Activity', icon: '🏃' },
  { href: '/dashboard/health', label: 'Health Log', icon: '❤️' },
  { href: '/dashboard/weight', label: 'Weight', icon: '⚖️' },
  { href: '/dashboard/insights', label: 'AI Insights', icon: '👑' },
  { href: '/dashboard/symptoms', label: 'Symptoms', icon: '🩺' },
  { href: '/dashboard/legal', label: 'Legal Hub', icon: '⚖️' },
  { href: '/dashboard/vet', label: 'Find Vet', icon: '🏥' },
] as const

const forestHover = {
  backgroundColor: '#2d4a34',
  color: '#ffffff',
} as const

const defaultNav = {
  color: '#8aab8f',
} as const

const itemBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors'

export default function DashboardNav() {
  const pathname = usePathname()
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)

  return (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Dashboard">
      {items.map(({ href, label, icon }) => {
        const isActive =
          href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === href || pathname.startsWith(`${href}/`)

        const isHover = hoveredHref === href
        const style =
          isActive || isHover
            ? forestHover
            : defaultNav

        return (
          <Link
            key={href}
            href={href}
            className={`${itemBase} ${isActive ? 'font-medium' : ''}`}
            style={style}
            onMouseEnter={() => setHoveredHref(href)}
            onMouseLeave={() => setHoveredHref(null)}
          >
            <span className="text-lg leading-none" aria-hidden>
              {icon}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
