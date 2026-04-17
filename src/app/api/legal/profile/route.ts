import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/get-user-from-request'

const MODEL = 'claude-sonnet-4-20250514'

type LegalProfileItem = {
  title: string
  description: string
  category: 'registration' | 'public_space' | 'breed_restriction' | 'liability' | 'welfare'
  severity: 'info' | 'warning' | 'critical'
  country: string
}

function anthropicMessageText(data: unknown): string {
  if (!data || typeof data !== 'object') throw new Error('Unexpected Anthropic response')
  const content = (data as { content?: unknown }).content
  if (!Array.isArray(content) || content.length === 0) throw new Error('Anthropic response had no content')
  const first = content[0] as { type?: string; text?: string }
  if (first?.type !== 'text' || typeof first.text !== 'string') throw new Error('Anthropic response format not supported')
  return first.text
}

function extractJsonArray(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  const start = t.indexOf('[')
  const end = t.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON array found in response')
  return t.slice(start, end + 1)
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Anthropic API key is not configured.' }, { status: 500 })

  const { user, supabase } = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { dogId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dogId = typeof body.dogId === 'string' ? body.dogId.trim() : ''
  if (!dogId) return NextResponse.json({ error: 'dogId is required.' }, { status: 400 })

  // Fetch dog
  const { data: dog, error: dogError } = await supabase
    .from('dogs')
    .select('id, name, breed, weight_kg, legal_profile, legal_profile_generated_at')
    .eq('id', dogId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (dogError) return NextResponse.json({ error: `Could not load dog: ${dogError.message}` }, { status: 500 })
  if (!dog) return NextResponse.json({ error: 'Dog not found.' }, { status: 404 })

  const dogRow = dog as Record<string, unknown>

  // Check cache (30 days)
  const generatedAt = dogRow.legal_profile_generated_at as string | null
  if (generatedAt) {
    const age = Date.now() - new Date(generatedAt).getTime()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (age < thirtyDays && Array.isArray(dogRow.legal_profile) && (dogRow.legal_profile as unknown[]).length > 0) {
      return NextResponse.json({ legal_profile: dogRow.legal_profile })
    }
  }

  // Fetch owner's country + city of residence (user-level setting, not dog-level)
  const { data: profile } = await supabase
    .from('users_profile')
    .select('country, city')
    .eq('id', user.id)
    .maybeSingle()

  const profileRow = profile as { country?: string | null; city?: string | null } | null
  const country = profileRow?.country ?? 'Germany'
  const location = profileRow?.city ? `${profileRow.city}, ${country}` : country

  const name = String(dogRow.name ?? 'Dog')
  const breed = typeof dogRow.breed === 'string' ? dogRow.breed : 'mixed breed'
  const weight = typeof dogRow.weight_kg === 'number' ? dogRow.weight_kg : null

  const prompt = `You are a dog law expert. Generate 5 personalized legal cards for a dog living in ${location}. Dog: ${name}, breed: ${breed}, weight: ${weight != null ? `${weight}kg` : 'unknown'}. Return ONLY a JSON array, no markdown, no preamble:
[{ "title": "<max 10 words, specific to this dog>", "description": "<2-3 sentences practical>", "category": "<registration|public_space|breed_restriction|liability|welfare>", "severity": "<info|warning|critical>", "country": "${location}" }]
If breed has restrictions in ${location}, mark as critical. Be specific to the region, not generic.`

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

  let legal_profile: LegalProfileItem[]
  try {
    const text = anthropicMessageText(anthropicJson)
    const arr = JSON.parse(extractJsonArray(text)) as Record<string, unknown>[]
    legal_profile = arr
      .filter((it) => it && typeof it.title === 'string')
      .map((it) => ({
        title: String(it.title),
        description: typeof it.description === 'string' ? it.description : '',
        category: (['registration', 'public_space', 'breed_restriction', 'liability', 'welfare'] as const).includes(
          it.category as LegalProfileItem['category'],
        )
          ? (it.category as LegalProfileItem['category'])
          : 'welfare',
        severity: (['info', 'warning', 'critical'] as const).includes(it.severity as LegalProfileItem['severity'])
          ? (it.severity as LegalProfileItem['severity'])
          : 'info',
        country: typeof it.country === 'string' ? it.country : country,
      }))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse AI response'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Save to dogs table
  await supabase
    .from('dogs')
    .update({
      legal_profile: legal_profile,
      legal_profile_generated_at: new Date().toISOString(),
    })
    .eq('id', dogId)

  return NextResponse.json({ legal_profile })
}
