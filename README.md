# AXIOM · Agentic Orchestration Console

AXIOM is a monochrome, browser-native orchestration console that turns an OpenRouter API key into a live agent mesh. The user enters a mission objective, an LLM orchestrator plans and dispatches tasks to specialized agents in parallel, and the whole execution is visualized in real time on a Canvas 2D scene with streaming tokens, event feed, and a markdown artifact modal.

## Stack

- Vite + React 19 + TypeScript 7 (strict)
- Tailwind v4 via `@tailwindcss/vite`
- State: Zustand, TanStack Query
- LLM: OpenRouter via Vercel AI SDK + `@openrouter/ai-sdk-provider`
- Animation: `motion/react`, GSAP
- Persistence: Dexie (IndexedDB)
- Markdown: react-markdown, remark-gfm, shiki
- Fonts: self-hosted via `@fontsource/space-grotesk`, `@fontsource/jetbrains-mono`
- Testing: Vitest, Playwright
- Desktop: Tauri 2 + `tauri-plugin-stronghold`

## Quick start

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
pnpm test
pnpm run test:e2e
```

If `pnpm` is unavailable or broken in your shell, use the Corepack fallback:

```bash
corepack enable
npx pnpm@latest install
npx pnpm@latest run dev
```

## Environment

- `VITE_API_BASE` — optional OpenRouter base URL. Defaults to `https://openrouter.ai/api/v1`.
- `VITE_SEARCH_ENDPOINT` — optional Wikipedia-compatible search endpoint for `web_search`.
- All network calls go to OpenRouter directly from the browser. For production, route through your own proxy and set `VITE_API_BASE` to that proxy origin.

### Proxy mode

Deploy `proxy/worker.ts` to Cloudflare Workers:

```bash
cd proxy
npx wrangler deploy
```

Then set `VITE_API_BASE` to the worker origin. The proxy handles CORS, rate limiting, and unbuffered SSE streaming.

## BYOK / Security

- The user supplies their own OpenRouter key via the Vault dialog.
- Keys are stored in `localStorage` by default, or `sessionStorage` when “Session only” is checked.
- In Tauri desktop builds, keys are stored via `tauri-plugin-stronghold` instead of web storage.
- Keys are masked in the UI as `••••+last4` and are never logged or sent anywhere except the `Authorization` header.
- AXIOM never persists mission artifacts with secrets; artifacts contain only model output.

## Graph model

AXIOM now treats missions as a production graph with typed primitives:

- **NODE**: an agent with a role, model, system prompt, declared `outputSchema`, `failure` state, and per-role `policy` (retries, fallback model, on-fail behavior). Default schemas enforce structured JSON for researcher, analyst, writer, and critic.
- **EDGE**: a routed dispatch from orchestrator to worker. Edges carry artifact references (`artifactId`, `summary`) in planning context, never full transcripts.
- **STATE**: durable mission state stored via Dexie `checkpoints` after every step and gate/policy event. Enables resume after reload or interruption.
- **ROUTER**: deterministic orchestrator loop. Tracks route decisions, artifact refs, convergence, and step budgets. History contains references + summaries only.
- **GATE**: `final-gate` runs every time `final` is emitted. Deterministic checks validate content, schema, and citations. An independent critique pass follows. FAIL routes back for repair up to 2 rounds; exhausted failures deliver with `verified:false`.

### Events

New additive bus events:

- `artifact-stored` — emitted when an artifact is persisted.
- `gate-start` / `gate-pass` / `gate-fail` — final-gate lifecycle.
- `policy-applied` — per-node failure policy decision.
- `convergence` — emitted when research hits dry rounds or budget cap.
- `approval-requested` — emitted when delivery requires human approval.
- `checkpoint-updated` — emitted after every durable state write.
- `resume-available` — emitted on app load when interrupted missions can be resumed.

### Settings

- **Require approval before delivery** — persisted toggle. Default ON for real missions, OFF in SIM mode. When enabled, gate PASS puts the mission into `awaiting-approval`; the ApprovalDialog lets users Approve, Reject with feedback, or Abort.

### Resume semantics

- On app load, AXIOM scans checkpoints with status `running|paused|awaiting-approval|interrupted` and surfaces a **RESUME MISSION** button in Header.
- Resume restores history from artifact references + decisions, continues from `currentStep`, and logs `SYS ▸ resumed from step N`.
- RESET and completion clear/archive checkpoints. Abort marks `interrupted`.

## Architecture

### Engine (`src/engine/`)
Pure TypeScript, zero React/DOM. Owns:
- `types.ts` — `BusEvent`, `AgentDef`, `Plan`, `MissionRecord`, `ArtifactRecord`, `CheckpointRecord`
- `bus.ts` — typed event bus used as the only cross-layer seam
- `vault.ts` — key storage, masking, localStorage/sessionStorage/Stronghold helpers, budget guard
- `openrouter.ts` — `API_BASE`, auth header factory, `/key` and `/models` fetch helpers
- `protocol.ts` — Zod schema for orchestrator JSON + repair-and-retry parser
- `agents.ts` — `AGENT_DEFS` registry, model overrides, dynamic spawn, output schemas, policies
- `artifacts.ts` — artifact schema, structured summary extraction, repair parser, artifact-stored event helper
- `gates.ts` — `final-gate` deterministic checks, critique, repair rounds, verdict emission
- `policies.ts` — per-role failure policy resolution and `policy-applied` bus emission
- `checkpoints.ts` — durable mission checkpoint store with localStorage + memory fallback
- `storage.ts` — Dexie-backed `ArtifactStore` and `CheckpointStore`
- `orchestrator.ts` — plan loop, parallel dispatch, artifact persistence, gate integration, convergence, budgets
- `simulator.ts` — offline SIM mode exercising artifact store, gate, policy, convergence, checkpoints
- `graph.ts` — node/edge data model + physics step
- `tools.ts` — `web_search` and `code_exec` tool registry with Zod schemas

### Render (`src/render/`)
Canvas 2D scene, zero React imports, owns its `requestAnimationFrame` loop:
- `scene.ts` — DPR handling, grid/dust/vignette, camera transforms
- `nodes.ts` — node birth, halo, selection brackets, radar sweep, done glyph
- `edges.ts` — draw-in edges, message particles with trails, delivery flash
- `input.ts` — drag node, pan, zoom-to-cursor, click-select

### UI (`src/ui/`)
React 19 components. Never call APIs directly; consume stores + bus:
- `App.tsx` — layout shell, overlay mounts, motion wrappers
- `components/BootOverlay.tsx` — GSAP boot timeline
- `components/Header.tsx` — brand, status, metrics, controls, resume button
- `components/Roster.tsx` — agent list / mobile Sheet
- `components/Feed.tsx` — throttled event stream with gate/policy/convergence lines
- `components/Stage.tsx` — canvas host, rAF loop, bus bindings
- `components/DetailCard.tsx` — selected node inspector + model picker + tool list + contract section
- `components/ArtifactModal.tsx` — react-markdown + COPY + verification badge
- `components/HistoryDrawer.tsx` — Dexie mission log
- `components/ObjectivePrompt.tsx` — mission input dialog
- `components/GraphDrawer.tsx` — inspectable routing decisions drawer
- `components/ApprovalDialog.tsx` — human approval / escalation dialog
- `hooks/` — useBus, useKeyInfo, useModels

### Stores (`src/stores/` and `src/ui/stores/`)
Zustand stores:
- `mission.ts` — status, objective, step/total, fault, current artifact id, verified flag
- `mesh.ts` — roster mirror, agent states, model overrides, tool list
- `vault.ts` — connected, masked key, balance, async connect/disconnect
- `feed.ts` — 90-entry log with ~80ms throttled flush, gate/policy/convergence entries
- `settings.ts` — speed 1|2|4, reduced motion
- `ui/stores/bus.ts` — UI overlay state + bus→Zustand bridge

## Tool-calling

AXIOM agents can use built-in tools during streaming:

- `web_search` — searches Wikipedia REST API for top 5 page results. Attached to RESEARCHER by default. Overridable via `VITE_SEARCH_ENDPOINT`.
- `code_exec` — executes JavaScript in a sandboxed context with 2s timeout. Attached to ANALYST by default. Output is marked `untrusted`.

Tools emit `tool-call` and `tool-result` bus events, which appear in the Feed and ping the node canvas.

## Persistence

- Dexie `missions` table: `id`, `objective`, `endedAt`, `steps`, `tokens`, `artifact`
- Dexie `artifacts` table: `id`, `missionId`, `nodeId`, `kind`, `summary`, `content`, `createdAt`
- Dexie `checkpoints` table: `missionId`, `status`, `currentStep`, `completedNodes`, `decisions`, `artifactIds`, `budgets`, `updatedAt`
- Browser: localStorage/sessionStorage for keys, model overrides, speed, session-only flag, checkpoints
- Desktop: `tauri-plugin-stronghold` for secure key storage

## Keyboard & A11y

- Space: run/pause
- Esc: close overlays
- Focus rings, `aria-live` status, real buttons
- Canvas: `role="img"` with descriptive `aria-label`

## Desktop packaging (Tauri 2)

Prerequisites:
- Rust toolchain (`rustup`, `cargo`)
- System dependencies for Tauri (WebView2 on Windows, webkit2gtk on Linux, Xcode on macOS)

Commands:
```bash
pnpm run tauri:dev
pnpm run tauri:build
```

The desktop app uses `tauri-plugin-stronghold` for key storage. The same `dist/` bundle works for Capacitor mobile builds.

## Production hardening

- TypeScript strict, no `any`. Zod inference for protocol and output types.
- No runtime third-party CDNs. Fonts are self-hosted.
- Recommended CSP: `connect-src https://openrouter.ai` or your proxy origin.
- Budget guard: refuses missions when OpenRouter key usage ≥ limit − $0.05.
- Error mapping: 401 → AUTH, 402 → CREDITS, 429 → RATE with one retry.
- Per-node policy: transient errors retry with backoff; 401/402 stop mission; schema failures repair; model unavailable falls back once; escalation goes to human gate.
- Durable state: checkpoints written after every step and gate/policy event; resume on reload.
- Final gate: every `final` artifact passes deterministic checks plus independent critique; never crashes the mission on bad contracts.
- Tauri 2 / Capacitor compatible: no SSR dependency, no CDN runtime fetches.

## License

MIT
