'use client'

import type { CSSProperties } from 'react'

const card: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '32px',
  maxWidth: '420px',
  margin: '0 auto',
  textAlign: 'center',
}

const btn: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  width: '100%',
  marginTop: '20px',
}

export default function InsightsUpgrade() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <div style={card}>
        <div className="mb-3 text-4xl" aria-hidden>
          👑
        </div>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>
          AI Health Insights
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
          Premium+ feature — get weekly AI analysis of your dog&apos;s health data
        </p>
        <ul className="mt-6 space-y-3 text-left text-sm" style={{ color: '#374151' }}>
          <li>📊 Analysis of weight, activity and health trends</li>
          <li>🎯 Personalized recommendations from Claude AI</li>
          <li>⚠️ Early warning signs detection</li>
          <li>📋 Vet visit recommendations</li>
        </ul>
        <p className="mt-6 text-base font-semibold" style={{ color: '#111827' }}>
          €20/month — Premium+
        </p>
        <button type="button" style={btn} onClick={() => {}}>
          Upgrade to Premium+
        </button>
      </div>
    </div>
  )
}
