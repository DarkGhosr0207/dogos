import { redirect } from 'next/navigation'

export default function InvitePage({
  searchParams
}: {
  searchParams: { dogId?: string }
}) {
  const dogId = searchParams.dogId ?? ''
  const deepLink = `dogos:///invite?dogId=${dogId}`
  const appStoreUrl = 'https://apps.apple.com/app/dogos-dog-health-tracker/id6761737193'

  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content={`0;url=${deepLink}`} />
      </head>
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '40px 20px', background: '#f7f9f7' }}>
        <div style={{ background: '#1a2e1f', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h1>🐾 DogOS</h1>
        </div>
        <h2>You've been invited!</h2>
        <p>Opening DogOS...</p>
        <a href={deepLink} style={{ display: 'block', background: '#2d7a4f', color: 'white', padding: '16px', borderRadius: '10px', textDecoration: 'none', marginBottom: '16px' }}>
          Open in DogOS
        </a>
        <a href={appStoreUrl} style={{ display: 'block', background: '#000', color: 'white', padding: '16px', borderRadius: '10px', textDecoration: 'none' }}>
          Download on the App Store
        </a>
      </body>
    </html>
  )
}
