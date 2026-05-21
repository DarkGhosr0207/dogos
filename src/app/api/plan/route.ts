import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

// ─── Auth helper ──────────────────────────────────────────────────────────────

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

// ─── GET /api/plan?dogId=XXX ──────────────────────────────────────────────────
// Returns { plan: 'free' | 'premium' | 'premium_plus' }
// If dogId provided and user is an accepted co-owner → returns the dog owner's plan.
// Otherwise → returns the authenticated user's own plan.

export async function GET(request: Request) {
  try {
    const authResult = await verifyToken(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const service = createServiceClient()
    if (!service) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const dogId = new URL(request.url).searchParams.get('dogId')?.trim() ?? ''

    if (dogId) {
      // Check if user is an accepted co-owner of this dog
      const { data: memberRow, error: memberError } = await service
        .from('dog_members')
        .select('id')
        .eq('dog_id', dogId)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle()

      if (memberError) {
        console.error('[/api/plan] dog_members error:', memberError)
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }

      if (memberRow) {
        // Co-owner: fetch the dog owner's plan
        const { data: dogRow, error: dogError } = await service
          .from('dogs')
          .select('owner_id')
          .eq('id', dogId)
          .maybeSingle()

        if (dogError) {
          console.error('[/api/plan] dogs error:', dogError)
          return NextResponse.json({ error: dogError.message }, { status: 500 })
        }

        const ownerId = (dogRow as { owner_id?: string } | null)?.owner_id ?? null
        if (ownerId) {
          const { data: profile } = await service
            .from('users_profile')
            .select('plan')
            .eq('id', ownerId)
            .maybeSingle()
          const plan = (profile as { plan?: string } | null)?.plan ?? 'free'
          return NextResponse.json({ plan })
        }
      }
    }

    // Own dog or no dogId: return own plan
    const { data: profile } = await service
      .from('users_profile')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle()
    const plan = (profile as { plan?: string } | null)?.plan ?? 'free'
    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[/api/plan] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
