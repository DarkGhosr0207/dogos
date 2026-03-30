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

  console.log('Checking alerts for dog:', dogId)

  // Trigger 1 - Not eating: last 3 days, appetite = not_eating, 2+ days
  {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0]

    const { data: notEatingLogs, error } = await supabase
      .from('health_logs')
      .select('log_date')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('log_date', threeDaysAgoStr)
      .eq('appetite', 'not_eating')

    if (error) throw new Error(`health_logs appetite query failed: ${error.message}`)
    console.log('Not eating logs found:', notEatingLogs?.length)
    if ((notEatingLogs?.length ?? 0) >= 2) {
      alerts.push({
        type: 'not_eating',
        severity: 'high',
        message: `${dogName} has not been eating for 2+ days. This may indicate illness — consider contacting your vet.`,
      })
      console.log('Total alerts to insert:', alerts.length)
    }
  }

  // Trigger 2 - Very low energy: last 4 days, energy = very_low, 3+ days
  {
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0]

    const { data: lowEnergyLogs, error } = await supabase
      .from('health_logs')
      .select('log_date')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('log_date', fourDaysAgoStr)
      .eq('energy', 'very_low')

    if (error) throw new Error(`health_logs energy query failed: ${error.message}`)
    console.log('Low energy logs found:', lowEnergyLogs?.length)
    if ((lowEnergyLogs?.length ?? 0) >= 3) {
      alerts.push({
        type: 'low_energy',
        severity: 'high',
        message: `${dogName} has had very low energy for 3+ days. Persistent lethargy can be a sign of illness.`,
      })
      console.log('Total alerts to insert:', alerts.length)
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
        console.log('Total alerts to insert:', alerts.length)
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
      console.log('Total alerts to insert:', alerts.length)
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
        console.log('Total alerts to insert:', alerts.length)
      }
    }
  }

  // Trigger 6 - Health log streak broken: last 5 days, if no log for last 3+ days
  {
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('health_logs')
      .select('log_date')
      .eq('user_id', userId)
      .eq('dog_id', dogId)
      .gte('log_date', fiveDaysAgoStr)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`health_logs streak query failed: ${error.message}`)
    const latestDate = (data as { log_date?: string } | null)?.log_date ?? null

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const cutoffStr = threeDaysAgo.toISOString().split('T')[0]

    if (!latestDate || latestDate < cutoffStr) {
      alerts.push({
        type: 'no_health_log',
        severity: 'low',
        message: `You haven't logged ${dogName}'s health in 3+ days. Regular check-ins help catch health issues early.`,
      })
      console.log('Total alerts to insert:', alerts.length)
    }
  }

  return alerts
}

