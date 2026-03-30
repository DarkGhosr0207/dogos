import type { Alert } from '@/lib/health-check'

function severityStyle(severity: Alert['severity']): { border: string; bg: string } {
  if (severity === 'high') return { border: '#ef4444', bg: '#fef2f2' }
  if (severity === 'medium') return { border: '#f59e0b', bg: '#fffbeb' }
  return { border: '#9ca3af', bg: '#f9fafb' }
}

export function buildAlertEmail(dogName: string, alerts: Alert[], userEmail: string): string {
  const items = alerts
    .map((a) => {
      const s = severityStyle(a.severity)
      return `
        <div style="border-left:4px solid ${s.border}; background:${s.bg}; padding:12px 14px; border-radius:10px; margin:12px 0;">
          <div style="font-size:12px; font-weight:600; color:#111827; margin-bottom:6px; text-transform:uppercase;">
            ${a.severity} alert
          </div>
          <div style="font-size:14px; color:#111827; line-height:1.4;">
            ${a.message}
          </div>
        </div>
      `
    })
    .join('')

  return `
  <div style="background:#f3f4f6; padding:24px 12px; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';">
    <div style="max-width:600px; margin:0 auto;">
      <div style="background:#1a2e1f; padding:18px 20px; border-radius:14px 14px 0 0;">
        <div style="color:#ffffff; font-size:20px; font-weight:800;">DogOS</div>
        <div style="color:#cfe3d4; font-size:13px; margin-top:2px;">Health Alerts</div>
      </div>
      <div style="background:#ffffff; padding:20px; border-radius:0 0 14px 14px; border:1px solid #e5e7eb; border-top:none;">
        <div style="font-size:14px; color:#111827; line-height:1.5;">
          Hi! Here's a health update for <strong>${dogName}</strong>:
        </div>
        ${items}
        <div style="margin-top:18px; font-size:13px; color:#374151;">
          Open DogOS to see full details and take action
        </div>
        <div style="margin-top:14px;">
          <a href="https://dogos.app/dashboard" style="display:inline-block; background:#2d7a4f; color:#ffffff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700; font-size:14px;">
            Open DogOS
          </a>
        </div>
        <div style="margin-top:18px; font-size:12px; color:#6b7280; line-height:1.4;">
          You're receiving this because you have Premium+ subscription.<br/>
          Manage notifications in your DogOS settings.
        </div>
        <div style="margin-top:10px; font-size:11px; color:#9ca3af;">
          Sent to ${userEmail}
        </div>
      </div>
    </div>
  </div>
  `.trim()
}

