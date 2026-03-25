'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDog, type CreateDogFieldErrors } from './actions'

type AddDogFormProps = {
  onClose: () => void
}

const emptyErrors: CreateDogFieldErrors = {}

export default function AddDogForm({ onClose }: AddDogFormProps) {
  const router = useRouter()
  const [fieldErrors, setFieldErrors] =
    useState<CreateDogFieldErrors>(emptyErrors)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(formData: FormData) {
    setPending(true)
    setFieldErrors(emptyErrors)
    setFormError(null)

    try {
      const result = await createDog(formData)

      if (result.ok) {
        router.refresh()
        onClose()
        return
      }

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      }

      if (result.error) {
        setFormError(result.error)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-dog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-neutral-900 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="add-dog-title" className="text-lg font-semibold text-white">
            Add dog
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {formError ? (
          <p className="mb-4 text-sm text-red-400" role="alert">
            {formError}
          </p>
        ) : null}

        <form action={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400" htmlFor="name">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              autoComplete="off"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
              placeholder="Buddy"
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm text-neutral-400" htmlFor="breed">
              Breed
            </label>
            <input
              id="breed"
              name="breed"
              autoComplete="off"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
            />
            {fieldErrors.breed ? (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.breed}</p>
            ) : null}
          </div>

          <div>
            <label
              className="block text-sm text-neutral-400"
              htmlFor="date_of_birth"
            >
              Date of birth
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-neutral-50 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:invert"
            />
            {fieldErrors.date_of_birth ? (
              <p className="mt-1 text-xs text-red-400">
                {fieldErrors.date_of_birth}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm text-neutral-400" htmlFor="sex">
              Sex
            </label>
            <select
              id="sex"
              name="sex"
              defaultValue=""
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-neutral-50 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {fieldErrors.sex ? (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.sex}</p>
            ) : null}
          </div>

          <div>
            <label
              className="block text-sm text-neutral-400"
              htmlFor="weight_kg"
            >
              Weight (kg)
            </label>
            <input
              id="weight_kg"
              name="weight_kg"
              type="number"
              step="0.1"
              min="0"
              autoComplete="off"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
            />
            {fieldErrors.weight_kg ? (
              <p className="mt-1 text-xs text-red-400">
                {fieldErrors.weight_kg}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="block text-sm text-neutral-400"
              htmlFor="microchip_id"
            >
              Microchip ID
            </label>
            <input
              id="microchip_id"
              name="microchip_id"
              autoComplete="off"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
            />
            {fieldErrors.microchip_id ? (
              <p className="mt-1 text-xs text-red-400">
                {fieldErrors.microchip_id}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save dog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
