import { z } from 'zod'

export const tools = {
  web_search: {
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
  },
  code_exec: {
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
  },
  knowledge_search: {
    description: 'Search local RAG knowledge base with cosine similarity.',
    inputSchema: z.object({ query: z.string().max(500), topK: z.number().max(10).optional() }),
    execute: async ({ query, topK }: { query: string; topK?: number }) => {
      try {
        const { searchKnowledge } = await import('../engine/client')
        const results = await searchKnowledge(query, topK ?? 5)
        return { results }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'knowledge search failed' }
      }
    },
  },
}

export type ToolName = keyof typeof tools
