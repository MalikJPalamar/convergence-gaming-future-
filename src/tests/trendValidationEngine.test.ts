import { describe, it, expect } from "vitest";
import {
  classifyValidity,
  setTrendScore,
  resetTrendScores,
  commitTrendValidation,
  VALID_THRESHOLD,
  SCORE_MIN,
  SCORE_MAX,
} from "../engine/trendValidationEngine";
import type { PlayerResources } from "../types/cards";
import type { RunState } from "../types/game";
import type { TrendCandidate } from "../types/scoring";

const startingResources: PlayerResources = {
  attention: 10,
  credibility: 5,
  capital: 5,
  trust: 5,
  time: 8,
};

const trend = (id: string, patch: Partial<TrendCandidate> = {}): TrendCandidate => ({
  id,
  title: id,
  signalIds: [],
  patternTags: [],
  humanNeedScore: 0,
  persistenceScore: 0,
  convergenceScore: 0,
  evolutionScore: 0,
  validityScore: 0,
  isValidated: false,
  ...patch,
});

const buildRun = (trendCandidates: TrendCandidate[]): RunState => ({
  seed: "trend-seed",
  missionId: "m_x",
  stage: "TREND_VALIDATION",
  timeHorizon: null,
  priorityStakeholders: [],
  resources: { ...startingResources },
  deck: [],
  drawn: [],
  selected: [],
  domainDiscountUsed: 0,
  clusters: [],
  trendCandidates,
  scenarios: [],
  preferredScenarioId: null,
  backcastItems: [],
  finalScore: null,
  log: [],
});

describe("classifyValidity", () => {
  it("classifies boundary scores correctly", () => {
    expect(classifyValidity(0)).toBe("fad");
    expect(classifyValidity(3)).toBe("fad");
    expect(classifyValidity(4)).toBe("weak");
    expect(classifyValidity(6)).toBe("weak");
    expect(classifyValidity(7)).toBe("emerging");
    expect(classifyValidity(9)).toBe("emerging");
    expect(classifyValidity(10)).toBe("major");
    expect(classifyValidity(12)).toBe("major");
  });

  it("is defensive at out-of-range inputs", () => {
    expect(classifyValidity(-1)).toBe("fad");
    expect(classifyValidity(99)).toBe("major");
  });
});

describe("setTrendScore", () => {
  it("clamps a value above SCORE_MAX down to SCORE_MAX", () => {
    const run = buildRun([trend("t1")]);
    const next = setTrendScore(run, "t1", "humanNeedScore", 5);
    expect(next.trendCandidates[0]!.humanNeedScore).toBe(SCORE_MAX);
  });

  it("clamps a negative value up to SCORE_MIN", () => {
    const run = buildRun([trend("t1", { humanNeedScore: 2 })]);
    const next = setTrendScore(run, "t1", "humanNeedScore", -2);
    expect(next.trendCandidates[0]!.humanNeedScore).toBe(SCORE_MIN);
  });

  it("recomputes validityScore and flips isValidated at the 7 boundary", () => {
    const run = buildRun([
      trend("t1", {
        humanNeedScore: 2,
        persistenceScore: 2,
        convergenceScore: 2,
        evolutionScore: 0,
        validityScore: 6,
        isValidated: false,
      }),
    ]);
    const next = setTrendScore(run, "t1", "evolutionScore", 1);
    const t = next.trendCandidates[0]!;
    expect(t.evolutionScore).toBe(1);
    expect(t.validityScore).toBe(VALID_THRESHOLD);
    expect(t.isValidated).toBe(true);
  });

  it("returns a deeply-equal run when trendId is missing", () => {
    const run = buildRun([trend("t1", { humanNeedScore: 1, validityScore: 1 })]);
    const next = setTrendScore(run, "nope", "humanNeedScore", 3);
    expect(next.trendCandidates).toEqual(run.trendCandidates);
  });

  it("does not mutate the input run (purity)", () => {
    const run = buildRun([trend("t1", { humanNeedScore: 1, validityScore: 1 })]);
    const snapshot = JSON.parse(JSON.stringify(run));
    setTrendScore(run, "t1", "humanNeedScore", 3);
    expect(JSON.parse(JSON.stringify(run))).toEqual(snapshot);
  });

  it("returns a NEW trendCandidates array (reference inequality)", () => {
    const run = buildRun([trend("t1")]);
    const next = setTrendScore(run, "t1", "humanNeedScore", 2);
    expect(next.trendCandidates).not.toBe(run.trendCandidates);
  });
});

describe("resetTrendScores", () => {
  it("zeroes all four sub-scores and clears isValidated", () => {
    const run = buildRun([
      trend("t1", {
        humanNeedScore: 3,
        persistenceScore: 3,
        convergenceScore: 3,
        evolutionScore: 3,
        validityScore: 12,
        isValidated: true,
      }),
    ]);
    const next = resetTrendScores(run, "t1");
    const t = next.trendCandidates[0]!;
    expect(t.humanNeedScore).toBe(0);
    expect(t.persistenceScore).toBe(0);
    expect(t.convergenceScore).toBe(0);
    expect(t.evolutionScore).toBe(0);
    expect(t.validityScore).toBe(0);
    expect(t.isValidated).toBe(false);
  });

  it("returns a deeply-equal run when trendId is missing", () => {
    const run = buildRun([trend("t1", { humanNeedScore: 2 })]);
    const next = resetTrendScores(run, "nope");
    expect(next.trendCandidates).toEqual(run.trendCandidates);
  });
});

describe("commitTrendValidation", () => {
  it("throws when no trend is validated", () => {
    const run = buildRun([
      trend("t1", { validityScore: 6, isValidated: false }),
      trend("t2", { validityScore: 3, isValidated: false }),
    ]);
    expect(() => commitTrendValidation(run)).toThrow(
      "At least one validated trend required",
    );
  });

  it("advances stage to VELOCITY_MATRIX when at least one trend passes", () => {
    const run = buildRun([
      trend("t1", { validityScore: 6, isValidated: false }),
      trend("t2", {
        humanNeedScore: 2,
        persistenceScore: 2,
        convergenceScore: 2,
        evolutionScore: 1,
        validityScore: 7,
        isValidated: true,
      }),
    ]);
    const next = commitTrendValidation(run);
    expect(next.stage).toBe("VELOCITY_MATRIX");
  });

  it("does not mutate the input run on success (snapshot)", () => {
    const run = buildRun([
      trend("t1", {
        humanNeedScore: 3,
        persistenceScore: 3,
        convergenceScore: 2,
        evolutionScore: 2,
        validityScore: 10,
        isValidated: true,
      }),
    ]);
    const snapshot = JSON.parse(JSON.stringify(run));
    commitTrendValidation(run);
    expect(JSON.parse(JSON.stringify(run))).toEqual(snapshot);
  });
});
