# GSD Agent Roles for Signal Forge

This is the GSD orchestration map for the build. Each role gets a fresh context
and a tightly scoped brief; the orchestrator (main thread) integrates results.

## Roles

- **Researcher** — read SPEC.md, surface ambiguities, propose structure. Used
  ad-hoc; not always needed.
- **Planner** — sequences work, identifies parallelizable units. Lives in the
  orchestrator (main thread).
- **Executor (Engine)** — implements `engine/*` with TDD-first tests under
  `src/tests/*`. Owns: `rng.ts`, `runEngine.ts`, `saveEngine.ts` (+ stubs for
  cardEngine, scoring, scenarioEngine, backcastingEngine).
- **Executor (Data)** — writes `data/*.json` to schema. Owns: missions (all 7),
  signal cards (seed batch), balance, factions/unlocks/actions placeholders.
- **Executor (UI)** — implements three screens + minimal components, wires the
  Zustand store. Owns: `App.tsx`, `screens/*`, `components/*`, `store/gameStore.ts`.
- **Verifier** — runs `npm run build` + `npm run test`, posts diffs to fix.
- **Debugger** — invoked only on red verifier output.

## Parallelization

After the orchestrator scaffolds the project + writes types:

```
┌── Engine Executor (TDD: rng, runEngine, saveEngine + stubs)
├── Data Executor   (missions.ai.json, balance.json, seed cards, placeholders)
└── UI Executor     (gameStore, App, MainMenu/MissionSelect/MissionBrief, components)
```

Then orchestrator runs Verifier and ships.

## Hard rules every agent must obey

1. **TDD**: tests come before implementation for every engine unit.
2. **Schema-first**: types in `src/types/*` are source of truth; data files conform.
3. **No FTI branding**: never reference Future Today Institute or its trademarks.
4. **Original Strate-chic Method** is the in-game methodology; the acronym is
   `S-T-R-A-T-E-C` (Set Frame, Track Signals, Relate Patterns, Authenticate
   Trends, Trace Velocity, Envision Futures, Commit Backcast).
5. **Local-first**: no network calls, no backend, no telemetry.
6. **Determinism**: anything that touches randomness uses the seeded RNG.
7. **No new files** beyond what SPEC.md authorizes for this PR.

## Verifier checklist (definition-of-done for this PR)

- [ ] `npm install` clean
- [ ] `npm run build` green
- [ ] `npm run test` green; ≥ 3 test files; ≥ 6 assertions
- [ ] App boots; navigation works MainMenu → MissionSelect → MissionBrief → back
- [ ] localStorage round-trip works (manual smoke)
- [ ] Repo tree matches SPEC.md
- [ ] No FTI references anywhere
