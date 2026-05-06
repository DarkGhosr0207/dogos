'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DogOption = { id: string; name: string }
export type VetVisitRow = {
  id: string
  dog_id: string
  visit_date: string | null
  clinic_name: string | null
  reason: string | null
  notes: string | null
  next_visit_date: string | null
}

const ACCENT = '#2d7a4f'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function nextVisitBadge(nextDate: string | null): { label: string; bg: string; text: string } | null {
  if (!nextDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(nextDate + 'T00:00:00')
  const diffMs = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: 'Overdue', bg: '#fee2e2', text: '#991b1b' }
  if (diffDays <= 30) return { label: 'Due soon', bg: '#fef9c3', text: '#a16207' }
  return null
}

type FormState = {
  dog_id: string
  clinic_name: string
  visit_date: string
  reason: string
  notes: string
  next_visit_date: string
}

const emptyForm = (defaultDogId: string): FormState => ({
  dog_id: defaultDogId,
  clinic_name: '',
  visit_date: '',
  reason: '',
  notes: '',
  next_visit_date: '',
})

export default function VetVisitsClient({
  dogs,
  initialVisits,
}: {
  dogs: DogOption[]
  initialVisits: VetVisitRow[]
}) {
  const [visits, setVisits] = useState<VetVisitRow[]>(initialVisits)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm(dogs[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const dogNameById = Object.fromEntries(dogs.map((d) => [d.id, d.name]))

  const openModal = useCallback(() => {
    setForm(emptyForm(dogs[0]?.id ?? ''))
    setError(null)
    setModalOpen(true)
  }, [dogs])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setError(null)
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      setForm((prev) => ({ ...prev, [name]: value }))
    },
    [],
  )

  const handleSave = useCallback(async () => {
    if (!form.clinic_name.trim()) {
      setError('Clinic name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload: Record<string, any> = {
        dog_id: form.dog_id,
        user_id: user.id,
        clinic_name: form.clinic_name.trim(),
        visit_date: form.visit_date || null,
        reason: form.reason.trim() || null,
        notes: form.notes.trim() || null,
        next_visit_date: form.next_visit_date || null,
      }

      const { data, error: insertError } = await supabase
        .from('vet_visits')
        .insert(payload)
        .select('id, dog_id, visit_date, clinic_name, reason, notes, next_visit_date')
        .single()

      if (insertError) throw insertError

      const newVisit: VetVisitRow = {
        id: String(data.id),
        dog_id: String(data.dog_id),
        visit_date: data.visit_date ? String(data.visit_date) : null,
        clinic_name: data.clinic_name ? String(data.clinic_name) : null,
        reason: data.reason ? String(data.reason) : null,
        notes: data.notes ? String(data.notes) : null,
        next_visit_date: data.next_visit_date ? String(data.next_visit_date) : null,
      }

      setVisits((prev) => [newVisit, ...prev])
      setModalOpen(false)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save visit.')
    } finally {
      setSaving(false)
    }
  }, [form])

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error: delError } = await supabase.from('vet_visits').delete().eq('id', id)
      if (delError) throw delError
      setVisits((prev) => prev.filter((v) => v.id !== id))
      setDeleteConfirm(null)
    } catch (err: any) {
      // show inline error — reset confirm so user can retry
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
            📅 Vet Visits
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
            Track clinic appointments and schedule follow-ups
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          + Log visit
        </button>
      </div>

      {/* List */}
      {visits.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-4xl">📅</p>
          <p className="mt-3 text-sm font-medium" style={{ color: '#6b7280' }}>
            No vet visits logged yet
          </p>
          <p className="mt-1 text-xs" style={{ color: '#9ca3af' }}>
            Tap &quot;Log visit&quot; to record your first appointment.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visits.map((v) => {
            const badge = nextVisitBadge(v.next_visit_date)
            return (
              <div
                key={v.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold" style={{ color: '#111827' }}>
                      {v.clinic_name ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: '#6b7280' }}>
                      {dogs.length > 1 ? `${dogNameById[v.dog_id] ?? 'Dog'} · ` : ''}
                      {formatDate(v.visit_date)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(v.id)}
                    className="text-xs font-medium"
                    style={{ color: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>

                {v.reason ? (
                  <p className="mt-2 text-sm" style={{ color: '#374151' }}>
                    <span className="font-medium">Reason:</span> {v.reason}
                  </p>
                ) : null}

                {v.notes ? (
                  <p className="mt-1 text-sm" style={{ color: '#374151' }}>
                    <span className="font-medium">Notes:</span> {v.notes}
                  </p>
                ) : null}

                {v.next_visit_date ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs" style={{ color: '#6b7280' }}>
                      Next visit: {formatDate(v.next_visit_date)}
                    </p>
                    {badge ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mx-4">
            <h3 className="text-base font-semibold" style={{ color: '#111827' }}>
              Delete visit?
            </h3>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: '#ef4444', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add visit modal */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="mx-auto mt-20 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl mb-20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
                Log vet visit
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-xl font-medium leading-none"
                style={{ color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {/* Dog selector */}
              {dogs.length > 1 ? (
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                    Dog
                  </label>
                  <select
                    name="dog_id"
                    value={form.dog_id}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    style={{ color: '#111827' }}
                  >
                    {dogs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Clinic name */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Clinic name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="clinic_name"
                  value={form.clinic_name}
                  onChange={handleChange}
                  placeholder="e.g. City Vet Clinic"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Visit date */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Visit date
                </label>
                <input
                  type="date"
                  name="visit_date"
                  value={form.visit_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Reason
                </label>
                <input
                  type="text"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="e.g. Annual checkup"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Vet's observations, prescribed treatments…"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827', resize: 'vertical' }}
                />
              </div>

              {/* Next visit date */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Next visit date (optional)
                </label>
                <input
                  type="date"
                  name="next_visit_date"
                  value={form.next_visit_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: ACCENT, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : 'Save visit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
