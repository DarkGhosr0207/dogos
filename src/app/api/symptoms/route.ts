import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ageLabelFromDateOfBirth } from '@/app/dashboard/dogs/dog-age'

const SYSTEM_PROMPT =
  "You are a veterinary triage assistant. Based on symptoms described, respond in JSON only with: { triage_level: 'emergency'|'vet_asap'|'monitor'|'ok', title: string, explanation: string (2-3 sentences), actions: string[] }. Never diagnose. Always recommend consulting a vet."

const TRIAGE_LEVELS = ['emergency', 'vet_asap', 'monitor', 'ok'] as const
type TriageLevel = (typeof TRIAGE_LEVELS)[number]

type TriagePayload = {
  triage_level: TriageLevel
  title: string
  explanation: string
  actions: string[]
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

function parseTriagePayload(text: string): TriagePayload {
  const raw = extractJsonObject(text)
  const data = JSON.parse(raw) as Record<string, unknown>

  const triage_level = data.triage_level
  const title = data.title
  const explanation = data.explanation
  const actions = data.actions

  if (
    typeof triage_level !== 'string' ||
    !TRIAGE_LEVELS.includes(triage_level as TriageLevel)
  ) {
    throw new Error('Invalid triage_level in model response')
  }
  if (typeof title !== 'string' || title.length < 1) {
    throw new Error('Invalid title in model response')
  }
  if (typeof explanation !== 'string' || explanation.length < 1) {
    throw new Error('Invalid explanation in model response')
  }
  if (!Array.isArray(actions) || !actions.every((a) => typeof a === 'string')) {
    throw new Error('Invalid actions in model response')
  }

  return {
    triage_level: triage_level as TriageLevel,
    title,
    explanation,
    actions: actions as string[],
  }
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

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key is not configured.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    dogId?: string
    symptoms?: string
    duration?: string
    severity?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
  const symptoms =
    typeof body.symptoms === 'string' ? body.symptoms.trim() : ''
  const duration =
    typeof body.duration === 'string' ? body.duration.trim() : ''
  const severity =
    typeof body.severity === 'string' ? body.severity.trim() : ''

  if (!dogId || !symptoms || !duration || !severity) {
    return NextResponse.json(
      { error: 'dogId, symptoms, duration, and severity are required.' },
      { status: 400 }
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
      { status: 500 }
    )
  }
  if (!dog) {
    return NextResponse.json({ error: 'Dog not found.' }, { status: 404 })
  }

  const breedInfo = dog.breed?.trim() ? dog.breed.trim() : 'Unknown breed'
  const ageInfo = ageLabelFromDateOfBirth(dog.date_of_birth ?? null)
  const userMessage = `Dog breed/age info: ${breedInfo}, age ${ageInfo}. Symptoms: ${symptoms}, duration: ${duration}, severity: ${severity}`
  const prompt = `${SYSTEM_PROMPT}\n\n${userMessage}`

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
        model: 'claude-opus-4-5',
        max_tokens: 1024,
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

  let triage: TriagePayload
  try {
    const text = anthropicMessageText(anthropicJson)
    triage = parseTriagePayload(text)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse AI response'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const { error: insertError } = await supabase.from('symptom_checks').insert({
    owner_id: user.id,
    dog_id: dog.id,
    symptoms,
    duration,
    severity,
    triage_level: triage.triage_level,
    title: triage.title,
    explanation: triage.explanation,
    actions: triage.actions,
  })

  if (insertError) {
    return NextResponse.json(
      { error: `Could not save symptom check: ${insertError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json(triage)
}
