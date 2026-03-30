import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { checkDogAlerts, type Alert } from '@/lib/health-check'
import { buildAlertEmail } from '@/lib/email-templates'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  if (!service) {
    return NextResponse.json(
      { error: 'Service role Supabase client not configured.' },
      { status: 500 },
    )
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured.' }, { status: 500 })
  }
  const resend = new Resend(resendKey)

  const { data: premiumUsers, error: usersError } = await service
    .from('users_profile')
    .select('id')
    .eq('plan', 'premium_plus')

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  let totalAlertsInserted = 0
  let totalEmailsSent = 0

  for (const row of premiumUsers ?? []) {
    const userId = String((row as { id: string }).id)

    const adminUser = await service.auth.admin.getUserById(userId).catch(() => null)
    const userEmail =
      adminUser && 'data' in adminUser && adminUser.data?.user?.email
        ? String(adminUser.data.user.email)
        : null

    if (!userEmail) continue

    const { data: dogs, error: dogsError } = await service
      .from('dogs')
      .select('id, name')
      .eq('owner_id', userId)
      .order('name', { ascending: true })

    if (dogsError) continue

    for (const d of dogs ?? []) {
      const dogId = String((d as { id: string }).id)
      const dogName = String((d as { name: string }).name)

      let alerts: Alert[] = []
      try {
        alerts = await checkDogAlerts(service, userId, dogId, dogName)
      } catch {
        continue
      }

      if (alerts.length === 0) continue

      const insertRows = alerts.map((a) => ({
        user_id: userId,
        dog_id: dogId,
        dog_name: dogName,
        type: a.type,
        severity: a.severity,
        message: a.message,
        is_read: false,
      }))

      const insertRes = await service.from('health_alerts').insert(insertRows).select('id')
      if (!insertRes.error) {
        totalAlertsInserted += insertRows.length
      }

      const subject = `🐾 Health Alert for ${dogName} — DogOS`
      const html = buildAlertEmail(dogName, alerts, userEmail)

      const from = 'DogOS <alerts@dogos.app>'
      const to = userEmail

      const emailRes = await resend.emails.send({
        from,
        to,
        subject,
        html,
      })

      if (!('error' in emailRes) || !emailRes.error) {
        totalEmailsSent += 1
      }
    }
  }

  return NextResponse.json({
    ok: true,
    premiumUsers: premiumUsers?.length ?? 0,
    totalAlertsInserted,
    totalEmailsSent,
  })
}

