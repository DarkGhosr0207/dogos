'use client'

import { useState } from 'react'

const accent = '#2d7a4f'

export default function FoundForm({
  dogId,
  triggerVariant = 'button',
}: {
  dogId: string
  triggerVariant?: 'button' | 'link'
}) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/found-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, finderPhone: phone.trim(), finderMessage: message.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error ?? 'Something went wrong')
      }
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={styles.successBox}>
        <div style={styles.successIcon}>✓</div>
        <p style={styles.successTitle}>Owner notified!</p>
        <p style={styles.successSub}>Thank you for helping bring this dog home.</p>
      </div>
    )
  }

  if (!open) {
    if (triggerVariant === 'link') {
      return (
        <button style={styles.linkTrigger} onClick={() => setOpen(true)}>
          I found this dog →
        </button>
      )
    }
    return (
      <button style={styles.mainBtn} onClick={() => setOpen(true)}>
        I found this dog!
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <p style={styles.formTitle}>Let the owner know</p>
      <label style={styles.label}>Your phone number (optional)</label>
      <input
        type="tel"
        placeholder="+49 123 456 7890"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={styles.input}
      />
      <label style={styles.label}>Message</label>
      <textarea
        placeholder="Where did you find the dog? Any other details…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        style={{ ...styles.input, resize: 'vertical' as const }}
      />
      {err && <p style={styles.errText}>{err}</p>}
      <div style={styles.formRow}>
        <button
          type="button"
          style={styles.cancelBtn}
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" style={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Sending…' : 'Submit'}
        </button>
      </div>
    </form>
  )
}

const styles = {
  mainBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    backgroundColor: accent,
    color: '#fff',
    fontSize: '17px',
    fontWeight: '700' as const,
    border: 'none',
    cursor: 'pointer',
    marginTop: '8px',
  },
  form: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#111827',
    margin: 0,
  },
  label: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500' as const,
    marginBottom: '2px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e5e7eb',
    fontSize: '15px',
    color: '#111827',
    backgroundColor: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  errText: {
    color: '#dc2626',
    fontSize: '13px',
    margin: 0,
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
  cancelBtn: {
    flex: 1,
    padding: '13px',
    borderRadius: '12px',
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#fff',
    fontSize: '15px',
    fontWeight: '600' as const,
    color: '#374151',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    padding: '13px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: accent,
    color: '#fff',
    fontSize: '15px',
    fontWeight: '700' as const,
    cursor: 'pointer',
  },
  successBox: {
    marginTop: '16px',
    padding: '24px',
    borderRadius: '14px',
    backgroundColor: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    textAlign: 'center' as const,
  },
  successIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: accent,
    color: '#fff',
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  successTitle: {
    fontSize: '18px',
    fontWeight: '700' as const,
    color: '#111827',
    margin: '0 0 6px',
  },
  successSub: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  linkTrigger: {
    background: 'none',
    border: 'none',
    padding: '8px 0 0',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#6b7280',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
}
