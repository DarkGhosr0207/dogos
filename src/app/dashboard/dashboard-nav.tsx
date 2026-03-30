'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export type DashboardNavItem = {
  href: string
  label: string
  icon: string
}

const forestHover = {
  backgroundColor: '#2d4a34',
  color: '#ffffff',
} as const

const defaultNav = {
  color: '#8aab8f',
} as const

const itemBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors'

type DashboardNavProps = {
  items: DashboardNavItem[]
  unreadAlertsCount: number
}

export default function DashboardNav({ items, unreadAlertsCount }: DashboardNavProps) {
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
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{label}</span>
              {href === '/dashboard/alerts' && unreadAlertsCount > 0 ? (
                <span
                  aria-label={`${unreadAlertsCount} unread alerts`}
                  title={`${unreadAlertsCount} unread alerts`}
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: '#ef4444' }}
                />
              ) : null}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
