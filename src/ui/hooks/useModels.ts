import { useQuery } from '@tanstack/react-query'
import { fetchWithTimeout, API_BASE, createRawHeaders } from '../../engine/openrouter'

export function useModels() {
  const rawKey = typeof window !== 'undefined' ? localStorage.getItem('axiom.key') ?? sessionStorage.getItem('axiom.key') ?? '' : ''
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await fetchWithTimeout(`${API_BASE}/models`, {
        headers: createRawHeaders(rawKey),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { data: { id: string; name: string; context_length: number; pricing: { prompt: string; completion: string } }[] }
      return json.data
    },
    enabled: !!rawKey,
    staleTime: 1000 * 60 * 60,
  })
}
