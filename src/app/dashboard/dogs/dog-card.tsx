'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDog, uploadDogPhoto } from './actions'
import type { CSSProperties } from 'react'

export type DogCardDog = {
  id: string
  name: string
  breed: string | null
  date_of_birth: string | null
  photo_url?: string | null
}

type DogCardProps = {
  dog: DogCardDog
  ageLabel: string
}

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const avatarStyle: CSSProperties = {
  backgroundColor: '#dcfce7',
  color: '#16a34a',
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '18px',
  flexShrink: 0,
}

const nameStyle: CSSProperties = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 600,
}

const pillStyle: CSSProperties = {
  backgroundColor: '#f3f4f6',
  color: '#374151',
  fontSize: '12px',
  padding: '4px 10px',
  borderRadius: '20px',
}

export default function DogCard({ dog, ageLabel }: DogCardProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const initial = dog.name.trim().charAt(0).toUpperCase() || '?'

  async function onUpload(file: File) {
    setUploading(true)
    try {
      const res = await uploadDogPhoto(dog.id, file)
      if (!res.success) {
        alert(res.error)
        return
      }
      router.refresh()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onDelete() {
    if (!confirm(`Remove ${dog.name} from your list?`)) return
    setPending(true)
    try {
      const result = await deleteDog(dog.id)
      if (!result.ok) {
        alert(result.error)
        return
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <li style={cardStyle}>
      <div className="flex items-start">
        <div className="relative">
          {dog.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dog.photo_url}
              alt={`${dog.name} photo`}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div style={avatarStyle} aria-hidden>
              {initial}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-50"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#2d7a4f',
              cursor: 'pointer',
            }}
            aria-label={`Upload photo for ${dog.name}`}
            title="Upload photo"
          >
            {uploading ? '…' : '📷'}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              void onUpload(f)
            }}
          />
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <h2 style={nameStyle}>{dog.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span style={pillStyle}>
              {dog.breed?.trim() ? dog.breed : 'Breed unknown'}
            </span>
            <span style={pillStyle}>{ageLabel}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onDelete()}
          disabled={pending || uploading}
          className="ml-auto shrink-0 text-sm transition-colors disabled:opacity-50"
          style={{ color: '#f87171' }}
          aria-label={`Delete ${dog.name}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </button>
      </div>
    </li>
  )
}
