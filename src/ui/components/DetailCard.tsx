import { useBus } from '../stores/bus'
import { useMeshStore } from '../../stores/mesh'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Button } from '../components/ui/button'
import { getDef } from '../../engine/agents'
import type { AgentDef } from '../../engine/types'

export function DetailCard() {
  const open = useBus((s: { detailOpen: boolean }) => s.detailOpen)
  const selectedId = useMeshStore((s: { selectedId: string | null }) => s.selectedId)
  const roster = useMeshStore((s: { roster: Record<string, { id: string; label: string; state: string; role: string; tasks: string[]; model: string; tools?: string[] }> }) => s.roster)
  const agent = selectedId ? roster[selectedId] : null
  const def: AgentDef | undefined = selectedId ? getDef(selectedId) : undefined

  if (!open || !agent) return null

  const handleModelChange = (value: string) => {
    if (selectedId) useMeshStore.setState({ roster: { ...roster, [selectedId]: { ...roster[selectedId], model: value } } })
  }

  return (
    <Card className="absolute bottom-4 right-4 w-80 border-line bg-panel/90 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold tracking-widest">{agent.label}</CardTitle>
          <Button data-testid="close-detail" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => useMeshStore.setState({ selectedId: null })}>CLOSE</Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-dim">ROLE</span>
          <span className="font-mono">{agent.role}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">TOOLS</span>
          <span className="font-mono">{(agent.tools ?? []).join(', ') || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">MODEL</span>
          <Select value={agent.model} onValueChange={handleModelChange}>
            <SelectTrigger className="h-7 w-40 bg-transparent border-line text-ink">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent className="bg-panel border-line text-ink">
              <SelectItem value={agent.model}>{agent.model}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {def && (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] font-bold tracking-widest text-dim">CONTRACT</div>
            <div className="text-[10px] font-mono text-ink/80">
              <div>OUTPUT: {typeof def.outputSchema === 'string' ? def.outputSchema : 'structured'}</div>
              <div>FAILURE: {def.failure ?? 'default'}</div>
              <div>POLICY: retries={def.policy?.retries ?? 1} onFail={def.policy?.onFail ?? 'retry'}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
