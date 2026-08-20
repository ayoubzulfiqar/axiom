import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { bindMissionBus } from './stores/mission'
import { bindFeedBus } from './stores/feed'
import { bindMissionLog } from './stores/missionlog'
import { initTheme } from './stores/theme'
import { initDefs } from './engine/agents'
import '@fontsource/space-grotesk'
import '@fontsource/jetbrains-mono'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

initTheme()
initDefs()
bindMissionBus()
bindFeedBus()
bindMissionLog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
