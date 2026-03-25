import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import OpenAI from 'openai'
import { tavily } from '@tavily/core'
import cron from 'node-cron'

const app = new Hono()
app.use('/*', cors())

const ai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})

// Tavily init lazy (fail at request time, not startup)
const getTavily = () => {
  if (!process.env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY manquante dans .env')
  return tavily({ apiKey: process.env.TAVILY_API_KEY })
}

const JOURNALIST_PROMPT = `Tu es un journaliste professionnel francophone, spécialisé dans la synthèse d'information.
Tu analyses plusieurs sources et retournes un JSON structuré.

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans backticks) :
{
  "brief": "le briefing complet en markdown",
  "controversy": true ou false,
  "controversy_detail": "description courte si controversy=true, sinon chaîne vide"
}

Format du brief (champ "brief") :
1. **Chapô** (2-3 phrases percutantes)
2. **Contexte & Faits** (cite les sources : "selon Reuters", "d'après Le Monde")
3. **Analyse** (implications)
4. **À retenir** (exactement 3 bullet points)

Règles :
- controversy=true si deux sources se contredisent sur un fait clé
- 350 mots maximum pour le brief
- Ton : professionnel, direct, accessible
- Langue : français`

// Route principale : génère le brief texte
app.post('/brief', async (c) => {
  const { topic, tone = 'factuel' } = await c.req.json()

  console.log(`[brief] Sujet: "${topic}"`)

  // 1. Recherche web via Tavily
  const tv = getTavily()
  const search = await tv.search(`${topic} actualité récente`, {
    searchDepth: 'advanced',
    maxResults: 6,
    includeRawContent: 'text' as const,
  })

  const sources = search.results
    .map(r => `SOURCE: ${r.url}\nTITRE: ${r.title}\n${(r.rawContent ?? r.content).slice(0, 2000)}`)
    .join('\n\n---\n\n')

  console.log(`[brief] ${search.results.length} sources trouvées`)

  // 2. Synthèse via OpenRouter → Claude
  const completion = await ai.chat.completions.create({
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 1200,
    messages: [
      { role: 'system', content: JOURNALIST_PROMPT },
      { role: 'user', content: `Sujet: ${topic}\nTon souhaité: ${tone}\n\nSources disponibles:\n${sources}` },
    ],
  })

  const raw = completion.choices[0].message.content!

  // Parse JSON retourné par Claude (strip markdown code blocks si présents)
  let brief: string, controversy: boolean, controversy_detail: string
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)
    brief = parsed.brief
    controversy = parsed.controversy ?? false
    controversy_detail = parsed.controversy_detail ?? ''
  } catch {
    brief = raw
    controversy = false
    controversy_detail = ''
  }

  const sourceCount = search.results.length
  const confidence_score = parseFloat((sourceCount / 8).toFixed(2))

  console.log(`[brief] Brief généré — score: ${confidence_score} — controversy: ${controversy}`)

  return c.json({
    brief,
    sources: search.results.map(r => ({ title: r.title, url: r.url })),
    source_count: sourceCount,
    confidence_score,
    controversy,
    controversy_detail,
    model: completion.model,
  })
})

// Route audio : texte → MP3 via ElevenLabs
app.post('/audio', async (c) => {
  const { text } = await c.req.json()

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return c.json({ error: 'ELEVENLABS_API_KEY manquante' }, 503)
  }

  console.log(`[audio] TTS pour ${text.length} chars`)

  // Adam voice : ID pNInz6obpgDQGcFmaJgB (voix masculine, journaliste)
  const ttsRes = await fetch(
    'https://api.elevenlabs.io/v1/text-to-speech/YxrwjAKoUKULGd0g8K9Y',
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  )

  if (!ttsRes.ok) {
    const err = await ttsRes.text()
    console.error('[audio] ElevenLabs error:', err)
    return c.json({ error: 'TTS échoué', detail: err }, 500)
  }

  const audioBuffer = Buffer.from(await ttsRes.arrayBuffer())
  return new Response(audioBuffer, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
})

// Route combinée : brief + audio en un seul appel
app.post('/brief-with-audio', async (c) => {
  const { topic, tone = 'factuel' } = await c.req.json()

  // Appel interne /brief
  const briefReq = new Request('http://localhost/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, tone }),
  })
  const briefRes = await app.fetch(briefReq)
  const { brief, sources, model, source_count, confidence_score, controversy, controversy_detail } = await briefRes.json() as {
    brief: string; sources: any[]; model: string
    source_count: number; confidence_score: number
    controversy: boolean; controversy_detail: string
  }

  // Appel interne /audio
  const audioReq = new Request('http://localhost/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: brief }),
  })
  const audioRes = await app.fetch(audioReq)

  let audio_b64: string | null = null
  if (audioRes.ok) {
    const buf = Buffer.from(await audioRes.arrayBuffer())
    audio_b64 = buf.toString('base64')
  }

  return c.json({ brief, sources, model, source_count, confidence_score, controversy, controversy_detail, audio_b64 })
})

// ── Subscriptions ────────────────────────────────────────────────────────────

type Subscription = {
  id: string
  topic: string
  interval_minutes: number
  webhook_url: string
  created_at: string
  task: cron.ScheduledTask
}

const subscriptions = new Map<string, Subscription>()

async function sendToDiscord(webhook_url: string, topic: string, brief: string, source_count: number, confidence_score: number, controversy: boolean, controversy_detail: string) {
  const embed: any = {
    title: `📰 Briefing : ${topic}`,
    description: brief.slice(0, 4000),
    color: controversy ? 0xff6b35 : 0x2ecc71,
    footer: { text: `📊 ${source_count} sources · Confiance ${(confidence_score * 100).toFixed(0)}% · BriefAI` },
    timestamp: new Date().toISOString(),
  }

  if (controversy) {
    embed.fields = [{ name: '⚠️ Sources contradictoires', value: controversy_detail, inline: false }]
  }

  await fetch(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'BriefAI', embeds: [embed] }),
  })
}

async function runBriefAndNotify(sub: Subscription) {
  console.log(`[cron] Briefing automatique → "${sub.topic}"`)
  try {
    const res = await app.fetch(new Request('http://localhost/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: sub.topic }),
    }))
    const data = await res.json() as any
    await sendToDiscord(sub.webhook_url, sub.topic, data.brief, data.source_count, data.confidence_score, data.controversy, data.controversy_detail)
    console.log(`[cron] Envoyé sur Discord ✓`)
  } catch (e) {
    console.error(`[cron] Erreur:`, e)
  }
}

// S'abonner à un topic avec envoi automatique
app.post('/subscribe', async (c) => {
  const { topic, interval_minutes = 60, webhook_url } = await c.req.json()

  if (!webhook_url) return c.json({ error: 'webhook_url requis' }, 400)
  if (interval_minutes < 1) return c.json({ error: 'interval_minutes minimum : 1' }, 400)

  const id = crypto.randomUUID()
  const cronExpr = `*/${interval_minutes} * * * *`

  const task = cron.schedule(cronExpr, () => runBriefAndNotify(sub))
  const sub: Subscription = { id, topic, interval_minutes, webhook_url, created_at: new Date().toISOString(), task }
  subscriptions.set(id, sub)

  // Envoi immédiat du premier briefing
  await runBriefAndNotify(sub)

  console.log(`[subscribe] "${topic}" toutes les ${interval_minutes} min → Discord`)
  return c.json({ id, topic, interval_minutes, message: `Premier briefing envoyé, prochain dans ${interval_minutes} min` })
})

// Se désabonner
app.delete('/subscribe/:id', (c) => {
  const id = c.req.param('id')
  const sub = subscriptions.get(id)
  if (!sub) return c.json({ error: 'Abonnement introuvable' }, 404)
  sub.task.stop()
  subscriptions.delete(id)
  return c.json({ message: `Abonnement "${sub.topic}" supprimé` })
})

// Lister les abonnements actifs
app.get('/subscriptions', (c) => {
  const list = [...subscriptions.values()].map(({ id, topic, interval_minutes, created_at }) => ({
    id, topic, interval_minutes, created_at
  }))
  return c.json({ count: list.length, subscriptions: list })
})

// Health check
app.get('/', (c) => c.json({ status: 'ok', routes: ['POST /brief', 'POST /audio', 'POST /brief-with-audio', 'POST /subscribe', 'DELETE /subscribe/:id', 'GET /subscriptions'] }))

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('✅ BriefAI server running → http://localhost:3000')
  console.log('   POST /brief              → texte seul')
  console.log('   POST /audio             → MP3 depuis texte')
  console.log('   POST /brief-with-audio  → texte + MP3')
})
