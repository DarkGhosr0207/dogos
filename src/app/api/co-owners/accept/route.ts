import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

// ─── Shared auth helper ───────────────────────────────────────────────────────

async function verifyToken(
  request: Request,
): Promise<{ user: { id: string; email?: string } } | NextResponse> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return { user }
}

// ─── GET /api/co-owners/accept?dogId=XXX ─────────────────────────────────────
// Returns { dogName, hasInvite } — used by the mobile app on screen mount
// to populate the dog name and check whether a pending invite exists.

export async function GET(request: Request) {
  try {
    const authResult = await verifyToken(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const dogId = new URL(request.url).searchParams.get('dogId')?.trim() ?? ''
    if (!dogId) {
      return NextResponse.json({ error: 'dogId is required' }, { status: 400 })
    }

    const userEmail = user.email?.toLowerCase().trim()
    if (!userEmail) {
      return NextResponse.json({ error: 'User has no email' }, { status: 400 })
    }

    const service = createServiceClient()
    if (!service) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // Run both queries in parallel
    const [dogResult, inviteResult] = await Promise.all([
      service.from('dogs').select('name').eq('id', dogId).maybeSingle(),
      service
        .from('dog_members')
        .select('id')
        .eq('dog_id', dogId)
        .eq('invite_email', userEmail)
        .is('accepted_at', null)
        .maybeSingle(),
    ])

    if (dogResult.error) {
      console.error('[co-owners/accept GET] dogs error:', dogResult.error)
      return NextResponse.json({ error: dogResult.error.message }, { status: 500 })
    }
    if (inviteResult.error) {
      console.error('[co-owners/accept GET] dog_members error:', inviteResult.error)
      return NextResponse.json({ error: inviteResult.error.message }, { status: 500 })
    }

    const dogName = (dogResult.data as { name?: string } | null)?.name ?? null
    const hasInvite = inviteResult.data !== null

    return NextResponse.json({ dogName, hasInvite })
  } catch (err) {
    console.error('[co-owners/accept GET] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/co-owners/accept ──────────────────────────────────────────────
// Stamps the invite row: sets user_id + accepted_at.

export async function POST(request: Request) {
  try {
    const authResult = await verifyToken(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    let body: { dogId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
    if (!dogId) {
      return NextResponse.json({ error: 'dogId is required' }, { status: 400 })
    }

    const userEmail = user.email?.toLowerCase().trim()
    if (!userEmail) {
      return NextResponse.json({ error: 'User has no email' }, { status: 400 })
    }

    const service = createServiceClient()
    if (!service) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // SELECT first — clean 404 before any write
    const { data: invite, error: selectError } = await service
      .from('dog_members')
      .select('id')
      .eq('dog_id', dogId)
      .eq('invite_email', userEmail)
      .is('accepted_at', null)
      .maybeSingle()

    if (selectError) {
      console.error('[co-owners/accept POST] select error:', selectError)
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }
    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found or already accepted' },
        { status: 404 },
      )
    }

    // UPDATE by primary key
    const { error: updateError } = await service
      .from('dog_members')
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('[co-owners/accept POST] update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[co-owners/accept POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
