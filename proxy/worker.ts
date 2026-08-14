export interface Env {
  OPENROUTER_KEY: string
  ALLOWED_ORIGIN: string
}

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 20
const rateBuckets = new Map<string, { count: number; resetAt: number }>()
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt < now) rateBuckets.delete(key)
  }
}, 10_000)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN },
      })
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') ?? '*',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    if (!url.pathname.startsWith('/v1/')) {
      return new Response('Not found', { status: 404 })
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const now = Date.now()
    const bucket = rateBuckets.get(ip)
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    } else {
      bucket.count++
      if (bucket.count > RATE_LIMIT_MAX) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
        return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded', retry_after: retryAfter } }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
          },
        })
      }
    }

    const upstream = new Request('https://openrouter.ai/api' + url.pathname + url.search, {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.body,
      duplex: 'half',
    })
    upstream.headers.set('Authorization', `Bearer ${env.OPENROUTER_KEY}`)
    upstream.headers.delete('cookie')

    const res = await fetch(upstream)
    const passthroughHeaders = new Headers()
    passthroughHeaders.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN)
    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      passthroughHeaders.set('Content-Type', 'text/event-stream')
      const body = res.body
      if (body) {
        return new Response(body, {
          status: res.status,
          headers: passthroughHeaders,
        })
      }
    }
    const data = await res.arrayBuffer()
    return new Response(data, {
      status: res.status,
      headers: passthroughHeaders,
    })
  },
}
