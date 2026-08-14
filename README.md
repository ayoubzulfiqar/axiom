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

## Architecture

### Engine (`src/engine/`)
Pure TypeScript, zero React/DOM. Owns:
- `types.ts` — `BusEvent`, `AgentDef`, `Plan`, `MissionRecord`
- `bus.ts` — typed event bus used as the only cross-layer seam
- `vault.ts` — key storage, masking, localStorage/sessionStorage/Stronghold helpers, budget guard
- `openrouter.ts` — `API_BASE`, auth header factory, `/key` and `/models` fetch helpers
- `protocol.ts` — Zod schema for orchestrator JSON + repair-and-retry parser
- `agents.ts` — `AGENT_DEFS` registry, model overrides, dynamic spawn
- `orchestrator.ts` — plan loop, parallel dispatch, guardrails, abort, AI SDK integration
- `simulator.ts` — offline SIM mode with identical bus events
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
- `components/Header.tsx` — brand, status, metrics, controls
- `components/Roster.tsx` — agent list / mobile Sheet
- `components/Feed.tsx` — throttled event stream
- `components/Stage.tsx` — canvas host, rAF loop, bus bindings
- `components/DetailCard.tsx` — selected node inspector + model picker + tool list
- `components/VaultDialog.tsx` — BYOK key connect/verify/clear
- `components/ArtifactModal.tsx` — react-markdown + COPY
- `components/HistoryDrawer.tsx` — Dexie mission log
- `components/ObjectivePrompt.tsx` — mission input dialog
- `hooks/` — useBus, useKeyInfo, useModels

### Stores (`src/stores/` and `src/ui/stores/`)
Zustand stores:
- `mission.ts` — status, objective, step/total, fault
- `mesh.ts` — roster mirror, agent states, model overrides, tool list
- `vault.ts` — connected, masked key, balance, async connect/disconnect
- `feed.ts` — 90-entry log with ~80ms throttled flush
- `settings.ts` — speed 1|2|4, reduced motion
- `ui/stores/bus.ts` — UI overlay state + bus→Zustand bridge

## Tool-calling

AXIOM agents can use built-in tools during streaming:

- `web_search` — searches Wikipedia REST API for top 5 page results. Attached to RESEARCHER by default. Overridable via `VITE_SEARCH_ENDPOINT`.
- `code_exec` — executes JavaScript in a sandboxed context with 2s timeout. Attached to ANALYST by default. Output is marked `untrusted`.

Tools emit `tool-call` and `tool-result` bus events, which appear in the Feed and ping the node canvas.

## Persistence

- Dexie `missions` table: `id`, `objective`, `endedAt`, `steps`, `tokens`, `artifact`
- Browser: localStorage/sessionStorage for keys, model overrides, speed, session-only flag
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

- TypeScript strict, no `any`. Zod inference for protocol types.
- No runtime third-party CDNs. Fonts are self-hosted.
- Recommended CSP: `connect-src https://openrouter.ai` or your proxy origin.
- Budget guard: refuses missions when OpenRouter key usage ≥ limit − $0.05.
- Error mapping: 401 → AUTH, 402 → CREDITS, 429 → RATE with one retry.
- Tauri 2 / Capacitor compatible: no SSR dependency, no CDN runtime fetches.

## License

MIT
