# Signal Forge: Future of AI — Spec (GSD)

This file is the externalized spec of record. Agents must consult it before acting.
The full product specification lives in the originating roadmap. This SPEC.md is the
**operational** view used by the GSD pipeline.

## North Star

A playable card-strategy roguelite MVP that walks the player through the
**Strate-chic Method** (S-T-R-A-T-E-C) for a Future-of-AI mission, ending with a
Future Readiness Score and meta-progression rewards. Local-first, no backend.

## Stack (locked)

- React 18 + TypeScript + Vite
- Zustand (state)
- Tailwind CSS (styling)
- dnd-kit (drag/drop, used from Pattern Board onward)
- Vitest (tests)
- localStorage (persistence)

## Current scope: Milestones 1 + 2 only

Per the originating spec section 25, the first build target is M1 + M2:

1. Scaffold Vite/React/TS app with the prescribed repo structure.
2. Tailwind, ESLint, Vitest configured.
3. Type definitions: `cards.ts`, `game.ts`, `missions.ts`, `scoring.ts`.
4. Seeded RNG (`engine/rng.ts`) — deterministic from a seed string.
5. Run creation (`engine/runEngine.ts`) — produces a deterministic run state from
   `(missionId, seed)`.
6. Mission loading from `data/missions.ai.json`.
7. Placeholder data files for cards/actions/factions/balance/unlocks.
8. Basic screen switching: MainMenu → MissionSelect → MissionBrief.
9. Save/load shell: `saveGame`, `loadGame`, `clearSave`, `exportSave`, `importSave`.
10. Tests: seeded RNG repeatability + initial run creation determinism.

**Out of scope for this PR:** Pattern Board, Trend Validation, Velocity Matrix,
Scenario Forge, Backcast, Run Outcome screens, Archive, full 110-card deck,
visual polish.

## Acceptance criteria (this PR)

- `npm install` succeeds.
- `npm run build` passes (tsc + vite build).
- `npm run test` passes — deterministic RNG and run-creation tests included.
- App boots; user can navigate MainMenu → MissionSelect → MissionBrief and back.
- Selecting a mission seeds a run that is reproducible from seed.
- Save/load round-trips through localStorage; invalid imports are rejected safely.
- No FTI branding, names, or visuals anywhere in the UI.
- Repository structure matches the spec.

## Naming / brand guardrails

- Title: `Signal Forge: Future of AI`
- Method: `Strate-chic Method` (S-T-R-A-T-E-C)
- No FTI / Future Today Institute branding. No copied visual templates.

## File map (this PR)

```
signal-forge/  (root of repo, not a subdir — installed at project root)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .eslintrc.cjs
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── data/
│   │   ├── cards.ai.signals.json   (seed ~12 placeholder cards for M1+M2)
│   │   ├── cards.actions.json      (placeholder)
│   │   ├── missions.ai.json        (all 7 missions, brief metadata)
│   │   ├── factions.json           (placeholder)
│   │   ├── balance.json            (defaults from spec §19)
│   │   └── unlocks.json            (placeholder)
│   ├── engine/
│   │   ├── rng.ts
│   │   ├── runEngine.ts
│   │   ├── saveEngine.ts
│   │   └── (cardEngine, scoring, scenarioEngine, backcastingEngine — stubs only)
│   ├── store/gameStore.ts
│   ├── types/{cards,game,missions,scoring}.ts
│   ├── components/{Card,ResourceBar,StageHeader}.tsx (minimal)
│   ├── screens/{MainMenu,MissionSelect,MissionBrief}.tsx (real)
│   └── tests/{rng,runEngine,saveEngine}.test.ts
└── README.md
```

We install at the **repo root** (not in a `signal-forge/` subdir) because the
repo is dedicated to this project. The roadmap's nested layout is otherwise
preserved.

## TDD plan

For each engine unit, write the failing test first, then implement.

- `tests/rng.test.ts`
  - same seed → identical first-N draws (`next`, `pick`, `shuffle`)
  - different seeds → different draws
  - shuffle preserves multiset
- `tests/runEngine.test.ts`
  - `createRun({missionId, seed})` is pure: equal inputs → equal output
  - run starts at `MISSION_BRIEF`
  - `startingResources` sourced from `balance.json`
  - mission lookup: unknown missionId throws
- `tests/saveEngine.test.ts`
  - round-trip: save → load returns deep-equal payload
  - `clearSave` removes the key
  - `importSave` rejects malformed JSON & wrong shape

## Risks

- Tailwind v4 vs v3 config differences. Lock to Tailwind v3 for predictability.
- dnd-kit not exercised in this PR; install but don't import to avoid bundle bloat.
- Network availability for `npm install` in this env — verify before parallel dispatch.
