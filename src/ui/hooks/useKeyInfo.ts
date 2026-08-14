import { useQuery } from '@tanstack/react-query'
import { fetchWithTimeout, mapError, API_BASE, createRawHeaders } from '../../engine/openrouter'

export function useKeyInfo() {
  const rawKey = typeof window !== 'undefined' ? localStorage.getItem('axiom.key') ?? sessionStorage.getItem('axiom.key') ?? '' : ''
  return useQuery({
    queryKey: ['key'],
    queryFn: async () => {
      const res = await fetchWithTimeout(`${API_BASE}/key`, {
        headers: createRawHeaders(rawKey),
      })
      if (!res.ok) throw new Error(await mapError(res))
      return res.json() as Promise<{ data: { usage: number; limit: number; label: string } }>
    },
    enabled: !!rawKey,
    staleTime: 30_000,
    retry: 1,
  })
}
