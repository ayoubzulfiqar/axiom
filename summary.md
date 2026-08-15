# AXIOM Implementation Summary

## What was built
AXIOM is a production-grade agentic AI orchestration console. The user enters a mission objective, an LLM orchestrator plans and dispatches tasks to a mesh of specialized agents in parallel, and the entire execution is visualized live on a Canvas 2D scene with streaming tokens, an event feed, and a markdown artifact modal.

## Phase 2 Addendum — Execution Physics
The graph was extended with anti-bias gates, isolated shard artifacts, deterministic merge, Amdahl telemetry, graph shapes, and expanded tests/docs.

### Anti-Bias Gate (Task 10)
- Fresh Context: `runFreshCritic()` builds an isolated critic prompt with system + artifact-only context. It never sees generator chain-of-thought or draft history.
- Jury Mode: `runFinalGate()` supports `options.juryMode`; when enabled it spawns 3 independent critics across model families, emits `jury-vote` events, and applies majority rule (`>=2` passes).
- Deterministic critic for offline SIM; no network dependency.

### Isolated Shards + Deterministic Merge (Task 11)
- `ArtifactRecord.kind` supports `draft-shard`.
- Writer shards emit `draft-shard` artifacts that never leak full transcripts into planning context.
- `mergeShards()` in `orchestrator.ts` deterministically merges writer shards into a single `final` artifact.
- Orchestrator activates merge when `plan.merge` is true and multiple writer shards are present.

### Amdahl Telemetry (Task 12)
- `src/engine/telemetry.ts` exposes `calculateTelemetry()`.
- Orchestrator emits `telemetry-updated` with `serialMs`, `parallelMs`, `totalMs`, `maxConcurrentWorkers`.
- Header renders a telemetry HUD chip: `⚡ actual / theoretical max`.
- Merge time is counted as serial work for realistic speedup math.

### Graph Shapes (Task 13)
- `GRAPH_SHAPES` config in `simulator.ts`: `standard`, `deep-research`, `adversarial`, `broad-sweep`.
- Shape selector in `ObjectivePrompt.tsx` with active-state styling.
- SIM paths for each shape emit distinct events: convergence, policy-applied, approval-requested, mission-complete.

### Expanded Tests/Docs (Task 14)
- Unit tests: `tests/gates.test.ts`, `tests/telemetry.test.ts`, `tests/merge.test.ts`.
- Playwright e2e: per-shape assertions for artifact modal, telemetry chip, and adversarial flow.
- README updated with Phase 2 sections.

### Orchestrator Merge Activation (Task 2 refinement)
- `src/engine/orchestrator.ts` now tracks dispatch results with agent identity.
- Writer-role shards are detected and merged via `mergeShards()`.

### UI Polish
- `ObjectivePrompt.tsx` graph shape selector with `GRAPH SHAPE` label and stronger active-state styling.
- `Header.tsx` telemetry chip text normalized to `actual / theoretical max`.

## Phase 3 — Production Polish & Capability Pass
Closed final production gaps: cost observability, context management, worker offload, and local RAG.

### Cost Attribution (Task 1)
- New `src/engine/cost.ts`: caches model pricing, records per-node/mission cost, emits `cost-updated`.
- SIM mode emits deterministic mock costs via `simulateCost()`.
- UI: `Header.tsx` cost chip, `GraphDrawer.tsx` cost bars, `DetailCard.tsx` cost section.

### Context Management (Task 2)
- New `src/engine/context.ts`: builds orchestrator messages under `CONTEXT_BUDGET`.
- Always includes system + objective + graph shape + available agents + last 3 steps.
- Older steps are compacted into a one-line-per-step digest with `context-compacted` event.

### Worker Offload (Task 3)
- New `src/engine/worker.ts` + `src/engine/client.ts`.
- Worker hosts orchestrator loop, LLM fetch/stream, artifact/checkpoint writes, merge, cost, RAG.
- Client exposes `runMission`, `abortMission`, `ingestFile`, `searchKnowledge`, `destroy`.
- Graceful in-thread fallback when `Worker` is unavailable.
- Canvas/render stays on UI thread; OffscreenCanvas noted as future path.

### Local RAG (Task 4)
- New `src/engine/rag.ts`: chunking, embedding, cosine search, ingest/search bus events.
- `knowledge_search` tool attached to RESEARCHER via `src/engine/tools.ts`.
- Dexie `chunks` table added in `src/lib/db.ts` and `src/engine/storage.ts`.
- `src/ui/components/FileDropZone.tsx` provides drag/drop + browse ingestion UI.
- SIM mode uses deterministic in-memory embeddings; no runtime model download.

### Tests & Docs (Task 5)
- New Vitest files: `tests/cost.test.ts`, `tests/context.test.ts`, `tests/rag.test.ts`, `tests/worker.test.ts`.
- Playwright extended with cost chip assertion.
- README updated with Phase 3 sections: cost, context, worker, RAG, persistence.

## Architecture
Three decoupled layers with a typed event bus as the only seam:

### Engine (`src/engine/`)
Pure TypeScript, zero React, zero DOM. Fully unit-testable.
- `types.ts` — AgentDef, BusEvent union, MissionRecord, Plan schema types, GraphShape config
- `bus.ts` — typed emit/on/off event emitter
- `vault.ts` — BYOK key storage (local/session), masking, persistence helpers
- `openrouter.ts` — API base URL, auth header factory, raw fetch helpers
- `protocol.ts` — Zod schemas for orchestrator JSON + repair-and-retry parser
- `agents.ts` — AGENT_DEFS registry + dynamic spawn
- `artifacts.ts` — artifact validation, structured summary extraction, artifact-stored event helper
- `gates.ts` — `final-gate` deterministic checks, fresh-context critic, jury mode, verdict emission
- `policies.ts` — per-role failure policy resolution and `policy-applied` bus emission
- `checkpoints.ts` — durable mission checkpoint store with localStorage + memory fallback
- `storage.ts` — Dexie-backed `ArtifactStore`, `CheckpointStore`, `ChunkStore`
- `orchestrator.ts` — plan loop, parallel dispatch, artifact persistence, gate integration, convergence, budgets, deterministic merge, context compaction, cost accounting
- `simulator.ts` — offline SIM mode exercising artifacts, gates, policies, convergence, approval, graph shapes, costs
- `graph.ts` — node/edge data model + physics step
- `telemetry.ts` — Amdahl speedup calculation, telemetry-updated bus emission
- `cost.ts` — model pricing cache, per-node/mission cost accrual, cost-updated bus emission
- `context.ts` — orchestrator context builder with token budget and digest compaction
- `rag.ts` — chunking, embedding, cosine similarity, rankChunks, ingest/search bus emissions
- `worker.ts` — Web Worker host for engine work, bridges bus events via postMessage
- `client.ts` — Worker client with fallback, run/abort/ingest/search API
- `tools.ts` — `web_search`, `code_exec`, `knowledge_search` tool registry

### Render (`src/render/`)
Canvas 2D scene, zero React imports, owns its rAF loop.
- `scene.ts` — DPR handling, grid/dust/vignette, camera transforms
- `nodes.ts` — node birth, halo, selection brackets, radar sweep, done glyph, artifact flash
- `edges.ts` — draw-in edges, message particles with trails, delivery flash, used/unused alpha
- `input.ts` — drag node, pan, zoom-to-cursor, click-select

### UI (`src/ui/`)
React 19 components. Never call APIs directly; consume stores + bus.
- `App.tsx` — layout shell, overlay mounts, motion wrappers
- `components/BootOverlay.tsx` — GSAP boot timeline
- `components/Header.tsx` — brand, status, metrics, controls, telemetry HUD chip, cost chip, resume button
- `components/Roster.tsx` — agent list / mobile Sheet
- `components/Feed.tsx` — throttled event stream with gate/policy/convergence lines
- `components/Stage.tsx` — canvas host, rAF loop, bus bindings
- `components/DetailCard.tsx` — selected node inspector + model picker + tool list + contract section + cost
- `components/VaultDialog.tsx` — BYOK key connect/verify/clear
- `components/ArtifactModal.tsx` — react-markdown + COPY + verification badge
- `components/HistoryDrawer.tsx` — Dexie mission log
- `components/ObjectivePrompt.tsx` — mission input dialog with graph shape selector
- `components/GraphDrawer.tsx` — inspectable routing decisions drawer + cost by agent bars
- `components/ApprovalDialog.tsx` — human approval / escalation dialog
- `components/FileDropZone.tsx` — drag/drop + browse file ingestion UI
- `hooks/` — useBus, useKeyInfo, useModels

### Stores
Zustand stores mirror engine state for the UI.
- `src/stores/mission.ts` — status, objective, step/total, fault, current artifact id, verified flag, telemetry, decisions
- `src/stores/mesh.ts` — roster mirror, agent states, model overrides, tool list, rebuildRoster on mission-start
- `src/stores/vault.ts` — connected, maskedKey, balance, async bus.on initialization
- `src/stores/feed.ts` — 90-entry log with ~80ms throttled flush, gate/policy/convergence entries
- `src/stores/settings.ts` — speed 1|2|4, reduced motion, approvalRequired
- `src/ui/stores/bus.ts` — UI overlay state + bus→Zustand bridge, including `ragOpen`

## Key features implemented
- BYOK vault with localStorage/sessionStorage, masked display, never-export rule
- OpenRouter integration with raw fetch, error mapping (401/402/429), 120s timeout, AbortController
- Zod-validated orchestrator protocol with repair-and-retry parsing
- Parallel agent dispatch with streaming tokens and live event bus
- Physics-based graph with node drag, edge draw-in, particles, radar sweep
- SIM mode running fully offline with identical event pipeline
- Dexie persistence for mission history, artifacts, checkpoints, and RAG chunks
- Tailwind v4 monochrome design system with CSS-first tokens
- GSAP boot timeline and motion/react micro-interactions
- Keyboard shortcuts (Space run/pause, Esc close overlays)
- A11y: focus rings, aria-live status, canvas role/img with aria-label
- Responsive layout: desktop asides become mobile Sheets below 940px
- Prefers-reduced-motion respected

## Build & test status
- TypeScript strict: `npx tsc -b` exits 0 with zero errors
- Vite build: `node node_modules/vite/bin/vite.js build` succeeds, outputs `dist/`
- Vitest: `npx vitest run` passes
- Oxlint: 0 errors, 0 warnings after final fixes
- Playwright: `npx playwright test e2e/sim.spec.ts --project=chromium` passes
- Package manager note: `pnpm` binary path can be broken in some shells; `npx pnpm@latest` and direct `node node_modules/...` invocations work for install/build/test

## Files delivered
- `src/engine/*.ts` — 18 files
- `src/render/*.ts` — 4 files
- `src/stores/*.ts` — 5 files
- `src/ui/**/*.tsx` — 16 files
- `src/lib/db.ts` — Dexie database
- `tests/*.test.ts` — 13 test files
- `e2e/sim.spec.ts` — Playwright SIM e2e
- `package.json`, `pnpm-lock.yaml` — dependencies
- `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json` — configs
- `src/index.css` — Tailwind v4 theme tokens
- `README.md` — full project documentation

## Git
- Latest commit: docs: add Phase 3 sections to README
- Pushed to origin/main
