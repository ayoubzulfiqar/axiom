import { useBus } from '../stores/bus'
import { useMeshStore } from '../../stores/mesh'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Button } from '../components/ui/button'
import { getDef } from '../../engine/agents'
import { getMissionCost } from '../../engine/cost'
import type { AgentDef } from '../../engine/types'
import { motion } from 'motion/react'
import { AnimatedNumber, springSoft } from '../fx'

const MODEL_OPTIONS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
]

const STATE_TONE: Record<string, string> = {
  idle: 'text-muted-foreground',
  running: 'text-info',
  done: 'text-success',
  fault: 'text-destructive',
}

export function DetailCard() {
  const open = useBus((s) => s.detailOpen)
  const selectedId = useMeshStore((s) => s.selectedId)
  const roster = useMeshStore((s) => s.roster)
  const agent = selectedId ? roster[selectedId] : null
  const def: AgentDef | undefined = selectedId ? getDef(selectedId) : undefined

  if (!open || !agent) return null

  const handleModelChange = (value: string) => {
    if (selectedId) {
      useMeshStore.setState({
        roster: { ...roster, [selectedId]: { ...roster[selectedId], model: value } },
      })
    }
  }

  const nodeCost = selectedId ? getMissionCost().byNode[selectedId] : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={springSoft}
      className="absolute bottom-4 right-4 z-20 w-80"
    >
      <Card className="border-border shadow-2xl shadow-black/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.span
                className={`h-2 w-2 rounded-full ${agent.state === 'running' ? 'bg-info' : agent.state === 'done' ? 'bg-success' : agent.state === 'fault' ? 'bg-destructive' : 'bg-muted-foreground'}`}
                animate={agent.state === 'running' ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <CardTitle className="font-mono text-sm">{agent.label}</CardTitle>
            </div>
            <Button
              data-testid="close-detail"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] uppercase tracking-wider text-muted-foreground"
              onClick={() => useMeshStore.setState({ selectedId: null })}
            >
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-background/50 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Role</div>
              <div className="mt-0.5 font-mono text-foreground">{agent.role}</div>
            </div>
            <div className="rounded-md border border-border bg-background/50 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">State</div>
              <div className={`mt-0.5 font-mono uppercase ${STATE_TONE[agent.state] ?? 'text-foreground'}`}>
                {agent.state}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">Model</div>
            <Select value={agent.model} onValueChange={handleModelChange}>
              <SelectTrigger data-testid="detail-model-trigger" className="border-border">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
                {!MODEL_OPTIONS.includes(agent.model) && (
                  <SelectItem value={agent.model}>{agent.model}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">Tools</div>
            <div className="flex flex-wrap gap-1.5">
              {(agent.tools ?? []).length > 0 ? (
                (agent.tools ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded border border-border bg-background/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              )}
            </div>
          </div>

          {def && (
            <div className="rounded-md border border-border bg-background/50 p-2.5">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">Contract</div>
              <div className="space-y-0.5 font-mono text-[10px] text-foreground/80">
                <div>OUTPUT: {typeof def.outputSchema === 'string' ? def.outputSchema : 'structured'}</div>
                <div>FAILURE: {def.failure ?? 'default'}</div>
                <div>POLICY: retries={def.policy?.retries ?? 1} onFail={def.policy?.onFail ?? 'retry'}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-background/50 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Tokens</div>
              <div className="mt-0.5 font-mono text-foreground">
                <AnimatedNumber value={nodeCost ? nodeCost.tokens : null} decimals={0} suffix="" />
              </div>
            </div>
            <div className="rounded-md border border-border bg-background/50 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Cost</div>
              <div className="mt-0.5 font-mono text-foreground">
                <AnimatedNumber value={nodeCost ? nodeCost.costUsd : null} decimals={4} prefix="$" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
