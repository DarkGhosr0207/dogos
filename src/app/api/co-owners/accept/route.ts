import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    // 2. Verify the token — get the user via the anon client with the user's JWT
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // 3. Read body
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

    // 4. Use service role to bypass RLS
    const service = createServiceClient()
    if (!service) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // SELECT first — gives a clean 404 before we attempt any write
    const { data: invite, error: selectError } = await service
      .from('dog_members')
      .select('id')
      .eq('dog_id', dogId)
      .eq('invite_email', userEmail)
      .is('accepted_at', null)
      .maybeSingle()

    if (selectError) {
      console.error('[co-owners/accept] select error:', selectError)
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }
    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found or already accepted' },
        { status: 404 },
      )
    }

    // UPDATE by primary key — no ambiguity
    const { error: updateError } = await service
      .from('dog_members')
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('[co-owners/accept] update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[co-owners/accept] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
