import type { SupabaseClient } from '@supabase/supabase-js'

export type Alert = {
  type:
    | 'not_eating'
    | 'low_energy'
    | 'weight_drop'
    | 'activity_drop'
    | 'weight_gain_trend'
    | 'no_health_log'
  severity: 'low' | 'medium' | 'high'
  message: string
}

function startOfDayIsoUTC(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
  return x.toISOString()
}

function startOfDayStrUTC(d = new Date()): string {
  return startOfDayIsoUTC(d).slice(0, 10)
}

export async function checkDogAlerts(
  supabase: SupabaseClient,
  userId: string,
  dogId: string,
  dogName: string,
): Promise<Alert[]> {
  const alerts: Alert[] = []

  const now = new Date()

  // Trigger 1 - Not eating: last 3 days, appetite = not_eating, 2+ days
  {
    const d3 = new Date(now)
    d3.setUTCDate(d3.getUTCDate() - 2)
    const startStr = startOfDayStrUTC(d3)
    const { data, error } = await supabase
      .from('health_logs')
      .select('log_date')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('log_date', startStr)
      .eq('appetite', 'not_eating')

    if (error) throw new Error(`health_logs appetite query failed: ${error.message}`)
    if ((data?.length ?? 0) >= 2) {
      alerts.push({
        type: 'not_eating',
        severity: 'high',
        message: `${dogName} has not been eating for 2+ days. This may indicate illness — consider contacting your vet.`,
      })
    }
  }

  // Trigger 2 - Very low energy: last 4 days, energy = very_low, 3+ days
  {
    const d4 = new Date(now)
    d4.setUTCDate(d4.getUTCDate() - 3)
    const startStr = startOfDayStrUTC(d4)
    const { data, error } = await supabase
      .from('health_logs')
      .select('log_date')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('log_date', startStr)
      .eq('energy', 'very_low')

    if (error) throw new Error(`health_logs energy query failed: ${error.message}`)
    if ((data?.length ?? 0) >= 3) {
      alerts.push({
        type: 'low_energy',
        severity: 'high',
        message: `${dogName} has had very low energy for 3+ days. Persistent lethargy can be a sign of illness.`,
      })
    }
  }

  // Trigger 3 - Weight drop: last 2 weight logs, latest < prev * 0.9
  {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .order('logged_at', { ascending: false })
      .limit(2)

    if (error) throw new Error(`weight_logs query failed: ${error.message}`)
    const rows = (data ?? []) as Array<{ weight_kg: number }>
    if (rows.length === 2) {
      const latest = Number(rows[0].weight_kg)
      const prev = Number(rows[1].weight_kg)
      if (Number.isFinite(latest) && Number.isFinite(prev) && prev > 0 && latest < prev * 0.9) {
        alerts.push({
          type: 'weight_drop',
          severity: 'high',
          message: `${dogName}'s weight dropped by more than 10% since last measurement. Significant weight loss may require veterinary attention.`,
        })
      }
    }
  }

  // Trigger 4 - Activity drop: compare last 7 days vs previous 7 days, within 14 days
  {
    const d14 = new Date(now)
    d14.setUTCDate(d14.getUTCDate() - 13)
    const startIso = startOfDayIsoUTC(d14)
    const { data, error } = await supabase
      .from('activity_logs')
      .select('duration_minutes, logged_at')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('logged_at', startIso)

    if (error) throw new Error(`activity_logs query failed: ${error.message}`)
    const rows = (data ?? []) as Array<{ duration_minutes: number; logged_at: string }>
    const weekStart = new Date(now)
    weekStart.setUTCDate(weekStart.getUTCDate() - 6)
    weekStart.setUTCHours(0, 0, 0, 0)
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7)

    let thisWeek = 0
    let lastWeek = 0
    for (const r of rows) {
      const t = new Date(r.logged_at)
      if (Number.isNaN(t.getTime())) continue
      const mins = Number(r.duration_minutes) || 0
      if (t >= weekStart) thisWeek += mins
      else if (t >= prevWeekStart) lastWeek += mins
    }

    if (lastWeek > 0 && thisWeek < lastWeek * 0.5) {
      alerts.push({
        type: 'activity_drop',
        severity: 'medium',
        message: `${dogName}'s activity level dropped by 50%+ compared to last week. This could indicate discomfort or illness.`,
      })
    }
  }

  // Trigger 5 - Weight gain trend: last 30 days (>=3 entries), strictly increasing sequence
  {
    const d30 = new Date(now)
    d30.setUTCDate(d30.getUTCDate() - 29)
    const startStr = startOfDayStrUTC(d30)
    const { data, error } = await supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('logged_at', startStr)
      .order('logged_at', { ascending: true })

    if (error) throw new Error(`weight_logs 30d query failed: ${error.message}`)
    const rows = (data ?? []) as Array<{ weight_kg: number }>
    if (rows.length >= 3) {
      let increasing = true
      for (let i = 1; i < rows.length; i++) {
        if (!(Number(rows[i].weight_kg) > Number(rows[i - 1].weight_kg))) {
          increasing = false
          break
        }
      }
      if (increasing) {
        alerts.push({
          type: 'weight_gain_trend',
          severity: 'medium',
          message: `${dogName} has been gaining weight consistently. Consider reviewing diet and increasing activity to prevent obesity.`,
        })
      }
    }
  }

  // Trigger 6 - Health log streak broken: last 5 days, if no log for last 3+ days
  {
    const d5 = new Date(now)
    d5.setUTCDate(d5.getUTCDate() - 4)
    const startStr = startOfDayStrUTC(d5)
    const { data, error } = await supabase
      .from('health_logs')
      .select('log_date')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('log_date', startStr)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`health_logs streak query failed: ${error.message}`)
    const latestDate = (data as { log_date?: string } | null)?.log_date ?? null

    const d3 = new Date(now)
    d3.setUTCDate(d3.getUTCDate() - 2)
    const cutoffStr = startOfDayStrUTC(d3)

    if (!latestDate || latestDate < cutoffStr) {
      alerts.push({
        type: 'no_health_log',
        severity: 'low',
        message: `You haven't logged ${dogName}'s health in 3+ days. Regular check-ins help catch health issues early.`,
      })
    }
  }

  return alerts
}

