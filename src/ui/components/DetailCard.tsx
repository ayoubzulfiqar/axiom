import { useBus } from '../stores/bus'
import { useMeshStore } from '../../stores/mesh'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

export function DetailCard() {
  const open = useBus((s: { detailOpen: boolean }) => s.detailOpen)
  const selectedId = useMeshStore((s: { selectedId: string | null }) => s.selectedId)
  const roster = useMeshStore((s: { roster: Record<string, { label: string; state: string; role: string; tasks: string[]; model: string }> }) => s.roster)
  const agent = selectedId ? roster[selectedId] : null

  if (!open || !agent) return null

  const handleModelChange = (model: string) => {
    if (selectedId) {
      useMeshStore.setState((s) => ({
        roster: { ...s.roster, [selectedId]: { ...s.roster[selectedId], model } },
      }))
    }
  }

  return (
    <div className="fixed bottom-6 left-6 z-30 w-72">
      <Card className="border-line bg-panel/80 backdrop-blur-xl text-ink">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold tracking-widest flex items-center justify-between">
            <span>{agent.label}</span>
            <span className="text-[10px] font-mono text-dim">{agent.state.toUpperCase()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-dim">ROLE</span>
            <span className="font-mono">{agent.role}</span>
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
          <div className="flex justify-between">
            <span className="text-dim">TASKS</span>
            <span className="font-mono">{agent.tasks.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
