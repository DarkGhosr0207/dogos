'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DogDocData = {
  id: string
  name: string
  microchip_id: string | null
  passport_number: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
}

const ACCENT = '#2d7a4f'

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }, [value])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium transition-colors"
      style={{ color: copied ? ACCENT : '#6b7280' }}
      title="Copy to clipboard"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function DocumentsClient({ initialData }: { initialData: DogDocData | null }) {
  const [data, setData] = useState<DogDocData | null>(initialData)
  const [form, setForm] = useState({
    microchip_id: initialData?.microchip_id ?? '',
    passport_number: initialData?.passport_number ?? '',
    insurance_provider: initialData?.insurance_provider ?? '',
    insurance_policy_number: initialData?.insurance_policy_number ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target
      setForm((prev) => ({ ...prev, [name]: value }))
    },
    [],
  )

  const handleSave = useCallback(async () => {
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('dogs')
        .update({
          microchip_id: form.microchip_id.trim() || null,
          passport_number: form.passport_number.trim() || null,
          insurance_provider: form.insurance_provider.trim() || null,
          insurance_policy_number: form.insurance_policy_number.trim() || null,
        })
        .eq('id', data.id)

      if (updateError) throw updateError

      setData((prev) =>
        prev
          ? {
              ...prev,
              microchip_id: form.microchip_id.trim() || null,
              passport_number: form.passport_number.trim() || null,
              insurance_provider: form.insurance_provider.trim() || null,
              insurance_policy_number: form.insurance_policy_number.trim() || null,
            }
          : prev,
      )

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }, [data, form])

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
          📄 Dog Documents
        </h1>
        <div className="mt-12 text-center">
          <p className="text-4xl">🐾</p>
          <p className="mt-3 text-sm font-medium" style={{ color: '#6b7280' }}>
            Add a dog first in My Dogs
          </p>
          <p className="mt-1 text-xs" style={{ color: '#9ca3af' }}>
            Once you add a dog, you can store their identity and insurance details here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
          📄 Dog Documents
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
          Identity and insurance details for {data.name}
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="mt-6 space-y-5">
        {/* Identity section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold" style={{ color: '#111827' }}>
            🔖 Identity
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                Microchip ID
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  name="microchip_id"
                  value={form.microchip_id}
                  onChange={handleChange}
                  placeholder="e.g. 985112345678901"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  style={{ color: '#111827' }}
                />
                {form.microchip_id ? <CopyButton value={form.microchip_id} /> : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                Passport number
              </label>
              <input
                type="text"
                name="passport_number"
                value={form.passport_number}
                onChange={handleChange}
                placeholder="e.g. DE123456"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                style={{ color: '#111827' }}
              />
            </div>
          </div>
        </div>

        {/* Insurance section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold" style={{ color: '#111827' }}>
            🛡️ Insurance
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                Insurance provider
              </label>
              <input
                type="text"
                name="insurance_provider"
                value={form.insurance_provider}
                onChange={handleChange}
                placeholder="e.g. PetPlan"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                style={{ color: '#111827' }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: '#374151' }}>
                Policy number
              </label>
              <input
                type="text"
                name="insurance_policy_number"
                value={form.insurance_policy_number}
                onChange={handleChange}
                placeholder="e.g. POL-9876543"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                style={{ color: '#111827' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity"
          style={{ backgroundColor: ACCENT, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
