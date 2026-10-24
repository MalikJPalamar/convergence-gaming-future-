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

## Current scope: Milestone 4 (Trend Validation)

Building on M1+M2 (PR #1) and M3 (PR #2). Both merged on `main`.

### What lands

1. **Trend Validation** screen + engine
   (`engine/trendValidationEngine.ts` + `src/tests/trendValidationEngine.test.ts`).
2. For each `TrendCandidate` produced by Pattern Board, let the player review
   and adjust four sub-scores (each 0–3):
   - **humanNeedScore** — how deeply the trend attaches to a human need
   - **persistenceScore** — how likely it is to persist across cycles
   - **convergenceScore** — how many signals converge on it
   - **evolutionScore** — how cross-sector / cross-domain its expression is
3. `validityScore = humanNeedScore + persistenceScore + convergenceScore + evolutionScore` (0–12).
4. Classification bands:
   - `0–3`: **fad**
   - `4–6`: **weak**
   - `7–9`: **emerging**
   - `10–12`: **major**
5. A trend is **validated** when `validityScore ≥ 7` (emerging or major).
6. `commitTrendValidation(run)` requires at least one validated trend; it
   advances the stage to `VELOCITY_MATRIX`. If no trend passes, throw a
   player-facing error that the store surfaces as a toast / inline message.
7. **Score editing cost**: adjusting a sub-score has no resource cost in M4
   (per the originating roadmap, override cost is on the Velocity Matrix, not
   here). Keep it simple.
8. The suggested scores produced by `patternEngine.commitPatternBoard` are
   preserved as the starting values; player edits replace them.

### Type extension

- Add `TrendBand` type (string literal: `"fad" | "weak" | "emerging" | "major"`).
- Export `classifyValidity(score: number): TrendBand`.
- `TrendCandidate` already has the four sub-scores; no shape change needed.

### Engine contract — `trendValidationEngine.ts`

```ts
export const VALID_THRESHOLD = 7;
export const MAJOR_THRESHOLD = 10;
export const SCORE_MIN = 0;
export const SCORE_MAX = 3;

export type TrendScoreField =
  | "humanNeedScore"
  | "persistenceScore"
  | "convergenceScore"
  | "evolutionScore";

export function classifyValidity(score: number): TrendBand;

/** Pure. Clamps new value to [0,3], recomputes validityScore + isValidated. */
export function setTrendScore(
  run: RunState,
  trendId: string,
  field: TrendScoreField,
  value: number,
): RunState;

/** Pure. Returns run unchanged if trend not found. */
export function resetTrendScores(run: RunState, trendId: string): RunState;

/** Throws Error("At least one validated trend required") when none pass. */
export function commitTrendValidation(run: RunState): RunState;
```

### Store additions

- `setTrendScore(trendId, field, value): void`
- `resetTrendScores(trendId): void`
- `commitTrendValidation(): void` (catches engine throw, surfaces `commitError`
  on store, clears on next successful mutation)

### Acceptance — this PR

- Existing 83 tests still pass.
- New: `trendValidationEngine.test.ts` with ≥ 10 cases (clamping,
  classification bands at every boundary, validation gate, commit throws
  without any validated trend, commit advances on success).
- New: `trendValidation.smoke.test.tsx` with ≥ 3 cases.
- `npm run build` clean. CI green.
- The full UI path works: Mission Brief → Signal Draft → Pattern Board →
  **Trend Validation** → Velocity Matrix stub.
- No FTI references.

### Out of scope (later milestones)

Velocity Matrix (M5), Scenario Forge (M6), Backcast (M7), Run Outcome (M8),
full 110-card deck (M9), polish (M10).

### Note: M3 (merged in PR #2)

Signal Draft + Pattern Board + GitHub Actions CI are on `main`.
See PR history for details.

### Note: M1+M2 (merged in PR #1)

### What lands

1. **Signal Draft** screen + engine (`engine/draftEngine.ts` + tests)
   - `startSignalDraft(run)` moves the first 12 cards from `deck` to `drawn`.
   - `pickSignal(run, signalId, mission)` moves card from `drawn` → `selected`,
     deducts 1 attention. **Discount:** the first 3 picks whose `aiDomain`
     matches `mission.aiDomain` cost 0 attention. **Bonus:** if the picked
     card's `primaryForce` is in `mission.requiredForces`, +1 credibility.
   - `unpickSignal(run, signalId, mission)` reverses the above (refund + bonus
     reversal).
   - `commitSignalDraft(run)` validates `5 ≤ selected ≤ 7` and advances stage.
2. **Pattern Board** screen + engine (`engine/patternEngine.ts` + tests)
   - Player drags cards from a holding row into 1–3 named clusters.
   - Each cluster requires `≥ 3 signals` and `≥ 2 distinct pattern tags`
     across its members.
   - `commitPatternBoard(run)` builds one `TrendCandidate` per cluster
     (signalIds + pattern-tag union + auto-title) and advances stage.
3. **Type extension**
   - New `PatternCluster { id; signalIds; proposedTitle }`.
   - `RunState.clusters: PatternCluster[]` (default `[]`).
4. **Store wiring** for the actions above.
5. **CI**: `.github/workflows/ci.yml` runs `tsc -b`, tests, build on push/PR.

### Out of scope (later milestones)

Trend Validation scoring UI (M4), Velocity Matrix (M5), Scenario Forge (M6),
Backcast (M7), Run Outcome (M8), full 110-card deck (M9), polish (M10).

### Acceptance — this PR

- All M1+M2 acceptance still passes.
- `npm run test` ≥ 50 tests; new files: `draftEngine.test.ts`,
  `patternEngine.test.ts`. Engine tests are TDD-first.
- `npm run build` clean.
- CI workflow runs on this PR and is green.
- App boots; user can do: pick mission → brief → draft (12 → 5–7) →
  pattern board (1–3 clusters) → reach Trend Validation stub.
- Signal Draft enforces attention math and the domain discount.
- Pattern Board enforces the ≥3 cards / ≥2 tags rules and generates
  trend candidates.

### Note: M1+M2 (already merged in PR #1)

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
