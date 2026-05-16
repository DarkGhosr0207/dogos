import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getUserFromRequest } from '@/lib/supabase/get-user-from-request'
import { getUserPlan } from '@/lib/freemium'

const APP_STORE_URL = 'https://apps.apple.com/app/dogos-dog-health-tracker/id6761737193'

function buildInviteEmail(inviterName: string, dogName: string, dogId: string): string {
  const deepLink = `dogos://invite?dogId=${encodeURIComponent(dogId)}`
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:#1a2e1f;padding:28px 32px">
      <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff">🐾 DogOS</p>
    </div>
    <div style="padding:32px">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827">
        You&rsquo;ve been invited to co-manage ${dogName}
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6">
        <strong style="color:#111827">${inviterName}</strong> has invited you to be a co-owner of
        <strong style="color:#111827">${dogName}</strong> on DogOS &mdash;
        the pet health tracker for dog owners.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280">
        Already have the app? Open your invite:
      </p>
      <a
        href="${deepLink}"
        style="display:inline-block;padding:14px 28px;background:#2d7a4f;color:#ffffff;font-size:16px;font-weight:600;border-radius:12px;text-decoration:none;margin-bottom:24px"
      >
        Accept invite in DogOS
      </a>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280">
        Don&rsquo;t have DogOS yet? Download it free:
      </p>
      <a
        href="${APP_STORE_URL}"
        style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;border-radius:10px;text-decoration:none"
      >
        📱 Download on the App Store
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5">
        If you didn&rsquo;t expect this invite, you can safely ignore this email.
        This invite was sent via DogOS.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  const { user, supabase } = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(user.id, supabase)
  if (plan !== 'premium_plus') {
    return NextResponse.json(
      { error: 'PREMIUM_PLUS_REQUIRED', message: 'Co-owners requires Premium+.' },
      { status: 402 },
    )
  }

  let body: { dogId?: string; inviteEmail?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
  const inviteEmail = typeof body.inviteEmail === 'string' ? body.inviteEmail.trim().toLowerCase() : ''

  if (!dogId) return NextResponse.json({ error: 'dogId is required' }, { status: 400 })
  if (!inviteEmail || !inviteEmail.includes('@')) {
    return NextResponse.json({ error: 'Valid inviteEmail is required' }, { status: 400 })
  }

  // Verify the dog belongs to the caller
  const { data: dog, error: dogError } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('id', dogId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (dogError) {
    return NextResponse.json({ error: dogError.message }, { status: 500 })
  }
  if (!dog) {
    return NextResponse.json({ error: 'Dog not found' }, { status: 404 })
  }

  const dogName = String((dog as { name: string }).name)

  // Check existing member count
  const { count, error: countError } = await supabase
    .from('dog_members')
    .select('id', { count: 'exact', head: true })
    .eq('dog_id', dogId)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }
  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Maximum 3 co-owners per dog' },
      { status: 422 },
    )
  }

  // Upsert the invite (idempotent on invite_email + dog_id)
  const { error: upsertError } = await supabase.from('dog_members').upsert(
    {
      dog_id: dogId,
      invite_email: inviteEmail,
      role: 'caregiver',
      invited_by: user.id,
      accepted_at: null,
    },
    { onConflict: 'dog_id,invite_email', ignoreDuplicates: false },
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Resolve inviter display name
  const { data: profile } = await supabase
    .from('users_profile')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  const inviterName =
    (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Your friend'

  // Send invite email via Resend (best-effort — don't fail the request)
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    await resend.emails
      .send({
        from: 'DogOS <alerts@dogos.app>',
        to: inviteEmail,
        subject: `You've been invited to co-manage ${dogName} on DogOS`,
        html: buildInviteEmail(inviterName, dogName, dogId),
      })
      .catch((err) => console.error('[co-owners/invite] Resend error:', err))
  }

  return NextResponse.json({ success: true })
}
