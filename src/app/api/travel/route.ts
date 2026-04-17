import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/get-user-from-request'
import { checkTravelPlannerAccess } from '@/lib/freemium'

const MODEL = 'claude-sonnet-4-20250514'

export type TravelDocumentItem = {
  document: string
  description: string
  timing: string
  mandatory: boolean
  already_have: boolean | null
}

export type TravelVaccinationItem = {
  vaccine: string
  required: boolean
  timing: string
  notes: string
  status: 'found_in_records' | 'not_found' | 'unknown'
}

export type TravelTimelineItem = {
  weeks_before: number
  action: string
  critical: boolean
}

export type LegalItem = {
  title: string
  description: string
  category: 'entry' | 'breed' | 'transport' | 'health'
  important: boolean
}

export type TravelPlannerResult = {
  summary: string
  health_status_for_travel: string
  urgency_warning: string | null
  required_documents: TravelDocumentItem[]
  vaccinations: TravelVaccinationItem[]
  vaccines: string[]
  timeline: TravelTimelineItem[]
  breed_specific: string | null
  estimated_cost: string
  official_resources: string[]
  legal_items: LegalItem[]
  vaccines_needed: Array<{ vaccine: string; required: boolean; notes: string }>
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

function parseTravelPayload(text: string): TravelPlannerResult {
  const raw = extractJsonObject(text)
  const data = JSON.parse(raw) as Record<string, unknown>

  if (typeof data.summary !== 'string' || data.summary.length < 1) {
    throw new Error('Invalid summary in model response')
  }

  if (typeof data.health_status_for_travel !== 'string' || data.health_status_for_travel.length < 1) {
    throw new Error('Invalid health_status_for_travel in model response')
  }

  const urgency = data.urgency_warning
  if (urgency !== null && typeof urgency !== 'string') {
    throw new Error('Invalid urgency_warning in model response')
  }

  if (!Array.isArray(data.required_documents)) {
    throw new Error('Invalid required_documents in model response')
  }
  for (const doc of data.required_documents) {
    if (!doc || typeof doc !== 'object') {
      throw new Error('Invalid document item in model response')
    }
    const o = doc as Record<string, unknown>
    if (typeof o.document !== 'string') throw new Error('Invalid document.document')
    if (typeof o.description !== 'string') throw new Error('Invalid document.description')
    if (typeof o.timing !== 'string') throw new Error('Invalid document.timing')
    if (typeof o.mandatory !== 'boolean') throw new Error('Invalid document.mandatory')
    const ah = o.already_have
    if (ah !== null && typeof ah !== 'boolean') throw new Error('Invalid document.already_have')
  }

  if (!Array.isArray(data.vaccinations)) {
    throw new Error('Invalid vaccinations in model response')
  }
  for (const v of data.vaccinations) {
    if (!v || typeof v !== 'object') {
      throw new Error('Invalid vaccination item in model response')
    }
    const o = v as Record<string, unknown>
    if (typeof o.vaccine !== 'string') throw new Error('Invalid vaccination.vaccine')
    if (typeof o.required !== 'boolean') throw new Error('Invalid vaccination.required')
    if (typeof o.timing !== 'string') throw new Error('Invalid vaccination.timing')
    if (typeof o.notes !== 'string') throw new Error('Invalid vaccination.notes')
    const st = o.status
    if (
      st !== 'found_in_records' &&
      st !== 'not_found' &&
      st !== 'unknown'
    ) {
      throw new Error('Invalid vaccination.status')
    }
  }

  if (!Array.isArray(data.timeline)) {
    throw new Error('Invalid timeline in model response')
  }
  for (const t of data.timeline) {
    if (!t || typeof t !== 'object') {
      throw new Error('Invalid timeline item in model response')
    }
    const o = t as Record<string, unknown>
    if (typeof o.weeks_before !== 'number' || !Number.isFinite(o.weeks_before)) {
      throw new Error('Invalid timeline.weeks_before')
    }
    if (typeof o.action !== 'string') throw new Error('Invalid timeline.action')
    if (typeof o.critical !== 'boolean') throw new Error('Invalid timeline.critical')
  }

  const breed = data.breed_specific
  if (breed !== null && typeof breed !== 'string') {
    throw new Error('Invalid breed_specific in model response')
  }

  if (typeof data.estimated_cost !== 'string') {
    throw new Error('Invalid estimated_cost in model response')
  }

  if (!Array.isArray(data.official_resources)) {
    throw new Error('Invalid official_resources in model response')
  }
  if (!data.official_resources.every((x) => typeof x === 'string')) {
    throw new Error('Invalid official_resources entries in model response')
  }

  // Parse legal_items leniently
  const rawLegal = data.legal_items
  const legal_items: LegalItem[] = Array.isArray(rawLegal)
    ? (rawLegal as Record<string, unknown>[])
        .filter((it) => it && typeof it.title === 'string')
        .map((it) => ({
          title: String(it.title),
          description: typeof it.description === 'string' ? it.description : '',
          category: (['entry', 'breed', 'transport', 'health'] as const).includes(
            it.category as 'entry' | 'breed' | 'transport' | 'health',
          )
            ? (it.category as LegalItem['category'])
            : 'entry',
          important: it.important === true,
        }))
    : []

  const vaccinations = data.vaccinations as TravelVaccinationItem[]
  const vaccines_needed = vaccinations.map((v) => ({
    vaccine: v.vaccine,
    required: v.required,
    notes: v.notes,
  }))

  const vaccines = vaccinations.map((v) => `${v.vaccine} — ${v.notes}`)

  return {
    summary: data.summary,
    health_status_for_travel: data.health_status_for_travel as string,
    urgency_warning: urgency as string | null,
    required_documents: data.required_documents as TravelDocumentItem[],
    vaccinations,
    vaccines,
    timeline: data.timeline as TravelTimelineItem[],
    breed_specific: breed as string | null,
    estimated_cost: data.estimated_cost,
    official_resources: data.official_resources as string[],
    legal_items,
    vaccines_needed,
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

  const allowed = await checkTravelPlannerAccess(user.id, supabase)
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'PREMIUM_PLUS_REQUIRED',
        message: 'Travel Planner requires Premium+.',
      },
      { status: 402 },
    )
  }

  let body: {
    dogId?: string
    destinationCountry?: string
    travelDate?: string
    originCountry?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
  const destinationCountry =
    typeof body.destinationCountry === 'string' ? body.destinationCountry.trim() : ''
  const travelDate = typeof body.travelDate === 'string' ? body.travelDate.trim() : ''
  const originCountry =
    typeof body.originCountry === 'string' ? body.originCountry.trim() : ''

  if (!dogId || !destinationCountry || !travelDate || !originCountry) {
    return NextResponse.json(
      { error: 'dogId, destinationCountry, travelDate, and originCountry are required.' },
      { status: 400 },
    )
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

  const dogName = dog.name as string
  const dogBreed = (dog.breed && String(dog.breed).trim()) || 'Unknown breed'
  const dogDob = dog.date_of_birth ? String(dog.date_of_birth) : 'unknown'

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  const healthStartStr = thirtyDaysAgo.toISOString().slice(0, 10)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  ninetyDaysAgo.setHours(0, 0, 0, 0)

  const [remindersResult, weightResult, healthResult, symptomResult] = await Promise.all([
    supabase
      .from('reminders')
      .select('type, title, due_at, is_active')
      .eq('dog_id', dogId)
      .eq('user_id', user.id)
      .in('type', ['vaccine', 'medication', 'vet_visit']),
    supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('dog_id', dogId)
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('health_logs')
      .select('log_date, mood, appetite, energy')
      .eq('dog_id', dogId)
      .eq('user_id', user.id)
      .gte('log_date', healthStartStr)
      .order('log_date', { ascending: false }),
    supabase
      .from('symptom_checks')
      .select('triage_level, title')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
  ])

  if (remindersResult.error) {
    return NextResponse.json(
      { error: `Could not load reminders: ${remindersResult.error.message}` },
      { status: 500 },
    )
  }
  if (weightResult.error) {
    return NextResponse.json(
      { error: `Could not load weight: ${weightResult.error.message}` },
      { status: 500 },
    )
  }
  if (healthResult.error) {
    return NextResponse.json(
      { error: `Could not load health logs: ${healthResult.error.message}` },
      { status: 500 },
    )
  }
  if (symptomResult.error) {
    return NextResponse.json(
      { error: `Could not load symptom checks: ${symptomResult.error.message}` },
      { status: 500 },
    )
  }

  const vaccineReminders = (remindersResult.data ?? []) as Array<{
    type: string
    title: string
    due_at: string
    is_active: boolean
  }>

  const latestWeight = weightResult.data as { weight_kg: number; logged_at: string } | null

  const healthLogs = (healthResult.data ?? []) as Array<{
    log_date: string
    mood: string | null
    appetite: string | null
    energy: string | null
  }>

  const symptomChecks = (symptomResult.data ?? []) as Array<{
    triage_level: string
    title: string
  }>

  const formatDue = (due: string) => {
    const d = new Date(due)
    return Number.isNaN(d.getTime()) ? due : d.toISOString().slice(0, 10)
  }

  const prompt = `You are a veterinary travel expert specializing in international pet travel regulations.

A dog owner wants to travel with their dog:
- Dog: ${dogName}, ${dogBreed}, born ${dogDob}
- Current weight: ${latestWeight ? `${Number(latestWeight.weight_kg)}kg` : 'unknown'}
- From: ${originCountry}
- To: ${destinationCountry}  
- Travel date: ${travelDate}

EXISTING VACCINATIONS & MEDICAL RECORDS (from owner's reminders):
${vaccineReminders.length > 0
  ? vaccineReminders
      .map(
        (r) =>
          `- ${r.title}: due ${formatDue(r.due_at)}, ${r.is_active ? 'active' : 'completed'}`,
      )
      .join('\n')
  : 'No vaccination records found in app'}

RECENT HEALTH STATUS (last 30 days):
${healthLogs.length > 0
  ? healthLogs
      .map(
        (h) =>
          `${h.log_date}: mood=${h.mood ?? '—'} appetite=${h.appetite ?? '—'} energy=${h.energy ?? '—'}`,
      )
      .join('\n')
  : 'No recent health logs'}

RECENT SYMPTOMS (last 90 days):
${symptomChecks.length > 0
  ? symptomChecks.map((s) => `- ${s.title} (${s.triage_level})`).join('\n')
  : 'No recent symptom checks'}

Based on this specific dog's health data, create a personalized travel checklist.
Flag any concerns about the dog's current health status for travel.
Note which vaccinations appear to already be documented vs which are missing.

Create response in this EXACT JSON format:
{
  "summary": "<personalized 2-3 sentence overview mentioning the dog by name and their specific situation>",
  "health_status_for_travel": "<assessment of whether this dog appears fit for travel based on health logs>",
  "urgency_warning": "<null or warning if travel date is less than 3 months away>",
  "required_documents": [
    {
      "document": "<document name>",
      "description": "<what it is and where to get it>",
      "timing": "<how far in advance needed>",
      "mandatory": true,
      "already_have": "<true if appears to be in their records, false if missing, null if unknown>"
    }
  ],
  "vaccinations": [
    {
      "vaccine": "<vaccine name>",
      "required": true,
      "timing": "<when needed relative to travel>",
      "notes": "<important notes>",
      "status": "<found_in_records | not_found | unknown>"
    }
  ],
  "timeline": [
    {
      "weeks_before": <number>,
      "action": "<what to do>",
      "critical": true
    }
  ],
  "breed_specific": "<any breed-specific restrictions or requirements, or null>",
  "estimated_cost": "<rough cost estimate in EUR>",
  "official_resources": ["<official website or authority to verify>"],
  "legal_items": [
    {
      "title": "<max 8 words>",
      "description": "<1-2 sentences, practical>",
      "category": "<entry|breed|transport|health>",
      "important": true
    }
  ]
}
Include 4-5 legal_items covering: entry requirements (microchip, passport, vaccines), breed-specific restrictions, transport rules, destination country warnings. Set important=true if non-compliance could prevent entry.
Respond ONLY with valid JSON, no markdown.`

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
        max_tokens: 4096,
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

  let result: TravelPlannerResult
  try {
    const text = anthropicMessageText(anthropicJson)
    result = parseTravelPayload(text)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse AI response'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json(result)
}
