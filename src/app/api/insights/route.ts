import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/get-user-from-request'
import { checkInsightsAccess } from '@/lib/freemium'

const MODEL = 'claude-sonnet-4-20250514'

type InsightItem = {
  category: string
  title: string
  finding: string
  recommendation: string
  priority: string
}

export type InsightsResult = {
  overall_score: number
  overall_summary: string
  insights: InsightItem[]
  vet_recommendation: string
  positive_highlights: string[]
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

function parseInsightsPayload(text: string): InsightsResult {
  const raw = extractJsonObject(text)
  const data = JSON.parse(raw) as Record<string, unknown>

  const overall_score = data.overall_score
  const overall_summary = data.overall_summary
  const insights = data.insights
  const vet_recommendation = data.vet_recommendation
  const positive_highlights = data.positive_highlights

  if (typeof overall_score !== 'number' || overall_score < 1 || overall_score > 10) {
    throw new Error('Invalid overall_score in model response')
  }
  if (typeof overall_summary !== 'string' || overall_summary.length < 1) {
    throw new Error('Invalid overall_summary in model response')
  }
  if (!Array.isArray(insights)) {
    throw new Error('Invalid insights array in model response')
  }
  for (const item of insights) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid insight item in model response')
    }
    const o = item as Record<string, unknown>
    if (typeof o.category !== 'string') throw new Error('Invalid insight.category')
    if (typeof o.title !== 'string') throw new Error('Invalid insight.title')
    if (typeof o.finding !== 'string') throw new Error('Invalid insight.finding')
    if (typeof o.recommendation !== 'string') throw new Error('Invalid insight.recommendation')
    if (typeof o.priority !== 'string') throw new Error('Invalid insight.priority')
  }
  if (typeof vet_recommendation !== 'string') {
    throw new Error('Invalid vet_recommendation in model response')
  }
  if (!Array.isArray(positive_highlights) || !positive_highlights.every((x) => typeof x === 'string')) {
    throw new Error('Invalid positive_highlights in model response')
  }

  return {
    overall_score,
    overall_summary,
    insights: insights as InsightItem[],
    vet_recommendation,
    positive_highlights: positive_highlights as string[],
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key is not configured.' },
      { status: 500 }
    )
  }

  const { user, supabase } = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await checkInsightsAccess(user.id, supabase)
  if (!allowed) {
    return NextResponse.json(
      { error: 'PREMIUM_PLUS_REQUIRED', message: 'AI Health Insights requires Premium+.' },
      { status: 402 }
    )
  }

  let body: { dogId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
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
      { status: 500 }
    )
  }
  if (!dog) {
    return NextResponse.json({ error: 'Dog not found.' }, { status: 404 })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  const startStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`
  const startActivityIso = thirtyDaysAgo.toISOString()

  const [weightRes, activityRes, healthRes] = await Promise.all([
    supabase
      .from('weight_logs')
      .select('logged_at, weight_kg')
      .eq('dog_id', dogId)
      .eq('user_id', user.id)
      .gte('logged_at', startStr)
      .order('logged_at', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('logged_at, activity_type, duration_minutes, intensity')
      .eq('dog_id', dogId)
      .eq('user_id', user.id)
      .gte('logged_at', startActivityIso)
      .order('logged_at', { ascending: true }),
    supabase
      .from('health_logs')
      .select('log_date, mood, appetite, energy, stool')
      .eq('dog_id', dogId)
      .eq('user_id', user.id)
      .gte('log_date', startStr)
      .order('log_date', { ascending: true }),
  ])

  if (weightRes.error) {
    return NextResponse.json(
      { error: `Could not load weight logs: ${weightRes.error.message}` },
      { status: 500 }
    )
  }
  if (activityRes.error) {
    return NextResponse.json(
      { error: `Could not load activity logs: ${activityRes.error.message}` },
      { status: 500 }
    )
  }
  if (healthRes.error) {
    return NextResponse.json(
      { error: `Could not load health logs: ${healthRes.error.message}` },
      { status: 500 }
    )
  }

  const weightLogs = (weightRes.data ?? []) as Array<{
    logged_at: string
    weight_kg: number
  }>
  const activityLogs = (activityRes.data ?? []) as Array<{
    logged_at: string
    activity_type: string
    duration_minutes: number
    intensity: string | null
  }>
  const healthLogs = (healthRes.data ?? []) as Array<{
    log_date: string
    mood: string | null
    appetite: string | null
    energy: string | null
    stool: string | null
  }>

  const dogName = dog.name as string
  const dogBreed = (dog.breed && String(dog.breed).trim()) || 'Unknown breed'
  const dogDob = dog.date_of_birth || 'unknown'

  const prompt = `You are a veterinary health analyst. Analyze the following data 
for ${dogName}, a ${dogBreed} born on ${dogDob}.

WEIGHT DATA (last 30 days):
${weightLogs.map((w) => `${w.logged_at}: ${w.weight_kg}kg`).join('\n') || 'No weight data'}

ACTIVITY DATA (last 30 days):
${activityLogs.map((a) => `${a.logged_at}: ${a.activity_type} ${a.duration_minutes}min ${a.intensity ?? ''}`).join('\n') || 'No activity data'}

HEALTH LOGS (last 30 days):
${healthLogs.map((h) => `${h.log_date}: mood=${h.mood} appetite=${h.appetite} energy=${h.energy} stool=${h.stool}`).join('\n') || 'No health logs'}

Provide a health analysis in this EXACT JSON format:
{
  "overall_score": <number 1-10>,
  "overall_summary": "<2-3 sentence overall assessment>",
  "insights": [
    {
      "category": "<weight|activity|health|nutrition>",
      "title": "<short title>",
      "finding": "<what you found in the data>",
      "recommendation": "<specific actionable recommendation>",
      "priority": "<high|medium|low>"
    }
  ],
  "vet_recommendation": "<should they visit a vet? why or why not>",
  "positive_highlights": ["<thing going well>", "<thing going well>"]
}
Respond ONLY with valid JSON, no markdown, no explanation.`

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
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach Anthropic API.' },
      { status: 502 }
    )
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

  let insights: InsightsResult
  try {
    const text = anthropicMessageText(anthropicJson)
    insights = parseInsightsPayload(text)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse AI response'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json(insights)
}
