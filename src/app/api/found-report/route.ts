import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  let body: { dogId?: unknown; finderPhone?: unknown; finderMessage?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
  if (!dogId) {
    return NextResponse.json({ error: 'dogId is required' }, { status: 400 })
  }

  const finderPhone = typeof body.finderPhone === 'string' ? body.finderPhone.trim() : null
  const finderMessage = typeof body.finderMessage === 'string' ? body.finderMessage.trim() : null

  // Fetch dog + owner_id
  const { data: dog, error: dogErr } = await supabase
    .from('dogs')
    .select('id, name, owner_id')
    .eq('id', dogId)
    .maybeSingle()

  if (dogErr || !dog) {
    return NextResponse.json({ error: 'Dog not found' }, { status: 404 })
  }

  const dogName = String((dog as { name: string }).name)
  const ownerId = String((dog as { owner_id: string }).owner_id)

  // Save found_report
  const { error: insertErr } = await supabase.from('found_reports').insert({
    dog_id: dogId,
    finder_phone: finderPhone || null,
    finder_message: finderMessage || null,
  })

  if (insertErr) {
    return NextResponse.json({ error: `Could not save report: ${insertErr.message}` }, { status: 500 })
  }

  // Get owner push_token
  const { data: profile } = await supabase
    .from('users_profile')
    .select('push_token')
    .eq('id', ownerId)
    .maybeSingle()

  const pushToken = profile && typeof (profile as { push_token?: unknown }).push_token === 'string'
    ? (profile as { push_token: string }).push_token
    : null

  if (pushToken) {
    const body = finderPhone ? `📞 ${finderPhone}` : 'No phone left'
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: `Someone found ${dogName}! 🐕`,
        body,
        data: { dogId, type: 'found_report' },
      }),
    }).catch(() => {
      // Non-fatal — push delivery best-effort
    })
  }

  return NextResponse.json({ success: true })
}
