'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export interface SidebarProps {
  plan: 'free' | 'premium' | 'premium_plus'
  dogName: string
  dogBreed?: string
  dogAge?: string
  dogPhotoUrl?: string
  alertsCount?: number
  healthLogDue?: boolean
}

type NavItem = {
  label: string
  href: string
  icon: string
  premiumPlusOnly?: boolean
  badge?: 'alerts' | 'healthLogDue'
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const SIDEBAR_BG = '#1a2e1f'
const ACCENT = '#2d7a4f'
const MUTED_LABEL = '#5a8c6a'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? 'D'
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]
  return `${a}${b ?? ''}`.toUpperCase()
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar({
  plan,
  dogName,
  dogBreed,
  dogAge,
  dogPhotoUrl,
  alertsCount = 0,
  healthLogDue = false,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const groups: NavGroup[] = useMemo(
    () => [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', href: '/dashboard', icon: '🏡' },
          {
            label: 'Alerts & reminders',
            href: '/dashboard/alerts',
            icon: '🔔',
            badge: 'alerts',
          },
        ],
      },
      {
        label: 'My Dog',
        items: [
          { label: 'Profile & QR', href: '/dashboard/dogs', icon: '🐾' },
          { label: 'Weight', href: '/dashboard/weight', icon: '⚖️' },
        ],
      },
      {
        label: 'Health',
        items: [
          { label: 'Daily log', href: '/dashboard/health-log', icon: '📝', badge: 'healthLogDue' },
          { label: 'Activity', href: '/dashboard/activity', icon: '🏃' },
          { label: 'Symptom check', href: '/dashboard/symptoms', icon: '🩺' },
        ],
      },
      {
        label: 'AI Tools',
        items: [
          { label: 'Health insights', href: '/dashboard/insights', icon: '✨', premiumPlusOnly: true },
          { label: 'Travel planner', href: '/dashboard/travel', icon: '✈️', premiumPlusOnly: true },
          { label: 'Monthly report', href: '/dashboard/report', icon: '📋', premiumPlusOnly: true },
        ],
      },
      {
        label: 'Explore',
        items: [
          { label: 'Legal hub', href: '/dashboard/legal', icon: '⚖️' },
          { label: 'Find a vet', href: '/dashboard/vets', icon: '🏥' },
        ],
      },
    ],
    [],
  )

  function badgeFor(item: NavItem): { text: string; style: React.CSSProperties } | null {
    if (collapsed) return null
    if (item.badge === 'alerts' && alertsCount > 0) {
      return {
        text: String(alertsCount),
        style: { backgroundColor: '#ef4444', color: '#ffffff' },
      }
    }
    if (item.badge === 'healthLogDue' && healthLogDue) {
      return {
        text: '!',
        style: { backgroundColor: '#f59e0b', color: '#111827' },
      }
    }
    return null
  }

  function handleLockedClick(e: React.MouseEvent) {
    e.preventDefault()
    setDrawerOpen(false)
    router.push('/dashboard/upgrade')
  }

  function NavList({ inDrawer }: { inDrawer: boolean }) {
    return (
      <nav className="flex flex-col gap-3" aria-label="Dashboard">
        {groups.map((group) => (
          <div key={group.label} className="pb-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div
              className={`px-4 pb-2 pt-1 transition-opacity duration-150 ${collapsed && !inDrawer ? 'opacity-0' : 'opacity-100'}`}
              style={{
                color: MUTED_LABEL,
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                userSelect: 'none',
              }}
            >
              {group.label}
            </div>

            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href)
                const locked = item.premiumPlusOnly && plan !== 'premium_plus'
                const badge = badgeFor(item)

                const inner = (
                  <div
                    className={[
                      'flex h-11 items-center gap-3 transition-colors duration-150',
                      collapsed && !inDrawer ? 'justify-center px-0' : 'px-4',
                    ].join(' ')}
                    style={{
                      marginLeft: collapsed && !inDrawer ? 0 : 8,
                      marginRight: collapsed && !inDrawer ? 0 : 8,
                      borderRadius: 12,
                      backgroundColor: active ? ACCENT : 'transparent',
                      color: active ? '#ffffff' : 'rgba(255,255,255,0.92)',
                      opacity: locked ? 0.45 : 1,
                    }}
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {item.icon}
                    </span>
                    {!collapsed || inDrawer ? (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{item.label}</span>
                        {badge ? (
                          <span
                            className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold"
                            style={badge.style}
                          >
                            {badge.text}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                )

                if (locked) {
                  return (
                    <a
                      key={item.href}
                      href="/dashboard/upgrade"
                      onClick={handleLockedClick}
                      className="block"
                      style={{ outline: 'none' }}
                      title="Premium+ feature"
                    >
                      {inner}
                    </a>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block"
                    onClick={() => setDrawerOpen(false)}
                    style={{ outline: 'none' }}
                  >
                    <div
                      className="rounded-xl transition-colors duration-150"
                      style={{
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (active) return
                        ;(e.currentTarget as HTMLDivElement).style.backgroundColor =
                          'rgba(255,255,255,0.08)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
                      }}
                    >
                      {inner}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    )
  }

  const width = collapsed ? 60 : 260

  const dogMeta = [dogBreed?.trim(), dogAge?.trim()].filter(Boolean).join(' · ')

  function SidebarPanel({ inDrawer }: { inDrawer: boolean }) {
    return (
      <aside
        className="flex h-full flex-col"
        style={{
          width: inDrawer ? 280 : width,
          transition: inDrawer ? undefined : 'width 200ms ease',
          backgroundColor: SIDEBAR_BG,
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="px-4 pb-4 pt-5">
          <div className={`flex items-center ${collapsed && !inDrawer ? 'justify-center' : ''}`}>
            <div
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full"
              style={{
                border: '1.5px solid rgba(255,255,255,0.2)',
                backgroundColor: dogPhotoUrl ? 'transparent' : ACCENT,
              }}
            >
              {dogPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dogPhotoUrl} alt={dogName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{initials(dogName)}</span>
              )}
            </div>
            {!collapsed || inDrawer ? (
              <div className="ml-3 min-w-0">
                <div className="truncate text-sm font-semibold text-white">{dogName}</div>
                <div className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  {dogMeta || 'Your companion'}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${collapsed && !inDrawer ? 'px-0' : 'px-0'}`}>
          <NavList inDrawer={inDrawer} />
        </div>

        <div className="mt-auto px-4 pb-4 pt-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div
            className={`flex items-center justify-between rounded-2xl px-3 py-2 ${collapsed && !inDrawer ? 'justify-center' : ''}`}
            style={{
              backgroundColor:
                plan === 'premium_plus' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255,255,255,0.06)',
              border: plan === 'premium_plus' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {!collapsed || inDrawer ? (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">
                  {plan === 'premium_plus' ? 'Premium+' : plan === 'premium' ? 'Premium' : 'Free'}
                </div>
                {plan === 'free' ? (
                  <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    Upgrade for AI tools
                  </div>
                ) : null}
              </div>
            ) : null}

            {(!collapsed || inDrawer) && plan === 'free' ? (
              <Link
                href="/dashboard/upgrade"
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: ACCENT, color: '#ffffff' }}
              >
                Upgrade
              </Link>
            ) : null}
          </div>

          {!inDrawer ? (
            <button
              type="button"
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-colors duration-150`}
              style={{
                color: 'rgba(255,255,255,0.85)',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onClick={() => setCollapsed((v) => !v)}
            >
              <span aria-hidden>{collapsed ? '➡️' : '⬅️'}</span>
              {!collapsed ? <span>Collapse</span> : null}
            </button>
          ) : null}

          {!collapsed || inDrawer ? (
            <div className="mt-3 text-center">
              <Link
                href="/privacy"
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.35)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)'
                }}
              >
                Privacy Policy
              </Link>
            </div>
          ) : null}
        </div>
      </aside>
    )
  }

  return (
    <>
      {/* Mobile hamburger */}
      <div className="md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            color: ACCENT,
          }}
          onClick={() => setDrawerOpen(true)}
        >
          ☰
        </button>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full">
              <SidebarPanel inDrawer />
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SidebarPanel inDrawer={false} />
      </div>
    </>
  )
}

