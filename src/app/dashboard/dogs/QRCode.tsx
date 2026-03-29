'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

function getSvgViewBoxDimensions(svg: SVGSVGElement): {
  x: number
  y: number
  w: number
  h: number
} {
  const vb = svg.getAttribute('viewBox')
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
    }
  }
  const w = parseFloat(svg.getAttribute('width') || '200')
  const h = parseFloat(svg.getAttribute('height') || '200')
  return { x: 0, y: 0, w, h }
}

const GREEN = '#2d7a4f'

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.45)',
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
}

const modalStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  maxWidth: '360px',
  width: '100%',
  border: '1px solid #e5e7eb',
}

type QRCodeProps = {
  dogId: string
  dogName: string
}

export default function QRCode({ dogId, dogName }: QRCodeProps) {
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState('')
  const qrSvgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const profileUrl = origin ? `${origin}/dashboard/dogs/${dogId}/profile` : ''

  const downloadPng = useCallback(() => {
    const wrap = document.getElementById(`qr-wrap-${dogId}`)
    const svg = wrap?.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 400
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        const safe = dogName.replace(/[^\w\s-]/g, '').trim() || 'dog'
        a.download = `${safe}-QR.png`
        a.click()
        URL.revokeObjectURL(a.href)
      }, 'image/png')
    }
    img.src = url
  }, [dogId, dogName])

  const downloadSvg = useCallback(() => {
    const svg = qrSvgRef.current
    if (!svg) return

    const clone = svg.cloneNode(true) as SVGSVGElement
    const { x, y, w, h } = getSvgViewBoxDimensions(clone)
    const padding = 24

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', String(x - padding))
    rect.setAttribute('y', String(y - padding))
    rect.setAttribute('width', String(w + 2 * padding))
    rect.setAttribute('height', String(h + 2 * padding))
    rect.setAttribute('fill', '#ffffff')

    clone.insertBefore(rect, clone.firstChild)
    clone.setAttribute(
      'viewBox',
      `${x - padding} ${y - padding} ${w + 2 * padding} ${h + 2 * padding}`,
    )
    clone.removeAttribute('width')
    clone.removeAttribute('height')
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(clone)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safe = dogName.replace(/[^\w\s-]/g, '').trim() || 'dog'
    a.download = `${safe}-QR.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [dogName])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          color: GREEN,
          cursor: 'pointer',
        }}
        aria-label={`QR code for ${dogName}`}
        title="Show QR code"
      >
        📱
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`qr-title-${dogId}`}
          style={overlayStyle}
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2
              id={`qr-title-${dogId}`}
              className="text-center text-lg font-semibold"
              style={{ color: '#111827' }}
            >
              {dogName}
            </h2>
            <p className="mt-1 text-center text-sm" style={{ color: '#6b7280' }}>
              Scan to see profile
            </p>
            <div id={`qr-wrap-${dogId}`} className="mt-4 flex justify-center">
              {profileUrl ? (
                <QRCodeSVG
                  ref={qrSvgRef}
                  value={profileUrl}
                  size={200}
                  level="M"
                  includeMargin
                  fgColor="#111827"
                  bgColor="#ffffff"
                />
              ) : null}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadPng}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={downloadSvg}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Download SVG
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                PNG for digital use · SVG for engraving and printing
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl border border-gray-200 py-2 text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
