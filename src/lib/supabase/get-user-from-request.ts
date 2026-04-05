import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Web: cookie session via createClient().
 * Mobile: Authorization: Bearer <access_token> validated with service client, then queries use service role (RLS bypass — filter by user.id in queries).
 */
export async function getUserFromRequest(request: Request): Promise<{
  user: User | null
  supabase: SupabaseClient
}> {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token) {
      const serviceSupabase = createServiceClient()
      if (serviceSupabase) {
        const {
          data: { user },
          error,
        } = await serviceSupabase.auth.getUser(token)
        if (user && !error) return { user, supabase: serviceSupabase }
      }
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { user, supabase }
}
