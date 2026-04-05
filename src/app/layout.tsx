import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'DogOS — Pet Health Manager',
  description: "Your dog's health companion",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      style={{ colorScheme: 'light' }}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f7f9f7] text-gray-900">
        <div className="flex min-h-full flex-col">
          <main className="flex-1">{children}</main>
          <footer
            style={{
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              fontSize: '0.8125rem',
              color: '#9ca3af',
            }}
          >
            <span>© {new Date().getFullYear()} DogOS</span>
            <Link href="/privacy" style={{ color: '#2d7a4f', textDecoration: 'none', fontWeight: 500 }}>
              Privacy Policy
            </Link>
            <a href="mailto:privacy@dogos.app" style={{ color: '#9ca3af', textDecoration: 'none' }}>
              privacy@dogos.app
            </a>
          </footer>
        </div>
      </body>
    </html>
  )
}
