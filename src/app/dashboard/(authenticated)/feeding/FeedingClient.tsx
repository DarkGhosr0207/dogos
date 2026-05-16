'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type FeedingLog = {
  id: string
  dog_id: string
  user_id: string
  food_name: string | null
  grams: number | null
  fed_at: string
  notes: string | null
  feederName: string
}

const ACCENT = '#2d7a4f'

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

function statusColor(lastLog: FeedingLog | null): string {
  if (!lastLog) return '#f59e0b'
  const h = hoursAgo(lastLog.fed_at)
  if (h < 4) return '#22c55e'
  if (h < 6) return '#f59e0b'
  return '#ef4444'
}

function statusLabel(lastLog: FeedingLog | null, dogName: string): string {
  if (!lastLog) return `${dogName} not fed today`
  const h = hoursAgo(lastLog.fed_at)
  const time = formatTime(lastLog.fed_at)
  if (h >= 4) return `Fed ${Math.floor(h)}h ago · by ${lastLog.feederName}`
  return `${dogName} was last fed at ${time} by ${lastLog.feederName}`
}

type ModalState = {
  foodName: string
  grams: string
  time: string
  notes: string
}

const DEFAULT_MODAL: ModalState = { foodName: '', grams: '', time: '', notes: '' }

export default function FeedingClient({
  dogId,
  dogName,
  userId,
  initialLogs,
}: {
  dogId: string | null
  dogName: string
  userId: string
  initialLogs: FeedingLog[]
}) {
  const [logs, setLogs] = useState<FeedingLog[]>(initialLogs)
  const [showModal, setShowModal] = useState(false)
  const [modal, setModal] = useState<ModalState>(DEFAULT_MODAL)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const refresh = useCallback(async () => {
    if (!dogId) return
    setRefreshing(true)
    try {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('feeding_logs')
        .select('id, dog_id, user_id, food_name, grams, fed_at, notes')
        .eq('dog_id', dogId)
        .gte('fed_at', startOfDay.toISOString())
        .order('fed_at', { ascending: false })

      const rows = (data ?? []) as Array<{
        id: string; dog_id: string; user_id: string
        food_name: string | null; grams: number | null; fed_at: string; notes: string | null
      }>
      const ids = [...new Set(rows.map((r) => r.user_id))]
      let nameMap: Record<string, string> = {}
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('users_profile').select('id,full_name').in('id', ids)
        for (const p of (profiles as { id: string; full_name: string | null }[] | null) ?? []) {
          nameMap[p.id] = p.full_name?.trim() || 'Someone'
        }
      }
      setLogs(rows.map((r) => ({ ...r, feederName: nameMap[r.user_id] ?? 'Someone' })))
    } finally {
      setRefreshing(false)
    }
  }, [dogId, supabase])

  async function onSave() {
    if (!dogId) return
    setSaveError(null)
    setSaving(true)
    try {
      let fedAt: string
      if (modal.time.trim()) {
        const [hStr, mStr] = modal.time.split(':')
        const h = parseInt(hStr ?? '0', 10)
        const m = parseInt(mStr ?? '0', 10)
        if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
          setSaveError('Invalid time (use HH:MM)')
          return
        }
        const d = new Date(); d.setHours(h, m, 0, 0)
        fedAt = d.toISOString()
      } else {
        fedAt = new Date().toISOString()
      }

      const gramsNum = modal.grams.trim() ? parseFloat(modal.grams) : null
      if (modal.grams.trim() && (gramsNum === null || Number.isNaN(gramsNum) || gramsNum < 0)) {
        setSaveError('Invalid grams value')
        return
      }

      const { error } = await supabase.from('feeding_logs').insert({
        dog_id: dogId,
        user_id: userId,
        food_name: modal.foodName.trim() || null,
        grams: gramsNum,
        fed_at: fedAt,
        notes: modal.notes.trim() || null,
      })
      if (error) { setSaveError(error.message); return }

      setShowModal(false)
      setModal(DEFAULT_MODAL)
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  const lastLog = logs[0] ?? null
  const dot = statusColor(lastLog)
  const label = statusLabel(lastLog, dogName)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 }}>
        🍖 Feeding tracker
      </h1>

      {!dogId ? (
        <div style={cardStyle}>
          <p style={{ color: '#6b7280' }}>Add a dog profile to start tracking feeding.</p>
        </div>
      ) : (
        <>
          {/* Status card */}
          <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: dot, flexShrink: 0 }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: '#111827', margin: 0 }}>{label}</p>
          </div>

          {/* Log button */}
          <button
            onClick={() => { setModal(DEFAULT_MODAL); setSaveError(null); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', height: 52, borderRadius: 12,
              backgroundColor: ACCENT, color: '#fff',
              fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
              marginBottom: 24,
            }}
          >
            + Log feeding
          </button>

          {/* Today's history */}
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
            Today&apos;s feedings
          </h2>
          {refreshing ? (
            <div style={cardStyle}><p style={{ color: '#6b7280' }}>Loading…</p></div>
          ) : logs.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 24px' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🍽️</p>
              <p style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>No feedings logged today</p>
              <p style={{ fontSize: 14, color: '#6b7280' }}>Tap &quot;Log feeding&quot; to record a meal</p>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {logs.map((log, idx) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 20px',
                    borderTop: idx > 0 ? '1px solid #f3f4f6' : undefined,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    🍖
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>
                      {formatTime(log.fed_at)}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      {[log.food_name, log.grams != null ? `${log.grams}g` : null, `by ${log.feederName}`]
                        .filter(Boolean).join(' · ')}
                    </div>
                    {log.notes ? (
                      <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{log.notes}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal ? (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
        }}>
          <div
            style={{ position: 'absolute', inset: 0 }}
            onClick={() => setShowModal(false)}
          />
          <div style={{
            position: 'relative', backgroundColor: '#fff', borderRadius: '20px 20px 0 0',
            padding: 24, paddingBottom: 40, width: '100%', maxWidth: 600,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                Log feeding — {dogName}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {(['Food name (optional)', 'Amount in grams', 'Time (HH:MM or blank for now)', 'Notes (optional)'] as const).map((lbl, i) => {
              const keys: (keyof ModalState)[] = ['foodName', 'grams', 'time', 'notes']
              const k = keys[i]!
              return (
                <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>{lbl}</label>
                  <input
                    type={k === 'grams' ? 'number' : 'text'}
                    value={modal[k]}
                    onChange={(e) => setModal((s) => ({ ...s, [k]: e.target.value }))}
                    placeholder={k === 'grams' ? '300' : k === 'time' ? '14:30' : ''}
                    style={inputStyle}
                  />
                </div>
              )
            })}

            {saveError ? <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{saveError}</p> : null}

            <button
              onClick={() => void onSave()}
              disabled={saving}
              style={{
                height: 52, borderRadius: 12, backgroundColor: saving ? '#86efac' : ACCENT,
                color: '#fff', fontSize: 16, fontWeight: 600, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4,
              }}
            >
              {saving ? 'Saving…' : 'Save feeding'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: '16px 20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10,
  border: '1px solid #e5e7eb',
  paddingLeft: 12, paddingRight: 12,
  fontSize: 15, color: '#111827',
  backgroundColor: '#f9fafb', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
