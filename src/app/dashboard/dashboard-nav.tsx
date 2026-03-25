'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/dogs', label: 'My Dogs' },
  { href: '/dashboard/reminders', label: 'Reminders' },
  { href: '/dashboard/symptoms', label: 'Symptoms' },
  { href: '/dashboard/legal', label: 'Legal Hub' },
  { href: '/dashboard/vet', label: 'Find Vet' },
] as const

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Dashboard">
      {items.map(({ href, label }) => {
        const isActive =
          href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
