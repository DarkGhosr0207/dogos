import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use — DogOS',
  description: 'Terms and conditions for using DogOS.',
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

export default function TermsPage() {
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
            Terms of Use
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Last updated: May 2026
          </p>
          <p style={{ color: '#374151', lineHeight: '1.75', marginTop: '1rem', fontSize: '0.9375rem' }}>
            These Terms of Use (&ldquo;Terms&rdquo;) govern your use of the DogOS mobile application and
            related services (&ldquo;Service&rdquo;) operated by DogOS (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;).
            By downloading or using DogOS, you agree to be bound by these Terms.
            If you do not agree, do not use the Service.
          </p>
        </div>

        <Section title="1. Eligibility">
          <p>
            You must be at least <strong>13 years old</strong> to use DogOS. By using the Service,
            you represent that you meet this requirement. If you are under 18, you confirm that a
            parent or legal guardian has reviewed and agreed to these Terms on your behalf.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p style={{ marginBottom: '0.75rem' }}>
            DogOS is a dog health tracking application that provides:
          </p>
          <Ul
            items={[
              'Daily health logging (mood, appetite, energy, stool quality)',
              'Activity and weight tracking',
              'Vaccine and vet visit records',
              'AI-powered health insights, symptom triage, and travel advice',
              'Legal hub with AI Q&A',
              'Push notification reminders for medications, vaccines, and daily logs',
            ]}
          />
          <p style={{ marginTop: '0.75rem' }}>
            DogOS is intended for informational purposes only and does <strong>not</strong> constitute
            veterinary advice. Always consult a qualified veterinarian for medical decisions regarding
            your dog.
          </p>
        </Section>

        <Section title="3. Account Registration">
          <p>
            You must create an account to use DogOS. You are responsible for maintaining the
            confidentiality of your login credentials and for all activity that occurs under your
            account. Notify us immediately at{' '}
            <a href="mailto:support@dogos.com" style={{ color: accent, fontWeight: 600 }}>
              support@dogos.com
            </a>{' '}
            if you suspect unauthorised access to your account.
          </p>
        </Section>

        <Section title="4. Subscriptions and Billing">
          <p style={{ marginBottom: '0.75rem' }}>
            DogOS offers free and paid subscription tiers. Paid subscriptions are processed exclusively
            through the <strong>Apple App Store</strong> using auto-renewable in-app purchases.
          </p>

          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Subscription plans</p>
          <Ul
            items={[
              'Free — basic health tracking at no cost',
              'Premium — €9.99 / month, billed monthly via the App Store',
              'Premium+ — €19.99 / month, billed monthly via the App Store',
            ]}
          />

          <p style={{ fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>Auto-renewal</p>
          <p>
            Paid subscriptions automatically renew at the end of each billing period unless cancelled.
            Your Apple ID will be charged within 24 hours before the end of the current period.
            Subscription management and cancellation are handled through your Apple ID account settings.
          </p>

          <p style={{ fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>Cancellation</p>
          <p>
            To avoid being charged for the next period, you must cancel your subscription at least{' '}
            <strong>24 hours before</strong> the renewal date. Cancellation takes effect at the end
            of the current paid period — you retain access to premium features until then.
            Cancelling does not delete your account or data.
          </p>

          <p style={{ fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>Free trial</p>
          <p>
            If a free trial is offered, it will be clearly indicated at the time of purchase.
            Any unused portion of a free trial is forfeited upon purchasing a subscription.
          </p>

          <p style={{ fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>Price changes</p>
          <p>
            We reserve the right to change subscription prices. We will notify you in advance of
            any price change. Continued use after the new price takes effect constitutes acceptance.
          </p>
        </Section>

        <Section title="5. Refund Policy">
          <p>
            All purchases are processed by Apple and are subject to Apple&rsquo;s refund policy.
            We do not offer refunds directly. If you believe you are entitled to a refund, please
            contact Apple Support at{' '}
            <a
              href="https://reportaproblem.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent }}
            >
              reportaproblem.apple.com
            </a>
            . We have no ability to issue refunds outside of Apple&rsquo;s process.
          </p>
        </Section>

        <Section title="6. Restore Purchases">
          <p>
            If you reinstall DogOS or switch devices, you can restore your active subscription using
            the &ldquo;Restore purchases&rdquo; option in the app. You must be signed in to the same Apple ID
            that was used to make the original purchase.
          </p>
        </Section>

        <Section title="7. Acceptable Use">
          <p style={{ marginBottom: '0.75rem' }}>You agree not to:</p>
          <Ul
            items={[
              'Use the Service for any unlawful purpose or in violation of these Terms',
              'Attempt to reverse-engineer, decompile, or extract source code from the app',
              'Introduce malware, viruses, or any code designed to disrupt the Service',
              'Use automated tools to scrape or access the Service without our written consent',
              'Share your account credentials with others or create accounts on behalf of third parties',
              'Submit false, misleading, or harmful content through the Service',
            ]}
          />
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            All content, design, code, trademarks, and materials in DogOS are the exclusive property
            of DogOS or its licensors. Your use of the Service does not grant you any ownership rights.
            You may not reproduce, distribute, or create derivative works from any part of the Service
            without our prior written consent.
          </p>
        </Section>

        <Section title="9. User Content">
          <p>
            You retain ownership of the content you submit to DogOS (such as your dog&rsquo;s health data
            and photos). By submitting content, you grant us a limited, non-exclusive licence to store
            and process it solely for the purpose of providing the Service to you. We do not claim
            ownership of your data and will not use it for any other purpose.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p style={{ marginBottom: '0.75rem' }}>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
            express or implied. We do not warrant that:
          </p>
          <Ul
            items={[
              'The Service will be uninterrupted, error-free, or secure',
              'Any AI-generated content (insights, triage results, reports) is accurate, complete, or suitable for any particular purpose',
              'The Service will meet your specific requirements',
            ]}
          />
          <p style={{ marginTop: '0.75rem' }}>
            <strong>AI-generated content is not veterinary advice.</strong> Always consult a licensed
            veterinarian before making health decisions for your dog.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, DogOS shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including loss of data,
            loss of revenue, or harm to your dog arising from your use of or inability to use the
            Service. Our total liability to you for any claim shall not exceed the amount you paid us
            in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="12. Termination">
          <p>
            We reserve the right to suspend or terminate your account at any time if you violate
            these Terms or engage in conduct that we determine, at our sole discretion, is harmful
            to the Service or other users. You may delete your account at any time from within the
            app. Upon deletion, your data will be permanently removed within 30 days in accordance
            with our{' '}
            <Link href="/privacy" style={{ color: accent, fontWeight: 600 }}>
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="13. Changes to These Terms">
          <p>
            We may update these Terms from time to time. When we make material changes, we will
            update the &ldquo;Last updated&rdquo; date at the top of this page and, where appropriate, notify
            you by email or in-app notification. Continued use of DogOS after changes are posted
            constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="14. Governing Law">
          <p>
            These Terms are governed by and construed in accordance with the laws of{' '}
            <strong>Germany</strong>, without regard to its conflict of law provisions. Any disputes
            arising from these Terms or your use of the Service shall be subject to the exclusive
            jurisdiction of the courts of Germany. If you are a consumer in the EU, you also have
            the right to bring proceedings in the courts of the country where you reside.
          </p>
        </Section>

        <Section title="15. Contact">
          <p>
            If you have questions about these Terms, please contact us at:
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
              <a href="mailto:support@dogos.com" style={{ color: accent, fontWeight: 600 }}>
                support@dogos.com
              </a>
            </p>
          </div>

          <p style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
            For privacy-related inquiries, see our{' '}
            <Link href="/privacy" style={{ color: accent }}>
              Privacy Policy
            </Link>
            .
          </p>
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
