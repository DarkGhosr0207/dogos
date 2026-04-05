import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — DogOS',
  description: 'How DogOS collects, uses, and protects your data.',
}

const accent = '#2d7a4f'
const accentLight = '#e8f5ed'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2
        style={{
          fontSize: '1.125rem',
          fontWeight: 700,
          color: accent,
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: `2px solid ${accentLight}`,
        }}
      >
        {title}
      </h2>
      <div style={{ color: '#374151', lineHeight: '1.75', fontSize: '0.9375rem' }}>
        {children}
      </div>
    </section>
  )
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', listStyleType: 'disc' }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: '0.3rem' }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f7f9f7',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* Nav bar */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🐾</span>
            <span style={{ fontWeight: 700, color: accent, fontSize: '1rem' }}>DogOS</span>
          </Link>
          <Link
            href="/"
            style={{
              fontSize: '0.875rem',
              color: accent,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
        {/* Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Last updated: April 2026
          </p>
          <p style={{ color: '#374151', lineHeight: '1.75', marginTop: '1rem', fontSize: '0.9375rem' }}>
            DogOS (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your privacy.
            This policy explains what personal data we collect, why we collect it, how we use it, and your rights over it.
            By using DogOS you agree to the practices described here.
          </p>
        </div>

        <Section title="1. Data We Collect">
          <p style={{ marginBottom: '0.75rem' }}>We collect the following categories of data:</p>

          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Account &amp; identity</p>
          <Ul items={['Email address', 'Full name (optional)', 'Country / locale preference']} />

          <p style={{ fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>Dog profile</p>
          <Ul
            items={[
              'Name, breed, date of birth, sex',
              'Body weight (kg)',
              'Profile photo',
              'Microchip ID and passport number',
              'Insurance provider and policy number',
            ]}
          />

          <p style={{ fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>Health &amp; activity data</p>
          <Ul
            items={[
              'Daily health logs: mood, appetite, energy level, stool quality',
              'Activity logs: type, duration, intensity',
              'Weight logs (home and vet weigh-ins)',
              'Symptom checks and AI triage results',
              'Vaccine records: type, date administered, next due date',
              'Vet visit records: clinic, date, reason, notes, next appointment',
              'Medical notes (free text)',
            ]}
          />

          <p style={{ fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>Device &amp; technical data</p>
          <Ul
            items={[
              'Expo push notification token (for local and remote reminders)',
              'Device platform (iOS / Android) — inferred from push token',
            ]}
          />
        </Section>

        <Section title="2. How We Use Your Data">
          <Ul
            items={[
              'Provide and personalise the DogOS health tracking experience',
              'Generate AI-powered insights, symptom triage, travel advice, and health reports — your dog\'s data is sent to the Anthropic Claude API for this purpose',
              'Schedule and deliver local and push notification reminders (vaccines, vet visits, daily logs)',
              'Send proactive health alerts by email when our system detects unusual patterns',
              'Display legal articles and answer legal questions relevant to your country',
              'Allow you to share your dog\'s public QR profile',
              'Improve the reliability and performance of DogOS',
            ]}
          />
          <p style={{ marginTop: '0.75rem' }}>
            We do <strong>not</strong> sell your personal data to third parties, use it for advertising, or share it beyond what is described in this policy.
          </p>
        </Section>

        <Section title="3. Third-Party Services">
          <p style={{ marginBottom: '0.75rem' }}>
            We use the following third-party services to operate DogOS. Each processes data only as necessary to provide the relevant functionality:
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: accentLight }}>
                  {['Service', 'Purpose', 'Data shared'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        fontWeight: 600,
                        color: accent,
                        borderBottom: `1px solid #b8ddc8`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Supabase', 'Database, authentication, file storage', 'All user and dog data'],
                  ['Anthropic (Claude API)', 'AI insights, symptom triage, travel advice, reports', 'Dog profile, health logs, symptoms'],
                  ['Resend', 'Transactional and alert emails', 'Email address, alert content'],
                  ['Expo (EAS)', 'Push notification delivery', 'Push token, notification payload'],
                  ['Vercel', 'Web hosting and serverless functions', 'Request metadata (IP, headers)'],
                ].map(([service, purpose, data], i) => (
                  <tr
                    key={service}
                    style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f7f9f7' }}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#111827', borderBottom: '1px solid #e5e7eb' }}>{service}</td>
                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>{purpose}</td>
                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>{data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Anthropic&rsquo;s data use is governed by their{' '}
            <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: accent }}>
              Privacy Policy
            </a>
            . Data sent to Claude is not used to train Anthropic&rsquo;s models under our API agreement.
          </p>
        </Section>

        <Section title="4. Your Rights (GDPR &amp; similar laws)">
          <p style={{ marginBottom: '0.75rem' }}>
            If you are located in the EU, UK, or another jurisdiction with data protection laws, you have the following rights:
          </p>
          <Ul
            items={[
              'Access — request a copy of the personal data we hold about you',
              'Rectification — ask us to correct inaccurate or incomplete data',
              'Erasure — request deletion of your account and all associated data',
              'Portability — receive your data in a structured, machine-readable format',
              'Restriction — ask us to limit processing of your data in certain circumstances',
              'Objection — object to processing based on legitimate interests',
            ]}
          />
          <p style={{ marginTop: '0.75rem' }}>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@dogos.app" style={{ color: accent, fontWeight: 600 }}>
              privacy@dogos.app
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your data for as long as your account is active. If you delete your account,
            all personal data — including your dog profile, health logs, and any uploaded files — will
            be permanently deleted from our systems within <strong>30 days</strong>.
            Anonymised, aggregated statistics may be retained indefinitely.
          </p>
        </Section>

        <Section title="6. Security">
          <p>
            All data is encrypted in transit using TLS and encrypted at rest via Supabase&rsquo;s
            AES-256 encryption. We use row-level security (RLS) policies to ensure users can only
            access their own data. We perform regular security reviews and follow responsible
            disclosure practices.
          </p>
        </Section>

        <Section title="7. Children">
          <p>
            DogOS is intended for users aged <strong>13 or older</strong>. We do not knowingly
            collect personal data from children under 13. If you believe a child under 13 has
            created an account, please contact us at{' '}
            <a href="mailto:privacy@dogos.app" style={{ color: accent }}>
              privacy@dogos.app
            </a>{' '}
            and we will delete the account promptly.
          </p>
        </Section>

        <Section title="8. Cookies &amp; Tracking">
          <p>
            The DogOS web app uses session cookies managed by Supabase for authentication only.
            We do not use advertising, analytics, or tracking cookies. The mobile app does not
            use cookies.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this policy from time to time. When we make material changes, we will
            update the &ldquo;Last updated&rdquo; date at the top of this page and, where appropriate,
            notify you by email. Continued use of DogOS after changes are posted constitutes
            acceptance of the updated policy.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            For privacy questions, data requests, or concerns, contact us at:
          </p>
          <div
            style={{
              marginTop: '0.75rem',
              padding: '1rem 1.25rem',
              backgroundColor: accentLight,
              borderRadius: '8px',
              borderLeft: `4px solid ${accent}`,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>DogOS</p>
            <p style={{ margin: '0.25rem 0 0' }}>
              <a href="mailto:privacy@dogos.app" style={{ color: accent, fontWeight: 600 }}>
                privacy@dogos.app
              </a>
            </p>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '0.8125rem',
        }}
      >
        © {new Date().getFullYear()} DogOS. All rights reserved.
      </footer>
    </div>
  )
}
