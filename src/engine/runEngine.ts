import type { RunState, RunStage } from "../types/game";
import type { Mission, TimeHorizon } from "../types/missions";
import type { SignalCard, PlayerResources } from "../types/cards";
import { createRng } from "./rng";

export interface CreateRunInput {
  missionId: string;
  seed: string;
  missions: Mission[];
  signalPool: SignalCard[];
  startingResources: PlayerResources;
}

const STAGE_FLOW: RunStage[] = [
  "MISSION_BRIEF",
  "SIGNAL_DRAFT",
  "PATTERN_BOARD",
  "TREND_VALIDATION",
  "VELOCITY_MATRIX",
  "SCENARIO_FORGE",
  "BACKCAST_TIMELINE",
  "RUN_OUTCOME",
  "ARCHIVE",
];

export function createRun(input: CreateRunInput): RunState {
  const { missionId, seed, missions, signalPool, startingResources } = input;
  const mission = missions.find((m) => m.id === missionId);
  if (!mission) {
    throw new Error(`Unknown mission: ${missionId}`);
  }

  const required = new Set(mission.requiredForces);
  const filtered = signalPool.filter(
    (c) => c.aiDomain === mission.aiDomain || required.has(c.primaryForce),
  );
  const source = filtered.length > 0 ? filtered : signalPool;
  // Fork the run RNG so the deck shuffle has its own deterministic stream.
  const rng = createRng(seed).fork("deck");
  const deck = rng.shuffle(source);

  return {
    seed,
    missionId,
    stage: "MISSION_BRIEF",
    timeHorizon: null,
    priorityStakeholders: [],
    resources: { ...startingResources },
    deck,
    drawn: [],
    selected: [],
    trendCandidates: [],
    scenarios: [],
    preferredScenarioId: null,
    backcastItems: [],
    finalScore: null,
    log: [{ at: 0, stage: "MISSION_BRIEF", message: "run created" }],
  };
}

export function advanceStage(run: RunState): RunState {
  const idx = STAGE_FLOW.indexOf(run.stage);
  // Unknown stage or already at the terminal stage: stay put.
  if (idx < 0 || idx >= STAGE_FLOW.length - 1) {
    return { ...run };
  }
  const next = STAGE_FLOW[idx + 1]!;
  return { ...run, stage: next };
}

export function setTimeHorizon(run: RunState, horizon: TimeHorizon): RunState {
  return { ...run, timeHorizon: horizon };
}

export function setPriorityStakeholders(
  run: RunState,
  stakeholders: string[],
): RunState {
  return { ...run, priorityStakeholders: [...stakeholders] };
}
