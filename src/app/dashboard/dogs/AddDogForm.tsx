'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDog, type CreateDogFieldErrors } from './actions'
import { inputClass } from '@/lib/ui'

type AddDogFormProps = {
  onClose: () => void
}

const emptyErrors: CreateDogFieldErrors = {}

const labelClass = 'block text-sm font-medium text-gray-700'

const primaryBtn =
  'w-full rounded-xl bg-[#2d7a4f] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#236040] disabled:opacity-50'
const secondaryBtn =
  'w-full rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:border-gray-300 disabled:opacity-50'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-dog-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id="add-dog-title" className="text-lg font-bold text-gray-900">
            Add dog
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {formError ? (
          <p className="mb-4 text-sm text-red-500" role="alert">
            {formError}
          </p>
        ) : null}

        <form action={submit} className="space-y-5">
          <div>
            <label className={labelClass} htmlFor="name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              autoComplete="off"
              disabled={pending}
              className={`mt-2 ${inputClass}`}
              placeholder="Buddy"
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="breed">
              Breed
            </label>
            <input
              id="breed"
              name="breed"
              autoComplete="off"
              disabled={pending}
              className={`mt-2 ${inputClass}`}
            />
            {fieldErrors.breed ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.breed}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="date_of_birth">
              Date of birth
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              disabled={pending}
              className={`mt-2 ${inputClass}`}
            />
            {fieldErrors.date_of_birth ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.date_of_birth}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="sex">
              Sex
            </label>
            <select
              id="sex"
              name="sex"
              defaultValue=""
              disabled={pending}
              className={`mt-2 ${inputClass}`}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {fieldErrors.sex ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.sex}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="weight_kg">
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
              className={`mt-2 ${inputClass}`}
            />
            {fieldErrors.weight_kg ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.weight_kg}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="microchip_id">
              Microchip ID
            </label>
            <input
              id="microchip_id"
              name="microchip_id"
              autoComplete="off"
              disabled={pending}
              className={`mt-2 ${inputClass}`}
            />
            {fieldErrors.microchip_id ? (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.microchip_id}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className={secondaryBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`${primaryBtn} mt-4`}
            >
              {pending ? 'Saving…' : 'Save dog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
