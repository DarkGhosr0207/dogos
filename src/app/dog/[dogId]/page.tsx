import { createServiceClient } from '@/lib/supabase/service'
import Image from 'next/image'
import FoundForm from './FoundForm'

const accent = '#2d7a4f'
const danger = '#dc2626'

type Dog = {
  id: string
  name: string
  breed: string | null
  date_of_birth: string | null
  photo_url: string | null
  is_lost: boolean
  owner_contact_phone: string | null
  owner_contact_name: string | null
}

function dogAge(dob: string | null): string | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  months = Math.max(0, months)
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years <= 0) return `${Math.max(1, rem)}mo`
  if (rem === 0) return `${years}y`
  return `${years}y ${rem}mo`
}

function NotFound() {
  return (
    <Wrapper>
      <div style={styles.notFound}>
        <span style={{ fontSize: '48px' }}>🐾</span>
        <p style={styles.notFoundTitle}>Dog not found</p>
        <p style={styles.notFoundSub}>This QR code doesn&apos;t match any registered dog.</p>
      </div>
    </Wrapper>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>{children}</div>
      <p style={styles.footer}>Powered by DogOS</p>
    </div>
  )
}

export default async function PublicDogPage({
  params,
}: {
  params: Promise<{ dogId: string }>
}) {
  const { dogId } = await params

  const supabase = createServiceClient()
  if (!supabase) return <NotFound />

  const { data, error } = await supabase
    .from('dogs')
    .select(
      'id, name, breed, date_of_birth, photo_url, is_lost, owner_contact_phone, owner_contact_name',
    )
    .eq('id', dogId)
    .maybeSingle()

  if (error || !data) return <NotFound />

  const dog = data as Dog
  const age = dogAge(dog.date_of_birth)
  const meta = [dog.breed, age].filter(Boolean).join(' · ')

  return (
    <Wrapper>
      {/* Photo */}
      <div style={styles.photoWrap}>
        {dog.photo_url ? (
          <Image
            src={dog.photo_url}
            alt={dog.name}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <div style={styles.photoPlaceholder}>
            <span style={{ fontSize: '64px' }}>🐕</span>
          </div>
        )}
      </div>

      {/* Name + badges */}
      <div style={styles.nameRow}>
        <h1 style={styles.name}>{dog.name}</h1>
        {dog.is_lost && (
          <span style={styles.lostBadge}>LOST</span>
        )}
      </div>

      {meta ? <p style={styles.meta}>{meta}</p> : null}

      {/* Divider */}
      <div style={styles.divider} />

      {dog.is_lost ? (
        /* ── LOST MODE ── */
        <div style={styles.lostSection}>
          <p style={styles.lostTitle}>This dog is lost. Please help!</p>
          {(dog.owner_contact_name || dog.owner_contact_phone) && (
            <div style={styles.contactBox}>
              {dog.owner_contact_name && (
                <p style={styles.contactLine}>
                  <span style={styles.contactLabel}>Owner</span>
                  {dog.owner_contact_name}
                </p>
              )}
              {dog.owner_contact_phone && (
                <p style={styles.contactLine}>
                  <span style={styles.contactLabel}>Phone</span>
                  <a href={`tel:${dog.owner_contact_phone}`} style={styles.phoneLink}>
                    {dog.owner_contact_phone}
                  </a>
                </p>
              )}
            </div>
          )}
          {dog.owner_contact_phone && (
            <div style={styles.callRow}>
              <a href={`tel:${dog.owner_contact_phone}`} style={styles.callBtn}>
                Call owner
              </a>
              <a
                href={`sms:${dog.owner_contact_phone}`}
                style={{ ...styles.callBtn, backgroundColor: '#f3f4f6', color: '#111827' }}
              >
                Send SMS
              </a>
            </div>
          )}
          <FoundForm dogId={dog.id} />
        </div>
      ) : (
        /* ── PASSIVE MODE ── */
        <div>
          <p style={styles.passiveText}>
            Hi! I&apos;m <strong>{dog.name}</strong>. Please scan to let my owner know you found me.
          </p>
          <FoundForm dogId={dog.id} />
        </div>
      )}
    </Wrapper>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f7f9f7',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px 40px',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    padding: '0 0 28px',
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    height: '280px',
    backgroundColor: '#f3f4f6',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 24px 0',
    flexWrap: 'wrap',
  },
  name: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#111827',
    margin: 0,
  },
  lostBadge: {
    backgroundColor: danger,
    color: '#fff',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    padding: '4px 10px',
    borderRadius: '999px',
  },
  meta: {
    fontSize: '15px',
    color: '#6b7280',
    margin: '6px 24px 0',
  },
  divider: {
    height: '1px',
    backgroundColor: '#f3f4f6',
    margin: '20px 24px',
  },
  passiveText: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.6',
    margin: '0 24px 16px',
  },
  lostSection: {
    padding: '0 24px',
  },
  lostTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: danger,
    margin: '0 0 16px',
  },
  contactBox: {
    backgroundColor: '#fff7ed',
    border: '1.5px solid #fed7aa',
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  contactLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: '#111827',
    margin: 0,
  },
  contactLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    minWidth: '44px',
  },
  phoneLink: {
    color: accent,
    fontWeight: '600',
    textDecoration: 'none',
  },
  callRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
  },
  callBtn: {
    flex: 1,
    padding: '13px',
    borderRadius: '12px',
    backgroundColor: accent,
    color: '#fff',
    fontSize: '15px',
    fontWeight: '700',
    textAlign: 'center',
    textDecoration: 'none',
  },
  notFound: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  notFoundTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: '12px 0 8px',
  },
  notFoundSub: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  footer: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#9ca3af',
  },
}
