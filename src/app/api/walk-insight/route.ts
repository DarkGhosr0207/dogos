import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/get-user-from-request'
import { getUserPlan } from '@/lib/freemium'
import { CLAUDE_MODEL } from '@/lib/claude-config'

const MODEL = CLAUDE_MODEL

const BREED_WALK_NORMS: Record<string, number> = {
  labrador: 60,
  'golden retriever': 60,
  'border collie': 90,
  husky: 90,
  bulldog: 30,
  pug: 20,
  chihuahua: 20,
  poodle: 45,
  'german shepherd': 60,
  beagle: 45,
  default: 45,
}

function getBreedNorm(breed: string): number {
  const lower = breed.toLowerCase()
  for (const [key, val] of Object.entries(BREED_WALK_NORMS)) {
    if (key !== 'default' && lower.includes(key)) return val
  }
  return BREED_WALK_NORMS['default']
}

function anthropicText(data: unknown): string {
  if (!data || typeof data !== 'object') throw new Error('Unexpected Anthropic response')
  const content = (data as { content?: unknown }).content
  if (!Array.isArray(content) || content.length === 0) throw new Error('Empty Anthropic response')
  const first = content[0] as { type?: string; text?: string }
  if (first?.type !== 'text' || typeof first.text !== 'string') throw new Error('Bad Anthropic format')
  return first.text
}

function extractJson(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('No JSON in model response')
  return t.slice(start, end + 1)
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  const { user, supabase } = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { dogId?: string; duration_minutes?: number; breed?: string; locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
  const duration_minutes = typeof body.duration_minutes === 'number' ? body.duration_minutes : 30
  const breed = typeof body.breed === 'string' ? body.breed.trim() : 'Unknown'
  const locale = typeof body.locale === 'string' && body.locale.trim() ? body.locale.trim() : 'en'

  if (!dogId) {
    return NextResponse.json({ error: 'dogId is required' }, { status: 400 })
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [walksRes, planStr] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('duration_minutes, logged_at')
      .eq('dog_id', dogId)
      .eq('activity_type', 'walk')
      .gte('logged_at', sevenDaysAgo.toISOString())
      .order('logged_at', { ascending: true }),
    getUserPlan(user.id, supabase),
  ])

  const history = (walksRes.data ?? []).map(
    (r: { duration_minutes: number }) => r.duration_minutes,
  )
  const norm = getBreedNorm(breed)

  const prompt = `You are a dog health assistant. Respond ONLY in JSON format, no markdown. Language: ${locale}
Dog breed: ${breed}
Walk norm for this breed: ${norm} minutes/day
Last 7 days walks: ${JSON.stringify(history)} (array of duration_minutes)
Today's walk: ${duration_minutes} min
Return: {"short": "one sentence max 12 words with emoji", "full": "3 sentences: norm assessment, trend, recommendation"}`

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to reach Anthropic API' }, { status: 502 })
  }

  const anthropicJson: unknown = await anthropicRes.json().catch(() => null)

  if (!anthropicRes.ok) {
    return NextResponse.json(
      { error: `Anthropic error (${anthropicRes.status})` },
      { status: 502 },
    )
  }

  let short: string
  let full: string
  try {
    const text = anthropicText(anthropicJson)
    const parsed = JSON.parse(extractJson(text)) as { short?: unknown; full?: unknown }
    if (typeof parsed.short !== 'string' || typeof parsed.full !== 'string') {
      throw new Error('Missing short/full fields')
    }
    short = parsed.short
    full = parsed.full
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to parse AI response' },
      { status: 502 },
    )
  }

  // Log usage (non-blocking)
  void supabase.from('usage_logs').insert({
    user_id: user.id,
    event_name: 'walk_insight',
    properties: { dog_id: dogId, duration_minutes },
  })

  return NextResponse.json({ short, full, plan: planStr })
}
