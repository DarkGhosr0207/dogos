import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT =
  'You are a legal assistant specializing in dog ownership laws in Europe. Answer questions based on the provided article content. Be helpful but always remind users to consult a lawyer for official legal advice. Keep answers concise (3-4 sentences).'

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
    question?: string
    country?: string
    articleContent?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const country =
    typeof body.country === 'string' ? body.country.trim() : ''
  const articleContent =
    typeof body.articleContent === 'string' ? body.articleContent.trim() : ''

  if (!question || !articleContent) {
    return NextResponse.json(
      { error: 'question and articleContent are required.' },
      { status: 400 }
    )
  }

  const userMessage = `Country context: ${country || 'Not specified'}

Article content:
${articleContent}

Question: ${question}`

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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
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

  try {
    const answer = anthropicMessageText(anthropicJson)
    return NextResponse.json({ answer })
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to parse AI response'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
