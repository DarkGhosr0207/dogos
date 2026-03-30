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

export default function TravelUpgrade() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <div style={card}>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>
          ✈️ Travel Planner
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
          Plan international travel with your dog — get a complete checklist of documents,
          vaccines and timeline
        </p>
        <ul className="mt-6 space-y-3 text-left text-sm" style={{ color: '#374151' }}>
          <li>📋 Complete document checklist for any country</li>
          <li>💉 Required vaccinations and timing</li>
          <li>📅 Week-by-week preparation timeline</li>
          <li>⚠️ Breed-specific restrictions</li>
          <li>💰 Cost estimates</li>
        </ul>
        <p className="mt-6 text-base font-semibold" style={{ color: '#111827' }}>
          Available on Premium+ — €20/month
        </p>
        <button type="button" style={btn} onClick={() => {}}>
          Upgrade to Premium+
        </button>
      </div>
    </div>
  )
}
