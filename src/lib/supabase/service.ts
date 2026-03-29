import { createClient } from '@supabase/supabase-js'

/**
 * Service role client — server-only. Bypasses RLS; use only for trusted server code
 * (e.g. public dog profile by id).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
