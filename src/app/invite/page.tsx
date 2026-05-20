const APP_STORE_URL = 'https://apps.apple.com/app/dogos-dog-health-tracker/id6761737193'

export default function InvitePage({
  searchParams,
}: {
  searchParams: { dogId?: string }
}) {
  const dogId = searchParams.dogId ?? ''
  const deepLink = `dogos:///invite?dogId=${dogId}`

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>DogOS – You've been invited</title>
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f7f9f7', textAlign: 'center' }}>

        {/* Header */}
        <div style={{ background: '#1a2e1f', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px' }}>🐾</span>
          <span style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>DogOS</span>
        </div>

        {/* Card */}
        <div style={{ maxWidth: '420px', margin: '48px auto', background: '#ffffff', borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', overflow: 'hidden', padding: '32px 28px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐶</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: '#111827' }}>
            You&#39;ve been invited!
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#6b7280', lineHeight: 1.6 }}>
            Tap the button below to open DogOS and accept your co-owner invite.
          </p>

          <a
            href={deepLink}
            style={{
              display: 'block',
              background: '#2d7a4f',
              color: '#ffffff',
              padding: '16px 28px',
              borderRadius: '14px',
              textDecoration: 'none',
              fontSize: '17px',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            Open in DogOS
          </a>

          <p style={{ color: '#888', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
            Tap the button above in Safari to open the app
          </p>

          <button
            id="copy-btn"
            style={{
              marginTop: '12px',
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#6b7280',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Copy link
          </button>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '24px', marginTop: '24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#9ca3af' }}>
              Don&#39;t have DogOS yet?
            </p>
            <a
              href={APP_STORE_URL}
              style={{
                display: 'inline-block',
                background: '#111827',
                color: '#ffffff',
                padding: '12px 22px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              📱 Download on the App Store
            </a>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          var btn = document.getElementById('copy-btn');
          if (btn) {
            btn.addEventListener('click', function() {
              navigator.clipboard.writeText(${JSON.stringify(deepLink)})
                .then(function() { btn.textContent = '✓ Copied!'; })
                .catch(function() {});
            });
          }
        ` }} />
      </body>
    </html>
  )
}
