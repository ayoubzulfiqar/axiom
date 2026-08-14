# AXIOM Implementation Summary

## What was built
AXIOM is a production-grade agentic AI orchestration console. The user enters a mission objective, an LLM orchestrator plans and dispatches tasks to a mesh of specialized agents in parallel, and the entire execution is visualized live on a Canvas 2D scene with streaming tokens, an event feed, and a markdown artifact modal.

## Architecture
Three decoupled layers with a typed event bus as the only seam:

### Engine (`src/engine/`)
Pure TypeScript, zero React, zero DOM. Fully unit-testable.
- `types.ts` — AgentDef, BusEvent union, MissionRecord, Plan schema types
- `bus.ts` — typed emit/on/off event emitter
- `vault.ts` — BYOK key storage (local/session), masking, persistence helpers
- `openrouter.ts` — API base URL, auth header factory, raw fetch helpers
- `protocol.ts` — Zod schemas for orchestrator JSON + repair-and-retry parser
- `agents.ts` — AGENT_DEFS registry + dynamic spawn
- `orchestrator.ts` — plan loop, parallel dispatch, guardrails, abort
- `simulator.ts` — SIM mode: scripted mission via identical bus events
- `graph.ts` — node/edge data model + physics step

### Render (`src/render/`)
Canvas 2D scene, zero React imports, owns its rAF loop.
- `scene.ts` — DPR handling, grid/dust/vignette, camera transforms
- `nodes.ts` — node birth, halo, selection brackets, radar sweep, done glyph
- `edges.ts` — draw-in edges, message particles with trails, delivery flash
- `input.ts` — drag node, pan, zoom-to-cursor, click-select

### UI (`src/ui/`)
React 19 components. Never call APIs directly; consume stores + bus.
- `App.tsx` — layout shell, overlay mounts, motion wrappers
- `components/BootOverlay.tsx` — GSAP boot timeline
- `components/Header.tsx` — brand, status, metrics, controls
- `components/Roster.tsx` — agent list / mobile Sheet
- `components/Feed.tsx` — throttled event stream
- `components/Stage.tsx` — canvas host, rAF loop, bus bindings
- `components/DetailCard.tsx` — selected node inspector + model picker
- `components/VaultDialog.tsx` — BYOK key connect/verify/clear
- `components/ArtifactModal.tsx` — react-markdown + COPY button
- `components/HistoryDrawer.tsx` — Dexie mission log
- `components/ObjectivePrompt.tsx` — mission input dialog
- `hooks/` — useBus, useKeyInfo, useModels

### Stores
Zustand stores mirror engine state for the UI.
- `src/stores/mission.ts` — status, objective, step/total, fault
- `src/stores/mesh.ts` — roster mirror, agent states, model overrides
- `src/stores/vault.ts` — connected, maskedKey, balance
- `src/stores/feed.ts` — 90-entry log with ~80ms throttled flush
- `src/stores/settings.ts` — speed 1|2|4, reduced motion
- `src/ui/stores/bus.ts` — UI overlay state + bus→Zustand bridge

## Key features implemented
- BYOK vault with localStorage/sessionStorage, masked display, never-export rule
- OpenRouter integration with raw fetch, error mapping (401/402/429), 120s timeout, AbortController
- Zod-validated orchestrator protocol with repair-and-retry parsing
- Parallel agent dispatch with streaming tokens and live event bus
- Physics-based graph with node drag, edge draw-in, particles, radar sweep
- SIM mode running fully offline with identical event pipeline
- Dexie persistence for mission history and artifacts
- Tailwind v4 monochrome design system with CSS-first tokens
- GSAP boot timeline and motion/react micro-interactions
- Keyboard shortcuts (Space run/pause, Esc close overlays)
- A11y: focus rings, aria-live status, canvas role/img with aria-label
- Responsive layout: desktop asides become mobile Sheets below 940px
- Prefers-reduced-motion respected

## Build & test status
- TypeScript strict: `npx tsc -b` exits 0 with zero errors
- Vite build: `node node_modules/vite/bin/vite.js build` succeeds, outputs `dist/`
- Vitest: `tests/protocol.test.ts` — 6/6 tests pass
- Oxlint: 0 errors, 0 warnings after final fixes
- Package manager issue in this shell: `pnpm` binary path is broken, but `npx pnpm@latest` and direct `node node_modules/...` invocations work for install/build/test

## Files delivered
- `src/engine/*.ts` — 9 files
- `src/render/*.ts` — 4 files
- `src/stores/*.ts` — 5 files
- `src/ui/**/*.tsx` — 15 files
- `src/lib/db.ts` — Dexie database
- `tests/protocol.test.ts` — protocol parsing tests
- `package.json`, `pnpm-lock.yaml` — dependencies
- `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json` — configs
- `src/index.css` — Tailwind v4 theme tokens
- `README.md` — full project documentation

## Git
- Committed as: feat: implement AXIOM agentic orchestration console
- Pushed to origin/main
