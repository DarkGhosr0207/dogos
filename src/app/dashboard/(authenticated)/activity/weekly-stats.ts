export type WeeklyActivityStats = {
  totalMinutesThisWeek: number
  totalActivitiesThisWeek: number
  currentStreak: number
  activityScore: number
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const s = new Date(d)
  s.setDate(d.getDate() + diff)
  s.setHours(0, 0, 0, 0)
  return s
}

function endOfWeekMonday(d: Date): Date {
  const s = startOfWeekMonday(d)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}

function localDateKey(iso: string): string {
  const t = new Date(iso)
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const day = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localDateKeyFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Consecutive calendar days with ≥1 activity, counting backward from today.
 * If today has no activity, streak is 0.
 */
function computeCurrentStreak(
  activities: Array<{ logged_at: string; duration_minutes: number }>,
  now: Date
): number {
  const minutesByDay = new Map<string, number>()
  for (const a of activities) {
    const k = localDateKey(a.logged_at)
    minutesByDay.set(k, (minutesByDay.get(k) ?? 0) + a.duration_minutes)
  }
  const daysWithActivity = new Set<string>()
  for (const [k, m] of minutesByDay) {
    if (m > 0) daysWithActivity.add(k)
  }

  let streak = 0
  const check = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (;;) {
    const key = localDateKeyFromDate(check)
    if (!daysWithActivity.has(key)) break
    streak++
    check.setDate(check.getDate() - 1)
  }
  return streak
}

export function computeWeeklyStats(
  activities: Array<{ logged_at: string; duration_minutes: number }>,
  now: Date = new Date()
): WeeklyActivityStats {
  const start = startOfWeekMonday(now)
  const end = endOfWeekMonday(now)
  const inWeek = activities.filter((a) => {
    const t = new Date(a.logged_at)
    return t >= start && t <= end
  })
  const totalMinutesThisWeek = inWeek.reduce((s, a) => s + a.duration_minutes, 0)
  const totalActivitiesThisWeek = inWeek.length
  const activityScore = Math.min(100, (totalMinutesThisWeek / 210) * 100)
  const currentStreak = computeCurrentStreak(activities, now)

  return {
    totalMinutesThisWeek,
    totalActivitiesThisWeek,
    currentStreak,
    activityScore,
  }
}

export { startOfWeekMonday, endOfWeekMonday, localDateKey }
