import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import { computeWeeklyStats } from './activity/weekly-stats'
import { ageLabelFromDateOfBirth } from './dogs/dog-age'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfMonthIso(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function dueBucket(
  dueAtIso: string,
  now: Date
): 'overdue' | 'this_week' | 'upcoming' {
  const due = new Date(dueAtIso)
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endWeek = new Date(startToday)
  const day = startToday.getDay()
  const daysUntilEndOfWeek = day === 0 ? 0 : 7 - day
  endWeek.setDate(endWeek.getDate() + daysUntilEndOfWeek)
  endWeek.setHours(23, 59, 59, 999)

  if (due < startToday) return 'overdue'
  if (due <= endWeek) return 'this_week'
  return 'upcoming'
}

function formatDueBadge(iso: string): string {
  const d = new Date(iso)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function healthStreakFromDates(logDates: string[]): number {
  const days = new Set(logDates)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  const cur = new Date(today)
  for (;;) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const day = String(cur.getDate()).padStart(2, '0')
    const key = `${y}-${m}-${day}`
    if (!days.has(key)) break
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const now = new Date()
  const todayStr = todayIsoLocal()
  const monthStartIso = startOfMonthIso()

  const thirtyFiveDaysAgo = new Date()
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35)
  thirtyFiveDaysAgo.setHours(0, 0, 0, 0)

  const { data: dogsData, error: dogsError } = await supabase
    .from('dogs')
    .select('id, name, breed, date_of_birth, photo_url')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const dogs = (dogsData ?? []) as Array<{
    id: string
    name: string
    breed: string | null
    date_of_birth: string | null
    photo_url: string | null
  }>

  const primaryDog = dogs[0] ?? null
  const primaryId = primaryDog?.id ?? null

  const [
    todayHealthRes,
    lastActivityRes,
    weightsRes,
    remindersRes,
    activityRes,
    symptomRes,
    healthDatesRes,
  ] = await Promise.all([
    primaryId
      ? supabase
          .from('health_logs')
          .select('mood, appetite, energy, stool, notes')
          .eq('user_id', user.id)
          .eq('dog_id', primaryId)
          .eq('log_date', todayStr)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    primaryId
      ? supabase
          .from('activity_logs')
          .select('logged_at, duration_minutes, activity_type')
          .eq('user_id', user.id)
          .eq('dog_id', primaryId)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    primaryId
      ? supabase
          .from('weight_logs')
          .select('logged_at, weight_kg')
          .eq('user_id', user.id)
          .eq('dog_id', primaryId)
          .order('logged_at', { ascending: false })
          .limit(2)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('reminders')
      .select('id, title, due_at, type, dog_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('due_at', { ascending: true })
      .limit(3),
    supabase
      .from('activity_logs')
      .select('logged_at, duration_minutes')
      .eq('user_id', user.id)
      .gte('logged_at', thirtyFiveDaysAgo.toISOString()),
    supabase
      .from('symptom_checks')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .gte('created_at', monthStartIso),
    primaryId
      ? supabase
          .from('health_logs')
          .select('log_date')
          .eq('user_id', user.id)
          .eq('dog_id', primaryId)
          .gte('log_date', '2020-01-01')
      : Promise.resolve({ data: [], error: null }),
  ])

  const todayHealthRaw = todayHealthRes.data as {
    mood: string | null
    appetite: string | null
    energy: string | null
    stool: string | null
    notes: string | null
  } | null

  const lastActivity = lastActivityRes.data as {
    logged_at: string
    duration_minutes: number
    activity_type: string
  } | null

  const weightRows = (weightsRes.data ?? []) as Array<{
    logged_at: string
    weight_kg: number
  }>

  const lastWeight = weightRows[0] ?? null
  const prevWeight = weightRows[1] ?? null

  const dogNameById = new Map(dogs.map((d) => [d.id, d.name]))

  const remindersList = (remindersRes.data ?? []).map((r) => {
    const bucket = dueBucket(r.due_at, now)
    return {
      id: r.id,
      title: r.title,
      due_at: r.due_at,
      type: r.type,
      dog_name: dogNameById.get(r.dog_id) ?? 'Dog',
      due_label: formatDueBadge(r.due_at),
      bucket,
    }
  })

  const weeklyStats = computeWeeklyStats((activityRes.data ?? []) as Array<{
    logged_at: string
    duration_minutes: number
  }>, new Date())

  const symptomChecksThisMonth = symptomRes.error
    ? 0
    : (symptomRes.count ?? 0)

  const healthLogDates = (healthDatesRes.data ?? []).map(
    (r: { log_date: string }) => r.log_date
  )
  const healthStreak = primaryId ? healthStreakFromDates(healthLogDates) : 0

  const primaryDogPayload = primaryDog
    ? {
        id: primaryDog.id,
        name: primaryDog.name,
        breed: primaryDog.breed,
        ageLabel: ageLabelFromDateOfBirth(primaryDog.date_of_birth),
        photo_url: primaryDog.photo_url,
      }
    : null

  function isHealthLogEmpty(
    log: typeof todayHealthRaw
  ): boolean {
    if (!log) return true
    return (
      !log.mood &&
      !log.appetite &&
      !log.energy &&
      !log.stool &&
      !(log.notes && log.notes.trim())
    )
  }

  const todayHealth = todayHealthRaw && !isHealthLogEmpty(todayHealthRaw) ? todayHealthRaw : null

  const weightTrend =
    lastWeight && prevWeight
      ? lastWeight.weight_kg > prevWeight.weight_kg
        ? 'up'
        : lastWeight.weight_kg < prevWeight.weight_kg
          ? 'down'
          : 'same'
      : 'same'

  return (
    <>
      {dogsError ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
          Could not load dogs: {dogsError.message}
        </div>
      ) : null}
      <DashboardClient
        userEmail={user.email ?? ''}
        greeting={greeting()}
        dogs={primaryDogPayload}
        todayHealthEmpty={isHealthLogEmpty(todayHealthRaw)}
        todayHealth={todayHealth}
        lastActivity={lastActivity}
        lastWeightKg={lastWeight?.weight_kg ?? null}
        weightTrend={weightTrend}
        reminders={remindersList}
        weekMinutes={weeklyStats.totalMinutesThisWeek}
        activityScore={weeklyStats.activityScore}
        symptomChecksThisMonth={symptomChecksThisMonth}
        healthStreak={healthStreak}
      />
    </>
  )
}
