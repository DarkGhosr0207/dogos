'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DogOption = { id: string; name: string }
export type MedicationRow = {
  id: string
  dog_id: string
  name: string
  dosage: string | null
  frequency: string | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  is_active: boolean
}

const ACCENT = '#2d7a4f'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function dateRange(start: string | null, end: string | null): string {
  const s = formatDate(start)
  const e = formatDate(end)
  if (s && e) return `${s} – ${e}`
  if (s) return `Started ${s}`
  if (e) return `Until ${e}`
  return ''
}

type FormState = {
  dog_id: string
  name: string
  dosage: string
  frequency: string
  start_date: string
  end_date: string
  notes: string
}

const emptyForm = (defaultDogId: string): FormState => ({
  dog_id: defaultDogId,
  name: '',
  dosage: '',
  frequency: '',
  start_date: '',
  end_date: '',
  notes: '',
})

export default function MedicationsClient({
  dogs,
  initialMedications,
}: {
  dogs: DogOption[]
  initialMedications: MedicationRow[]
}) {
  const [medications, setMedications] = useState<MedicationRow[]>(initialMedications)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm(dogs[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const dogNameById = Object.fromEntries(dogs.map((d) => [d.id, d.name]))

  const active = medications.filter((m) => m.is_active)
  const inactive = medications.filter((m) => !m.is_active)

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
    if (!form.name.trim()) {
      setError('Medication name is required.')
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
        name: form.name.trim(),
        dosage: form.dosage.trim() || null,
        frequency: form.frequency.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes.trim() || null,
        is_active: true,
      }

      const { data, error: insertError } = await supabase
        .from('medications')
        .insert(payload)
        .select('id, dog_id, name, dosage, frequency, start_date, end_date, notes, is_active')
        .single()

      if (insertError) throw insertError

      const newMed: MedicationRow = {
        id: String(data.id),
        dog_id: String(data.dog_id),
        name: String(data.name),
        dosage: data.dosage ? String(data.dosage) : null,
        frequency: data.frequency ? String(data.frequency) : null,
        start_date: data.start_date ? String(data.start_date) : null,
        end_date: data.end_date ? String(data.end_date) : null,
        notes: data.notes ? String(data.notes) : null,
        is_active: data.is_active !== false,
      }

      setMedications((prev) => [newMed, ...prev])
      setModalOpen(false)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save medication.')
    } finally {
      setSaving(false)
    }
  }, [form])

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error: delError } = await supabase.from('medications').delete().eq('id', id)
      if (delError) throw delError
      setMedications((prev) => prev.filter((m) => m.id !== id))
      setDeleteConfirm(null)
    } catch {
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }, [])

  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
    setTogglingId(id)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('medications')
        .update({ is_active: !currentActive })
        .eq('id', id)
      if (updateError) throw updateError
      setMedications((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_active: !currentActive } : m)),
      )
    } catch {
      // silently fail
    } finally {
      setTogglingId(null)
    }
  }, [])

  function MedCard({ med }: { med: MedicationRow }) {
    const range = dateRange(med.start_date, med.end_date)
    const toggling = togglingId === med.id
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold" style={{ color: '#111827' }}>
                {med.name}
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={
                  med.is_active
                    ? { backgroundColor: '#d1fae5', color: '#065f46' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                }
              >
                {med.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {dogs.length > 1 ? (
              <p className="mt-0.5 text-xs" style={{ color: '#6b7280' }}>
                {dogNameById[med.dog_id] ?? 'Dog'}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setDeleteConfirm(med.id)}
            className="text-xs font-medium"
            style={{ color: '#ef4444' }}
          >
            Delete
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {med.dosage ? (
            <p className="text-sm" style={{ color: '#374151' }}>
              <span className="font-medium">Dosage:</span> {med.dosage}
            </p>
          ) : null}
          {med.frequency ? (
            <p className="text-sm" style={{ color: '#374151' }}>
              <span className="font-medium">Frequency:</span> {med.frequency}
            </p>
          ) : null}
        </div>

        {range ? (
          <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>
            {range}
          </p>
        ) : null}

        {med.notes ? (
          <p className="mt-1 text-sm" style={{ color: '#374151' }}>
            <span className="font-medium">Notes:</span> {med.notes}
          </p>
        ) : null}

        {med.is_active ? (
          <button
            type="button"
            disabled={toggling}
            onClick={() => handleToggleActive(med.id, med.is_active)}
            className="mt-3 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium"
            style={{ color: '#6b7280', opacity: toggling ? 0.5 : 1 }}
          >
            {toggling ? 'Updating…' : 'Mark inactive'}
          </button>
        ) : (
          <button
            type="button"
            disabled={toggling}
            onClick={() => handleToggleActive(med.id, med.is_active)}
            className="mt-3 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium"
            style={{ color: ACCENT, opacity: toggling ? 0.5 : 1 }}
          >
            {toggling ? 'Updating…' : 'Mark active'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
            💊 Medications
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
            Track prescriptions and ongoing treatments
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          + Add medication
        </button>
      </div>

      {/* Empty state */}
      {medications.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-4xl">💊</p>
          <p className="mt-3 text-sm font-medium" style={{ color: '#6b7280' }}>
            No medications logged yet
          </p>
          <p className="mt-1 text-xs" style={{ color: '#9ca3af' }}>
            Tap &quot;Add medication&quot; to start tracking treatments.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Active */}
          {active.length > 0 ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
                Active
              </h2>
              <div className="space-y-3">
                {active.map((m) => (
                  <MedCard key={m.id} med={m} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Past */}
          {inactive.length > 0 ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
                Past medications
              </h2>
              <div className="space-y-3">
                {inactive.map((m) => (
                  <MedCard key={m.id} med={m} />
                ))}
              </div>
            </div>
          ) : null}
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
              Delete medication?
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

      {/* Add medication modal */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="mx-auto mt-20 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl mb-20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
                Add medication
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

              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Medication name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Metacam"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Dosage
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={form.dosage}
                  onChange={handleChange}
                  placeholder="e.g. 5mg"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Frequency
                </label>
                <input
                  type="text"
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                  placeholder="e.g. twice daily"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Start date */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  Start date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* End date */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                  End date (optional)
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
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
                  placeholder="Additional instructions or observations…"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827', resize: 'vertical' }}
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
                {saving ? 'Saving…' : 'Save medication'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
