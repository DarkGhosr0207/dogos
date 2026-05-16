'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type CoOwner = {
  id: string
  invite_email: string
  role: string
  accepted_at: string | null
  user_id: string | null
  displayName: string
}

const ACCENT = '#2d7a4f'

function initials(email: string): string {
  const parts = email.split('@')[0]?.split(/[._-]/) ?? []
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

function RoleBadge({ accepted }: { accepted: boolean }) {
  return (
    <span
      style={{
        fontSize: 12, fontWeight: 600,
        padding: '3px 10px', borderRadius: 8,
        backgroundColor: accepted ? '#f0fdf4' : '#fff7ed',
        color: accepted ? ACCENT : '#f59e0b',
      }}
    >
      {accepted ? 'Active' : 'Pending'}
    </span>
  )
}

export default function CoOwnersClient({
  dogId,
  dogName,
  initialMembers,
}: {
  dogId: string | null
  dogName: string
  initialMembers: CoOwner[]
}) {
  const [members, setMembers] = useState<CoOwner[]>(initialMembers)
  const [showModal, setShowModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const refresh = useCallback(async () => {
    if (!dogId) return
    const { data } = await supabase
      .from('dog_members')
      .select('id, invite_email, role, accepted_at, user_id')
      .eq('dog_id', dogId)
      .order('accepted_at', { ascending: true, nullsFirst: false })

    const rows = (data ?? []) as CoOwner[]
    setMembers(rows.map((r) => ({ ...r, displayName: r.invite_email })))
  }, [dogId, supabase])

  async function onRemove(member: CoOwner) {
    if (!window.confirm(`Remove ${member.displayName} as co-owner?`)) return
    setRemovingId(member.id)
    try {
      await supabase.from('dog_members').delete().eq('id', member.id)
      await refresh()
    } finally {
      setRemovingId(null)
    }
  }

  async function onInvite() {
    if (!dogId) return
    const email = inviteEmail.trim().toLowerCase()
    if (!email.includes('@')) {
      setInviteError('Enter a valid email address')
      return
    }
    if (members.length >= 3) {
      setInviteError('Maximum 3 co-owners per dog')
      return
    }

    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch('/api/co-owners/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, inviteEmail: email }),
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setInviteError(json.error ?? 'Invite failed')
        return
      }
      setInviteSuccess(true)
      setInviteEmail('')
      setTimeout(() => {
        setShowModal(false)
        setInviteSuccess(false)
      }, 1500)
      await refresh()
    } finally {
      setInviting(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
        👥 Co-owners
      </h1>
      <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 }}>
        Invite family or friends to track feeding and health data for{' '}
        <strong style={{ color: '#111827' }}>{dogName}</strong>.
        Up to 3 co-owners per dog.
      </p>

      {!dogId ? (
        <div style={cardStyle}>
          <p style={{ color: '#6b7280' }}>Add a dog profile to manage co-owners.</p>
        </div>
      ) : (
        <>
          {/* Member list */}
          {members.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 24px', marginBottom: 16 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
              <p style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>No co-owners yet</p>
              <p style={{ fontSize: 14, color: '#6b7280' }}>
                Invite family or friends to track together
              </p>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              {members.map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px',
                    borderTop: idx > 0 ? '1px solid #f3f4f6' : undefined,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: ACCENT,
                  }}>
                    {initials(m.invite_email)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.displayName}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.invite_email}
                    </div>
                  </div>
                  <RoleBadge accepted={m.accepted_at !== null} />
                  <button
                    onClick={() => void onRemove(m)}
                    disabled={removingId === m.id}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 18, color: '#ef4444', padding: '4px 8px',
                      opacity: removingId === m.id ? 0.5 : 1,
                    }}
                    title="Remove"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Invite button */}
          <button
            onClick={() => { setInviteEmail(''); setInviteError(null); setInviteSuccess(false); setShowModal(true) }}
            disabled={members.length >= 3}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', height: 52, borderRadius: 12,
              backgroundColor: members.length >= 3 ? '#d1d5db' : ACCENT,
              color: '#fff', fontSize: 16, fontWeight: 600, border: 'none',
              cursor: members.length >= 3 ? 'not-allowed' : 'pointer',
            }}
          >
            {members.length >= 3 ? 'Max 3 co-owners reached' : '+ Invite co-owner'}
          </button>
        </>
      )}

      {/* Invite modal */}
      {showModal ? (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowModal(false)} />
          <div style={{
            position: 'relative', backgroundColor: '#fff', borderRadius: '20px 20px 0 0',
            padding: 24, paddingBottom: 40, width: '100%', maxWidth: 600,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                Invite co-owner
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              They&apos;ll receive an email invite with a deep link to join{' '}
              <strong>{dogName}</strong>&apos;s profile.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Email address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                autoCapitalize="none"
                autoCorrect="off"
                style={inputStyle}
              />
            </div>

            {inviteError ? <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{inviteError}</p> : null}
            {inviteSuccess ? <p style={{ fontSize: 13, color: ACCENT, margin: 0, fontWeight: 600 }}>✓ Invite sent!</p> : null}

            <button
              onClick={() => void onInvite()}
              disabled={inviting || !inviteEmail.trim()}
              style={{
                height: 52, borderRadius: 12,
                backgroundColor: inviting || !inviteEmail.trim() ? '#86efac' : ACCENT,
                color: '#fff', fontSize: 16, fontWeight: 600, border: 'none',
                cursor: inviting || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {inviting ? 'Sending…' : 'Send invite'}
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
