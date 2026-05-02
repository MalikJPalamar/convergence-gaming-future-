# Signal Forge: Future of AI

A card-strategy roguelite that walks the player through the **Strate-chic Method**
(S-T-R-A-T-E-C) for a Future-of-AI mission, ending with a Future Readiness Score.
Local-first prototype — no backend, no telemetry.

> Strate-chic Method: **S**et the Frame · **T**rack Signals · **R**elate Patterns ·
> **A**uthenticate Trends · **T**race Velocity · **E**nvision Futures ·
> **C**ommit the Backcast.

## Status — MVP slice (Milestones 1 + 2)

This branch implements the foundation: scaffold, types, seeded engine, save/load,
mission pack, and the first three screens (Main Menu, Mission Select, Mission
Brief). Stages 3–10 of the run pipeline render placeholder screens that will be
filled in subsequent milestones.

- ✅ React + TypeScript + Vite + Tailwind + Zustand
- ✅ Seeded RNG (Mulberry32 + FNV-1a) with deterministic shuffle/fork
- ✅ Pure `createRun()` — equal `(missionId, seed)` ⇒ equal `RunState`
- ✅ Save/load shell (`localStorage`), import-shape-validated
- ✅ 7 missions, 38 signal cards (30 for the Agent Layer vertical slice)
- ✅ 30 tests (rng, runEngine, saveEngine, cardEngine, App smoke)
- ⏳ Pattern Board → Run Outcome screens (M3–M8)
- ⏳ Full 110+ card deck (M9)

## Quickstart

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # 30 tests
npm run build    # tsc -b && vite build
```

## Repository

```
src/
├── data/        # missions.ai.json, cards.ai.signals.json, balance.json, …
├── engine/      # rng, runEngine, saveEngine (+ stubs for later stages)
├── store/       # Zustand game store wired to engine + save/load
├── types/       # cards, game, missions, scoring — source of truth
├── components/  # Card, ResourceBar, StageHeader
├── screens/     # MainMenu, MissionSelect, MissionBrief, … (stubs for later)
└── tests/       # Vitest specs (TDD-first for engine; smoke test for UI)
```

## How the build was orchestrated

We followed [GSD](https://github.com/gsd-build/get-shit-done) (Get Shit Done)
spec-driven development with multiple Executor agents:

1. **Planner** (main thread) wrote `SPEC.md` and `AGENTS.md`, scaffolded the
   project, and authored the type system.
2. **Engine Executor** wrote tests first (TDD), then `rng.ts`, `runEngine.ts`,
   `saveEngine.ts`.
3. **Data Executor** populated the mission pack and signal-card seed.
4. **UI Executor** wired the Zustand store to the engine + save/load and built
   the three real screens.
5. **Verifier** (main thread) ran `vitest`, `tsc -b`, `vite build`, plus an
   `App.smoke.test.tsx` that exercises real DOM navigation under jsdom.

`SPEC.md` is the externalized contract; `AGENTS.md` documents the role split.

## Brand guardrails

This is an original game. It does **not** use Future Today Institute branding,
visuals, names, or proprietary tooling. The Strate-chic Method is an original
methodology written for this project and inspired only by general foresight
practice (framing, weak-signal scanning, pattern analysis, trend validation,
velocity, scenarios, backcasting).
