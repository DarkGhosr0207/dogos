import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type UserPlan = 'free' | 'premium' | 'premium_plus'

function startOfCurrentMonthIso(now = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export async function getUserPlan(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<UserPlan> {
  const supabase = supabaseClient ?? (await createClient())
  const { data, error } = await supabase
    .from('users_profile')
    .select('plan')
    .eq('id', userId)
    .maybeSingle()

  if (error) return 'free'
  const plan = (data as { plan?: unknown } | null)?.plan
  if (plan === 'premium_plus') return 'premium_plus'
  if (plan === 'premium') return 'premium'
  return 'free'
}

export async function checkInsightsAccess(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<boolean> {
  const plan = await getUserPlan(userId, supabaseClient)
  return plan === 'premium_plus'
}

export async function checkTravelPlannerAccess(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<boolean> {
  const plan = await getUserPlan(userId, supabaseClient)
  return plan === 'premium_plus'
}

export async function checkMonthlyReportAccess(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<boolean> {
  const plan = await getUserPlan(userId, supabaseClient)
  return plan === 'premium_plus'
}

export async function checkSymptomLimit(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<{
  allowed: boolean
  used: number
  limit: number
}> {
  const plan = await getUserPlan(userId, supabaseClient)
  if (plan === 'premium' || plan === 'premium_plus') {
    return { allowed: true, used: 0, limit: 999 }
  }

  const supabase = supabaseClient ?? (await createClient())
  const startIso = startOfCurrentMonthIso()

  const { count } = await supabase
    .from('usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'symptom_check')
    .gt('created_at', startIso)

  const used = count ?? 0
  const limit = 1
  return { allowed: used < limit, used, limit }
}

