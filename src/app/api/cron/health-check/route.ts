import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { checkDogAlerts, type Alert } from '@/lib/health-check'
import { buildAlertEmail } from '@/lib/email-templates'

type VaccineAlert = {
  type: 'vaccine_due_30d' | 'vaccine_due_7d' | 'vaccine_due_1d'
  severity: 'low' | 'medium' | 'high'
  message: string
  vaccineType: string
}

function isoDateUTC(offsetDays: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function todayStartUTC(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

async function checkVaccineAlerts(
  service: SupabaseClient,
  dogId: string,
  dogName: string,
): Promise<VaccineAlert[]> {
  const thresholds = [
    {
      days: 30,
      type: 'vaccine_due_30d' as const,
      severity: 'low' as const,
      buildMessage: (name: string, vaccineType: string, date: string) =>
        `${name}'s ${vaccineType} vaccine is due on ${date}. Schedule a vet appointment.`,
    },
    {
      days: 7,
      type: 'vaccine_due_7d' as const,
      severity: 'medium' as const,
      buildMessage: (name: string, vaccineType: string, date: string) =>
        `${name}'s ${vaccineType} vaccine is due on ${date}.`,
    },
    {
      days: 1,
      type: 'vaccine_due_1d' as const,
      severity: 'high' as const,
      buildMessage: (name: string, vaccineType: string, _date: string) =>
        `${name}'s ${vaccineType} vaccine is due tomorrow. Don't forget!`,
    },
  ]

  const todayStart = todayStartUTC()
  const alerts: VaccineAlert[] = []

  for (const threshold of thresholds) {
    const targetDate = isoDateUTC(threshold.days)

    const { data: dueVaccines } = await service
      .from('vaccines')
      .select('vaccine_type, expires_at')
      .eq('dog_id', dogId)
      .eq('expires_at', targetDate)

    if (!dueVaccines?.length) continue

    for (const row of dueVaccines) {
      const vaccineType = String((row as { vaccine_type: string }).vaccine_type)

      // Dedup: skip if we already sent this alert for this vaccine today
      const { data: existing } = await service
        .from('health_alerts')
        .select('id')
        .eq('dog_id', dogId)
        .eq('type', threshold.type)
        .gte('created_at', todayStart)
        .ilike('message', `%${vaccineType}%`)
        .limit(1)
        .maybeSingle()

      if (existing) continue

      const formattedDate = new Date(targetDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      alerts.push({
        type: threshold.type,
        severity: threshold.severity,
        message: threshold.buildMessage(dogName, vaccineType, formattedDate),
        vaccineType,
      })
    }
  }

  return alerts
}

export async function POST(request: Request) {
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

      let healthAlerts: Alert[] = []
      try {
        healthAlerts = await checkDogAlerts(service, userId, dogId, dogName)
      } catch {
        continue
      }

      let vaccineAlerts: VaccineAlert[] = []
      try {
        vaccineAlerts = await checkVaccineAlerts(service, dogId, dogName)
      } catch {
        // non-fatal — continue without vaccine alerts
      }

      if (healthAlerts.length === 0 && vaccineAlerts.length === 0) continue

      const alerts = [...healthAlerts, ...vaccineAlerts]

      const insertRows = alerts.map((a) => ({
        user_id: userId,
        dog_id: dogId,
        dog_name: dogName,
        type: a.type,
        severity: a.severity,
        message: a.message,
        is_read: false,
      }))

      console.log('Inserting alerts:', JSON.stringify(alerts))
      const { error: insertError } = await service.from('health_alerts').insert(insertRows)
      if (insertError) console.error('Insert error:', insertError.message)
      if (!insertError) {
        totalAlertsInserted += insertRows.length
      }

      const subject = `🐾 Health Alert for ${dogName} — DogOS`
      const html = buildAlertEmail(dogName, alerts as Alert[], userEmail)

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

