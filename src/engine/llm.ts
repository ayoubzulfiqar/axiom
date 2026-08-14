import { z } from 'zod'
import { generateText, streamText, tool } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export type Provider = ReturnType<typeof createOpenRouter>

export async function planOnce(opts: {
  model: string
  system: string
  user: string
  signal?: AbortSignal
  maxTokens?: number
}): Promise<string> {
  const provider = getProvider()
  const { text } = await generateText({
    model: provider.chat(opts.model),
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    abortSignal: opts.signal,
    maxTokens: opts.maxTokens ?? 1500,
  })
  return text
}

export async function workerStream(opts: {
  model: string
  system: string
  user: string
  signal?: AbortSignal
  maxTokens?: number
  tools?: Record<string, any>
  maxSteps?: number
  onChunk?: (chunk: { textDelta?: string }) => void
}): Promise<{ text: string }> {
  const provider = getProvider()
  const result = await streamText({
    model: provider.chat(opts.model),
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    abortSignal: opts.signal,
    maxTokens: opts.maxTokens ?? 1500,
    tools: opts.tools,
    maxSteps: opts.maxSteps,
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta' && opts.onChunk) {
        opts.onChunk({ textDelta: chunk.textDelta })
      }
    },
  })
  return { text: await result.text }
}

export function makeWebSearchTool() {
  return tool({
    description: 'Search Wikipedia for pages matching a query.',
    inputSchema: z.object({ query: z.string().max(200) }),
    execute: async ({ query }: { query: string }) => {
      const endpoint = import.meta.env.VITE_SEARCH_ENDPOINT ?? `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=5`
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 8000)
      try {
        const res = await fetch(endpoint, { signal: controller.signal })
        clearTimeout(id)
        if (!res.ok) return { error: `search HTTP ${res.status}` }
        const data = (await res.json()) as { pages?: { title: string; excerpt: string }[] }
        return { results: (data.pages ?? []).map((p) => ({ title: p.title, excerpt: p.excerpt })) }
      } catch (e) {
        clearTimeout(id)
        return { error: e instanceof Error ? e.message : 'search failed' }
      }
    },
  } as any)
}

export function makeCodeExecTool() {
  return tool({
    description: 'Execute JavaScript code in a sandboxed context.',
    inputSchema: z.object({ code: z.string().max(4000) }),
    execute: async ({ code }: { code: string }) => {
      try {
        const result = new Function(`"use strict"; return (function() { ${code} })()`)
        return { result: result(), marked: 'untrusted' }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'execution failed' }
      }
    },
  } as any)
}

let providerReturn: ReturnType<typeof createOpenRouter> | null = null

function getProvider() {
  if (providerReturn) return providerReturn
  providerReturn = createOpenRouter({
    apiKey: '',
    headers: {
      'HTTP-Referer': typeof location !== 'undefined' ? location.origin : '',
      'X-Title': 'AXIOM Orchestration',
    },
  })
  return providerReturn
}

export function setProvider(provider: Provider) {
  providerReturn = provider
}

export function resetProvider() {
  providerReturn = null
}
