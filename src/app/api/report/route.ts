import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/get-user-from-request'
import { checkMonthlyReportAccess } from '@/lib/freemium'
import { ageLabelFromDateOfBirth } from '@/app/dashboard/dogs/dog-age'

const MODEL = 'claude-sonnet-4-20250514'

export type ReportClaudeSummary = {
  executive_summary: string
  weight_summary: string
  activity_summary: string
  health_summary: string
  concerns: string[]
  positive_notes: string[]
  vet_talking_points: string[]
}

export type ReportApiPayload = {
  dog: {
    name: string
    breed: string
    age: string
    date_of_birth: string | null
  }
  month: string
  periodLabel: string
  summary: ReportClaudeSummary
  weight_logs: Array<{
    logged_at: string
    weight_kg: number
    notes: string | null
  }>
  health_logs: Array<{
    log_date: string
    mood: string | null
    appetite: string | null
    energy: string | null
    stool: string | null
  }>
  activity_logs: Array<{
    logged_at: string
    activity_type: string
    duration_minutes: number
    intensity: string | null
  }>
  symptom_checks: Array<{
    created_at: string
    symptoms: string
    triage_level: string
    title: string
    explanation: string
  }>
  reminders: Array<{
    type: string
    title: string
    due_at: string
  }>
}

function extractJsonObject(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response')
  }
  return t.slice(start, end + 1)
}

function anthropicMessageText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected Anthropic response')
  }
  const content = (data as { content?: unknown }).content
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Anthropic response had no content')
  }
  const first = content[0] as { type?: string; text?: string }
  if (first?.type !== 'text' || typeof first.text !== 'string') {
    throw new Error('Anthropic response format not supported')
  }
  return first.text
}

function parseReportSummary(text: string): ReportClaudeSummary {
  const raw = extractJsonObject(text)
  const data = JSON.parse(raw) as Record<string, unknown>

  if (typeof data.executive_summary !== 'string') throw new Error('Invalid executive_summary')
  if (typeof data.weight_summary !== 'string') throw new Error('Invalid weight_summary')
  if (typeof data.activity_summary !== 'string') throw new Error('Invalid activity_summary')
  if (typeof data.health_summary !== 'string') throw new Error('Invalid health_summary')
  if (!Array.isArray(data.concerns) || !data.concerns.every((x) => typeof x === 'string')) {
    throw new Error('Invalid concerns')
  }
  if (!Array.isArray(data.positive_notes) || !data.positive_notes.every((x) => typeof x === 'string')) {
    throw new Error('Invalid positive_notes')
  }
  if (
    !Array.isArray(data.vet_talking_points) ||
    !data.vet_talking_points.every((x) => typeof x === 'string')
  ) {
    throw new Error('Invalid vet_talking_points')
  }

  return {
    executive_summary: data.executive_summary,
    weight_summary: data.weight_summary,
    activity_summary: data.activity_summary,
    health_summary: data.health_summary,
    concerns: data.concerns as string[],
    positive_notes: data.positive_notes as string[],
    vet_talking_points: data.vet_talking_points as string[],
  }
}

type MobileDogPayload = {
  id?: string
  name?: unknown
  breed?: unknown
  date_of_birth?: unknown
}

function resolveYyyyMm(body: {
  month?: unknown
  year?: unknown
}): string | null {
  if (typeof body.month === 'string') {
    const s = body.month.trim()
    if (/^\d{4}-\d{2}$/.test(s)) return s
  }
  const y =
    typeof body.year === 'number'
      ? body.year
      : typeof body.year === 'string'
        ? Number(body.year)
        : NaN
  const m =
    typeof body.month === 'number'
      ? body.month
      : typeof body.month === 'string' && /^\d{1,2}$/.test(body.month.trim())
        ? Number(body.month.trim())
        : NaN
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null
  return `${y}-${String(m).padStart(2, '0')}`
}

function isMobileReportPayload(body: unknown): body is {
  dogId?: string
  dog: MobileDogPayload
  month?: unknown
  year?: unknown
  health_logs: unknown[]
  activity_logs: unknown[]
  weight_logs: unknown[]
  symptom_checks: unknown[]
} {
  if (!body || typeof body !== 'object') return false
  const o = body as Record<string, unknown>
  return (
    o.dog != null &&
    typeof o.dog === 'object' &&
    Array.isArray(o.health_logs) &&
    Array.isArray(o.activity_logs) &&
    Array.isArray(o.weight_logs) &&
    Array.isArray(o.symptom_checks)
  )
}

function normalizeWeightLogs(rows: unknown[]): ReportApiPayload['weight_logs'] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      logged_at: String(r.logged_at ?? r.loggedAt ?? ''),
      weight_kg: Number(r.weight_kg ?? r.weightKg ?? NaN),
      notes: r.notes != null ? String(r.notes) : null,
    }
  })
}

function normalizeHealthLogs(rows: unknown[]): ReportApiPayload['health_logs'] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      log_date: String(r.log_date ?? r.logDate ?? ''),
      mood: r.mood != null ? String(r.mood) : null,
      appetite: r.appetite != null ? String(r.appetite) : null,
      energy: r.energy != null ? String(r.energy) : null,
      stool: r.stool != null ? String(r.stool) : null,
    }
  })
}

function normalizeActivityLogs(rows: unknown[]): ReportApiPayload['activity_logs'] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      logged_at: String(r.logged_at ?? r.loggedAt ?? ''),
      activity_type: String(r.activity_type ?? r.activityType ?? ''),
      duration_minutes: Number(r.duration_minutes ?? r.durationMinutes ?? 0),
      intensity: r.intensity != null ? String(r.intensity) : null,
    }
  })
}

function normalizeSymptomChecks(rows: unknown[]): ReportApiPayload['symptom_checks'] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      created_at: String(r.created_at ?? r.createdAt ?? ''),
      symptoms: String(r.symptoms ?? ''),
      triage_level: String(r.triage_level ?? r.triageLevel ?? ''),
      title: String(r.title ?? ''),
      explanation: String(r.explanation ?? ''),
    }
  })
}

function monthRange(yyyyMm: string): {
  startStr: string
  endStr: string
  startIso: string
  nextMonthIso: string
  periodLabel: string
} {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim())
  if (!m) {
    throw new Error('Invalid month format')
  }
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) {
    throw new Error('Invalid month')
  }
  const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0))
  const next = new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0))
  const end = new Date(next.getTime() - 86400000)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const periodLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(start)

  return {
    startStr,
    endStr,
    startIso: start.toISOString(),
    nextMonthIso: next.toISOString(),
    periodLabel,
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key is not configured.' },
      { status: 500 },
    )
  }

  const { user, supabase } = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await checkMonthlyReportAccess(user.id, supabase)
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'PREMIUM_PLUS_REQUIRED',
        message: 'Monthly Health Report requires Premium+.',
      },
      { status: 402 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  let dogId =
    typeof raw.dogId === 'string'
      ? raw.dogId.trim()
      : typeof raw.dog_id === 'string'
        ? raw.dog_id.trim()
        : ''

  const yyyyMm = resolveYyyyMm(raw)
  if (!yyyyMm) {
    return NextResponse.json(
      { error: 'Provide month as YYYY-MM or numeric month + year.' },
      { status: 400 },
    )
  }

  let range: ReturnType<typeof monthRange>
  try {
    range = monthRange(yyyyMm)
  } catch {
    return NextResponse.json({ error: 'month must be YYYY-MM.' }, { status: 400 })
  }

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  let dogName: string
  let dogBreed: string
  let dob: string | null
  let weight_logs: ReportApiPayload['weight_logs']
  let health_logs: ReportApiPayload['health_logs']
  let activity_logs: ReportApiPayload['activity_logs']
  let symptom_checks: ReportApiPayload['symptom_checks']

  if (isMobileReportPayload(body)) {
    const d = body.dog
    if (typeof d.id === 'string' && d.id.trim()) {
      if (dogId && dogId !== d.id.trim()) {
        return NextResponse.json({ error: 'dogId does not match dog.id.' }, { status: 400 })
      }
      dogId = d.id.trim()
    }
    if (!dogId) {
      return NextResponse.json({ error: 'dogId (or dog.id) is required.' }, { status: 400 })
    }

    const { data: owned, error: ownError } = await supabase
      .from('dogs')
      .select('id')
      .eq('id', dogId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownError) {
      return NextResponse.json({ error: `Could not verify dog: ${ownError.message}` }, { status: 500 })
    }
    if (!owned) {
      return NextResponse.json({ error: 'Dog not found.' }, { status: 404 })
    }

    dogName = typeof d.name === 'string' && d.name.trim() ? d.name.trim() : 'Your dog'
    dogBreed = d.breed != null && String(d.breed).trim() ? String(d.breed).trim() : 'Unknown breed'
    dob = d.date_of_birth != null ? String(d.date_of_birth) : null

    weight_logs = normalizeWeightLogs(body.weight_logs)
    health_logs = normalizeHealthLogs(body.health_logs)
    activity_logs = normalizeActivityLogs(body.activity_logs)
    symptom_checks = normalizeSymptomChecks(body.symptom_checks)
  } else {
    if (!dogId) {
      return NextResponse.json({ error: 'dogId is required.' }, { status: 400 })
    }

    const { data: dog, error: dogError } = await supabase
      .from('dogs')
      .select('id, name, breed, date_of_birth')
      .eq('id', dogId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (dogError) {
      return NextResponse.json(
        { error: `Could not load dog: ${dogError.message}` },
        { status: 500 },
      )
    }
    if (!dog) {
      return NextResponse.json({ error: 'Dog not found.' }, { status: 404 })
    }

    dogName = dog.name as string
    dogBreed = (dog.breed && String(dog.breed).trim()) || 'Unknown breed'
    dob = dog.date_of_birth as string | null

    const [weightRes, healthRes, activityRes, symptomRes] = await Promise.all([
      supabase
        .from('weight_logs')
        .select('logged_at, weight_kg, notes')
        .eq('dog_id', dogId)
        .eq('user_id', user.id)
        .gte('logged_at', range.startStr)
        .lte('logged_at', range.endStr)
        .order('logged_at', { ascending: true }),
      supabase
        .from('health_logs')
        .select('log_date, mood, appetite, energy, stool')
        .eq('dog_id', dogId)
        .eq('user_id', user.id)
        .gte('log_date', range.startStr)
        .lte('log_date', range.endStr)
        .order('log_date', { ascending: true }),
      supabase
        .from('activity_logs')
        .select('logged_at, activity_type, duration_minutes, intensity')
        .eq('dog_id', dogId)
        .eq('user_id', user.id)
        .gte('logged_at', range.startIso)
        .lt('logged_at', range.nextMonthIso)
        .order('logged_at', { ascending: true }),
      supabase
        .from('symptom_checks')
        .select('created_at, symptoms, triage_level, title, explanation')
        .eq('dog_id', dogId)
        .eq('owner_id', user.id)
        .gte('created_at', range.startIso)
        .lt('created_at', range.nextMonthIso)
        .order('created_at', { ascending: true }),
    ])

    if (weightRes.error) {
      return NextResponse.json(
        { error: `Could not load weight logs: ${weightRes.error.message}` },
        { status: 500 },
      )
    }
    if (healthRes.error) {
      return NextResponse.json(
        { error: `Could not load health logs: ${healthRes.error.message}` },
        { status: 500 },
      )
    }
    if (activityRes.error) {
      return NextResponse.json(
        { error: `Could not load activity logs: ${activityRes.error.message}` },
        { status: 500 },
      )
    }
    if (symptomRes.error) {
      return NextResponse.json(
        { error: `Could not load symptom checks: ${symptomRes.error.message}` },
        { status: 500 },
      )
    }

    weight_logs = (weightRes.data ?? []).map((row) => ({
      logged_at: String(row.logged_at),
      weight_kg: Number(row.weight_kg),
      notes: row.notes != null ? String(row.notes) : null,
    }))

    health_logs = (healthRes.data ?? []).map((row) => ({
      log_date: String(row.log_date),
      mood: row.mood != null ? String(row.mood) : null,
      appetite: row.appetite != null ? String(row.appetite) : null,
      energy: row.energy != null ? String(row.energy) : null,
      stool: row.stool != null ? String(row.stool) : null,
    }))

    activity_logs = (activityRes.data ?? []).map((row) => ({
      logged_at: String(row.logged_at),
      activity_type: String(row.activity_type),
      duration_minutes: Number(row.duration_minutes),
      intensity: row.intensity != null ? String(row.intensity) : null,
    }))

    symptom_checks = (symptomRes.data ?? []).map((row) => ({
      created_at: String(row.created_at),
      symptoms: String(row.symptoms),
      triage_level: String(row.triage_level),
      title: String(row.title),
      explanation: String(row.explanation),
    }))
  }

  const age = ageLabelFromDateOfBirth(dob)

  const { data: remindersRows, error: remindersError } = await supabase
    .from('reminders')
    .select('type, title, due_at')
    .eq('dog_id', dogId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .gte('due_at', todayStart.toISOString())
    .order('due_at', { ascending: true })

  if (remindersError) {
    return NextResponse.json(
      { error: `Could not load reminders: ${remindersError.message}` },
      { status: 500 },
    )
  }

  const reminders = (remindersRows ?? []).map((row) => ({
    type: String(row.type),
    title: String(row.title),
    due_at: String(row.due_at),
  }))

  const dataBlock = {
    report_month: yyyyMm,
    period: range.periodLabel,
    weight_logs,
    health_logs,
    activity_logs,
    symptom_checks,
    reminders_upcoming: reminders,
  }

  const prompt = `You are a veterinary assistant. Create a professional health summary 
for a vet visit based on the following data for ${dogName} (${dogBreed}, ${age}).

DATA (JSON):
${JSON.stringify(dataBlock)}

Generate a concise professional summary in this JSON format:
{
  "executive_summary": "<2-3 sentences overall health assessment>",
  "weight_summary": "<weight trend analysis>",
  "activity_summary": "<activity level assessment>", 
  "health_summary": "<mood, appetite, energy patterns>",
  "concerns": ["<concern 1>", "<concern 2>"] or [],
  "positive_notes": ["<positive 1>"] or [],
  "vet_talking_points": ["<what to discuss with vet>"]
}
Respond only with JSON.`

  let anthropicRes: Response
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to reach Anthropic API.' }, { status: 502 })
  }

  const anthropicJson: unknown = await anthropicRes.json().catch(() => null)

  if (!anthropicRes.ok) {
    const errMsg =
      anthropicJson &&
      typeof anthropicJson === 'object' &&
      'error' in anthropicJson &&
      anthropicJson.error &&
      typeof anthropicJson.error === 'object' &&
      'message' in anthropicJson.error &&
      typeof (anthropicJson.error as { message: unknown }).message === 'string'
        ? (anthropicJson.error as { message: string }).message
        : `Anthropic error (${anthropicRes.status})`
    return NextResponse.json({ error: errMsg }, { status: 502 })
  }

  let summary: ReportClaudeSummary
  try {
    const text = anthropicMessageText(anthropicJson)
    summary = parseReportSummary(text)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse AI response'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const payload: ReportApiPayload = {
    dog: {
      name: dogName,
      breed: dogBreed,
      age,
      date_of_birth: dob,
    },
    month: yyyyMm,
    periodLabel: range.periodLabel,
    summary,
    weight_logs,
    health_logs,
    activity_logs,
    symptom_checks,
    reminders,
  }

  return NextResponse.json(payload)
}
