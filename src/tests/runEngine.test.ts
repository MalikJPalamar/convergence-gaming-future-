import { describe, it, expect } from "vitest";
import {
  createRun,
  advanceStage,
  setTimeHorizon,
  setPriorityStakeholders,
} from "../engine/runEngine";
import type { Mission } from "../types/missions";
import type { SignalCard, PlayerResources } from "../types/cards";
import type { RunStage } from "../types/game";

const startingResources: PlayerResources = {
  attention: 5,
  credibility: 5,
  capital: 5,
  trust: 5,
  time: 10,
};

const missions: Mission[] = [
  {
    id: "m_agents",
    title: "Agents Mission",
    briefing: "brief",
    coreQuestion: "q?",
    aiDomain: "ai_agents",
    timeHorizons: ["near_1_2_years", "mid_3_5_years"],
    requiredForces: ["technology", "economy"],
    startingResources,
    scenarioAxes: [],
    winCondition: "win",
    failureCondition: "lose",
    difficulty: 2,
    defaultStakeholders: ["devs", "users"],
  },
  {
    id: "m_health",
    title: "Health Mission",
    briefing: "brief",
    coreQuestion: "q?",
    aiDomain: "ai_health",
    timeHorizons: ["mid_3_5_years"],
    requiredForces: ["public_health"],
    startingResources,
    scenarioAxes: [],
    winCondition: "win",
    failureCondition: "lose",
    difficulty: 3,
    defaultStakeholders: ["patients"],
  },
];

const baseCard = (
  id: string,
  patch: Partial<SignalCard> = {},
): SignalCard => ({
  id,
  title: id,
  description: id,
  primaryForce: "technology",
  secondaryForces: [],
  aiDomain: "ai_agents",
  patternTags: [],
  humanNeeds: [],
  evidence: 3,
  novelty: 3,
  uncertainty: 3,
  impact: 3,
  velocity: 3,
  stakeholders: [],
  possibleTrendLinks: [],
  unlockTier: 0,
  ...patch,
});

const signalPool: SignalCard[] = [
  baseCard("s1", { aiDomain: "ai_agents", primaryForce: "technology" }),
  baseCard("s2", { aiDomain: "ai_agents", primaryForce: "economy" }),
  baseCard("s3", { aiDomain: "ai_health", primaryForce: "public_health" }),
  baseCard("s4", { aiDomain: "ai_security", primaryForce: "government" }),
  baseCard("s5", { aiDomain: "ai_security", primaryForce: "economy" }),
  baseCard("s6", { aiDomain: "ai_geopolitics", primaryForce: "technology" }),
];

describe("createRun", () => {
  it("is pure: equal inputs produce deeply equal RunState", () => {
    const a = createRun({
      missionId: "m_agents",
      seed: "seed-1",
      missions,
      signalPool,
      startingResources,
    });
    const b = createRun({
      missionId: "m_agents",
      seed: "seed-1",
      missions,
      signalPool,
      startingResources,
    });
    expect(a).toEqual(b);
  });

  it("does not mutate inputs", () => {
    const poolCopy = signalPool.map((c) => ({ ...c }));
    const missionsCopy = missions.map((m) => ({ ...m }));
    createRun({
      missionId: "m_agents",
      seed: "seed-2",
      missions,
      signalPool,
      startingResources,
    });
    expect(signalPool).toEqual(poolCopy);
    expect(missions).toEqual(missionsCopy);
  });

  it("throws on unknown mission id", () => {
    expect(() =>
      createRun({
        missionId: "nope",
        seed: "x",
        missions,
        signalPool,
        startingResources,
      }),
    ).toThrowError("Unknown mission: nope");
  });

  it("starts at MISSION_BRIEF with correct defaults", () => {
    const run = createRun({
      missionId: "m_agents",
      seed: "seed",
      missions,
      signalPool,
      startingResources,
    });
    expect(run.stage).toBe<RunStage>("MISSION_BRIEF");
    expect(run.timeHorizon).toBeNull();
    expect(run.priorityStakeholders).toEqual([]);
    expect(run.drawn).toEqual([]);
    expect(run.selected).toEqual([]);
    expect(run.trendCandidates).toEqual([]);
    expect(run.scenarios).toEqual([]);
    expect(run.backcastItems).toEqual([]);
    expect(run.finalScore).toBeNull();
    expect(run.resources).toEqual(startingResources);
    expect(run.log).toHaveLength(1);
    expect(run.log[0]?.message).toBe("run created");
  });

  it("builds a non-empty deck containing matching cards", () => {
    const run = createRun({
      missionId: "m_agents",
      seed: "deck-seed",
      missions,
      signalPool,
      startingResources,
    });
    expect(run.deck.length).toBeGreaterThan(0);
    const ids = run.deck.map((c) => c.id).sort();
    // s1 (matching aiDomain), s2 (matching aiDomain), s5 (economy is required force), s6 (technology is required force)
    expect(ids).toEqual(["s1", "s2", "s5", "s6"]);
  });

  it("falls back to full pool when no card matches", () => {
    const isolatedMission: Mission = {
      ...missions[0]!,
      id: "m_isolated",
      aiDomain: "ai_creativity",
      requiredForces: ["environment"],
    };
    const run = createRun({
      missionId: "m_isolated",
      seed: "x",
      missions: [isolatedMission],
      signalPool,
      startingResources,
    });
    expect(run.deck.length).toBe(signalPool.length);
  });
});

describe("advanceStage", () => {
  it("walks the linear stage flow and stays at ARCHIVE", () => {
    let run = createRun({
      missionId: "m_agents",
      seed: "stage",
      missions,
      signalPool,
      startingResources,
    });
    const expected: RunStage[] = [
      "SIGNAL_DRAFT",
      "PATTERN_BOARD",
      "TREND_VALIDATION",
      "VELOCITY_MATRIX",
      "SCENARIO_FORGE",
      "BACKCAST_TIMELINE",
      "RUN_OUTCOME",
      "ARCHIVE",
    ];
    for (const stage of expected) {
      run = advanceStage(run);
      expect(run.stage).toBe(stage);
    }
    // stays at ARCHIVE
    const stuck = advanceStage(run);
    expect(stuck.stage).toBe("ARCHIVE");
  });

  it("returns a new object (immutability)", () => {
    const run = createRun({
      missionId: "m_agents",
      seed: "imm",
      missions,
      signalPool,
      startingResources,
    });
    const next = advanceStage(run);
    expect(next).not.toBe(run);
    expect(run.stage).toBe("MISSION_BRIEF");
  });
});

describe("setTimeHorizon / setPriorityStakeholders", () => {
  it("setTimeHorizon returns a new object with the value applied", () => {
    const run = createRun({
      missionId: "m_agents",
      seed: "th",
      missions,
      signalPool,
      startingResources,
    });
    const next = setTimeHorizon(run, "near_1_2_years");
    expect(next).not.toBe(run);
    expect(next.timeHorizon).toBe("near_1_2_years");
    expect(run.timeHorizon).toBeNull();
  });

  it("setPriorityStakeholders returns a new object with new array", () => {
    const run = createRun({
      missionId: "m_agents",
      seed: "ps",
      missions,
      signalPool,
      startingResources,
    });
    const stakeholders = ["a", "b"];
    const next = setPriorityStakeholders(run, stakeholders);
    expect(next).not.toBe(run);
    expect(next.priorityStakeholders).toEqual(stakeholders);
    expect(next.priorityStakeholders).not.toBe(stakeholders);
    expect(run.priorityStakeholders).toEqual([]);
  });
});
