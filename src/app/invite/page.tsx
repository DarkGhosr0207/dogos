'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const APP_STORE_URL = 'https://apps.apple.com/app/dogos-dog-health-tracker/id6761737193'

function InvitePage() {
  const searchParams = useSearchParams()
  const dogId = searchParams.get('dogId') ?? ''
  const deepLink = dogId ? `dogos:///invite?dogId=${encodeURIComponent(dogId)}` : 'dogos:///'
  const [showButton, setShowButton] = useState(false)
  const attempted = useRef(false)

  useEffect(() => {
    if (!dogId || attempted.current) return
    attempted.current = true

    window.location.href = deepLink

    const timer = setTimeout(() => {
      setShowButton(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [deepLink, dogId])

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9f7', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', background: '#1a2e1f', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>🐾</span>
        <span style={{ color: '#ffffff', fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>DogOS</span>
      </div>

      <div style={{
        maxWidth: 420,
        width: '100%',
        margin: '48px 16px',
        background: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      }}>
        <div style={{ padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐶</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#111827' }}>
            You&rsquo;ve been invited!
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 15, color: '#6b7280', lineHeight: 1.6 }}>
            Open DogOS to accept your co-owner invite.
          </p>

          <a
            href={deepLink}
            style={{
              display: 'block',
              padding: '15px 28px',
              background: '#2d7a4f',
              color: '#ffffff',
              fontSize: 17,
              fontWeight: 700,
              borderRadius: 14,
              textDecoration: 'none',
              marginBottom: 16,
              opacity: showButton || !dogId ? 1 : 0.5,
              transition: 'opacity 0.4s',
            }}
          >
            Open in DogOS
          </a>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 24, marginTop: 8 }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#9ca3af' }}>
              Don&rsquo;t have DogOS yet?
            </p>
            <a
              href={APP_STORE_URL}
              style={{
                display: 'inline-block',
                padding: '11px 22px',
                background: '#111827',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                textDecoration: 'none',
              }}
            >
              📱 Download on the App Store
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InvitePageWrapper() {
  return (
    <Suspense>
      <InvitePage />
    </Suspense>
  )
}
