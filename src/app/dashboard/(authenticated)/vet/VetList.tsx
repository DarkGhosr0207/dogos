'use client'

import { useMemo, useState } from 'react'

export type VetRow = {
  id: string
  name: string
  clinic_name: string | null
  country: string | null
  city: string | null
  address: string | null
  phone: string | null
  website: string | null
  languages: string[] | null
  specializations: string[] | null
  is_emergency_24h: boolean | null
  is_verified: boolean | null
  rating: number | null
}

type VetListProps = {
  vets: VetRow[]
}

type FilterKey = 'all' | 'emergency' | 'english'

const pageTitleStyle = { color: '#111827', fontSize: '24px', fontWeight: 700 } as const
const pageSubtitleStyle = { color: '#6b7280', fontSize: '14px' } as const

const inputStyle = {
  width: '100%',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '12px 14px',
  color: '#111827',
  outline: 'none',
} as const

const filterBtnBase = {
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  borderRadius: '9999px',
  padding: '8px 12px',
  fontSize: '13px',
  cursor: 'pointer',
  color: '#374151',
} as const

const filterBtnActive = {
  border: '1px solid #2d7a4f',
  backgroundColor: '#dcfce7',
  color: '#166534',
  fontWeight: 600,
} as const

const cardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
} as const

const badgeBase = {
  display: 'inline-block',
  fontSize: '12px',
  padding: '4px 10px',
  borderRadius: '9999px',
  backgroundColor: '#f3f4f6',
  color: '#374151',
} as const

const badgeGreen = {
  ...badgeBase,
  backgroundColor: '#e8f5ed',
  color: '#2d7a4f',
} as const

const badgeEmergency = {
  ...badgeBase,
  backgroundColor: '#fffbeb',
  color: '#b45309',
} as const

const primaryBtn = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '8px 12px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

const secondaryBtn = {
  backgroundColor: '#ffffff',
  color: '#2d7a4f',
  padding: '8px 12px',
  borderRadius: '10px',
  fontWeight: 600,
  border: '1px solid #e5e7eb',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

function hasEnglish(languages: string[] | null | undefined): boolean {
  const list = languages ?? []
  return list.some((l) => {
    const n = normalize(l)
    return n === 'english' || n === 'en'
  })
}

export default function VetList({ vets }: VetListProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    const q = normalize(query)
    return vets.filter((v) => {
      const name = normalize(v.clinic_name ?? v.name ?? '')
      const city = normalize(v.city ?? '')
      const matches = !q || name.includes(q) || city.includes(q)

      const emergencyOk = filter !== 'emergency' || Boolean(v.is_emergency_24h)
      const englishOk = filter !== 'english' || hasEnglish(v.languages)

      return matches && emergencyOk && englishOk
    })
  }, [filter, query, vets])

  return (
    <div style={{ color: '#111827' }}>
      <h1 style={pageTitleStyle}>Find Vet</h1>
      <p className="mt-1" style={pageSubtitleStyle}>
        Search nearby clinics and filter by services.
      </p>

      <div className="mt-6 max-w-2xl space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by clinic name or city…"
          style={inputStyle}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              ...filterBtnBase,
              ...(filter === 'all' ? filterBtnActive : null),
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('emergency')}
            style={{
              ...filterBtnBase,
              ...(filter === 'emergency' ? filterBtnActive : null),
            }}
          >
            Emergency 24h
          </button>
          <button
            type="button"
            onClick={() => setFilter('english')}
            style={{
              ...filterBtnBase,
              ...(filter === 'english' ? filterBtnActive : null),
            }}
          >
            English speaking
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="mt-10 rounded-xl bg-white px-6 py-16 text-center text-sm shadow-sm"
          style={{ border: '1px dashed #e5e7eb', color: '#6b7280' }}
        >
          No vets found. Try a different search.
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const clinic = v.clinic_name?.trim() || v.name
            const city = v.city?.trim() || '—'
            const languages = (v.languages ?? []).filter(Boolean)
            const specializations = (v.specializations ?? []).filter(Boolean)
            const isEmergency = Boolean(v.is_emergency_24h)

            return (
              <li key={v.id} style={cardStyle}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      style={{
                        color: '#111827',
                        fontWeight: 700,
                        fontSize: '15px',
                        lineHeight: 1.25,
                      }}
                    >
                      {clinic}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
                      {city} · <span style={{ color: '#9ca3af' }}>— km</span>
                    </p>
                  </div>
                  {isEmergency ? (
                    <span style={badgeEmergency}>24h</span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {languages.length > 0 ? (
                    languages.slice(0, 3).map((l) => (
                      <span key={l} style={badgeGreen}>
                        {l}
                      </span>
                    ))
                  ) : (
                    <span style={badgeBase}>Languages: —</span>
                  )}
                </div>

                <div className="mt-3">
                  <p
                    style={{
                      color: '#374151',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Specializations
                  </p>
                  <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
                    {specializations.length > 0
                      ? specializations.slice(0, 4).join(' · ')
                      : '—'}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {v.phone ? (
                    <a href={`tel:${v.phone}`} style={primaryBtn}>
                      Call
                    </a>
                  ) : (
                    <button type="button" disabled style={{ ...primaryBtn, opacity: 0.5, cursor: 'not-allowed' }}>
                      Call
                    </button>
                  )}
                  {v.website ? (
                    <a
                      href={v.website}
                      target="_blank"
                      rel="noreferrer"
                      style={secondaryBtn}
                    >
                      Website
                    </a>
                  ) : (
                    <button type="button" disabled style={{ ...secondaryBtn, opacity: 0.5, cursor: 'not-allowed' }}>
                      Website
                    </button>
                  )}
                </div>

                {v.address ? (
                  <p className="mt-4 text-xs" style={{ color: '#9ca3af' }}>
                    {v.address}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
