import { describe, it, expect } from "vitest";
import {
  addCluster,
  removeCluster,
  addSignalToCluster,
  removeSignalFromCluster,
  renameCluster,
  validateClusters,
  buildTrendCandidate,
  commitPatternBoard,
  MIN_CLUSTER_SIZE,
  MAX_CLUSTERS,
  MIN_DISTINCT_TAGS,
} from "../engine/patternEngine";
import type { SignalCard, PlayerResources } from "../types/cards";
import type { RunState } from "../types/game";

const startingResources: PlayerResources = {
  attention: 10,
  credibility: 5,
  capital: 5,
  trust: 5,
  time: 8,
};

const card = (
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

const buildRun = (selected: SignalCard[]): RunState => ({
  seed: "pat-seed",
  missionId: "m_x",
  stage: "PATTERN_BOARD",
  timeHorizon: null,
  priorityStakeholders: [],
  resources: { ...startingResources },
  deck: [],
  drawn: [],
  selected,
  domainDiscountUsed: 0,
  clusters: [],
  trendCandidates: [],
  scenarios: [],
  preferredScenarioId: null,
  backcastItems: [],
  finalScore: null,
  log: [],
});

const seqIdGen = (): (() => string) => {
  let n = 0;
  return () => `cl_${++n}`;
};

describe("addCluster / removeCluster", () => {
  it("appends an empty cluster with default title 'Cluster N'", () => {
    const idGen = seqIdGen();
    let run = buildRun([]);
    run = addCluster(run, idGen);
    expect(run.clusters).toHaveLength(1);
    expect(run.clusters[0]!.signalIds).toEqual([]);
    expect(run.clusters[0]!.proposedTitle).toBe("Cluster 1");
    run = addCluster(run, idGen);
    expect(run.clusters[1]!.proposedTitle).toBe("Cluster 2");
  });

  it("uses the injected idGen for deterministic ids", () => {
    const idGen = seqIdGen();
    const run = addCluster(buildRun([]), idGen);
    expect(run.clusters[0]!.id).toBe("cl_1");
  });

  it("is a no-op at MAX_CLUSTERS limit (does not throw)", () => {
    const idGen = seqIdGen();
    let run = buildRun([]);
    for (let i = 0; i < MAX_CLUSTERS; i++) run = addCluster(run, idGen);
    expect(run.clusters).toHaveLength(MAX_CLUSTERS);
    const next = addCluster(run, idGen);
    expect(next).toBe(run);
    expect(next.clusters).toHaveLength(MAX_CLUSTERS);
  });

  it("removeCluster removes by id; no-op when missing", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun([]), idGen);
    const id = run.clusters[0]!.id;
    const noop = removeCluster(run, "nope");
    expect(noop.clusters).toHaveLength(1);
    run = removeCluster(run, id);
    expect(run.clusters).toEqual([]);
  });
});

describe("addSignalToCluster", () => {
  const cards = [
    card("s1", { patternTags: ["clash", "turn"] }),
    card("s2", { patternTags: ["practice"] }),
  ];

  it("adds a signal to a cluster", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    expect(run.clusters[0]!.signalIds).toEqual(["s1"]);
  });

  it("moves signal from one cluster to another (one cluster per signal)", () => {
    const idGen = seqIdGen();
    let run = buildRun(cards);
    run = addCluster(run, idGen);
    run = addCluster(run, idGen);
    const cidA = run.clusters[0]!.id;
    const cidB = run.clusters[1]!.id;
    run = addSignalToCluster(run, cidA, "s1");
    expect(run.clusters.find((c) => c.id === cidA)!.signalIds).toEqual(["s1"]);
    run = addSignalToCluster(run, cidB, "s1");
    expect(run.clusters.find((c) => c.id === cidA)!.signalIds).toEqual([]);
    expect(run.clusters.find((c) => c.id === cidB)!.signalIds).toEqual(["s1"]);
  });

  it("removeSignalFromCluster removes only from the specified cluster", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = removeSignalFromCluster(run, cid, "s1");
    expect(run.clusters[0]!.signalIds).toEqual(["s2"]);
  });
});

describe("renameCluster", () => {
  it("updates a cluster's proposedTitle", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun([]), idGen);
    const cid = run.clusters[0]!.id;
    run = renameCluster(run, cid, "Agentic Procurement");
    expect(run.clusters[0]!.proposedTitle).toBe("Agentic Procurement");
  });
});

describe("validateClusters", () => {
  const cards = [
    card("s1", { patternTags: ["clash"] }),
    card("s2", { patternTags: ["clash"] }),
    card("s3", { patternTags: ["clash"] }),
    card("s4", { patternTags: ["turn", "edge"] }),
    card("s5", { patternTags: ["practice"] }),
  ];

  it("reports size, distinctTags, ok and reasons for a too-small cluster", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s4");
    const [v] = validateClusters(run);
    expect(v!.clusterId).toBe(cid);
    expect(v!.size).toBe(2);
    expect(v!.distinctTags).toBe(3); // clash, turn, edge
    expect(v!.ok).toBe(false);
    expect(v!.reasons.some((r) => /size|cards/i.test(r))).toBe(true);
  });

  it("flags clusters with <2 distinct tags", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = addSignalToCluster(run, cid, "s3");
    const [v] = validateClusters(run);
    expect(v!.size).toBe(3);
    expect(v!.distinctTags).toBe(1);
    expect(v!.ok).toBe(false);
    expect(v!.reasons.some((r) => /tag/i.test(r))).toBe(true);
  });

  it("returns ok=true for a valid cluster", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1"); // clash
    run = addSignalToCluster(run, cid, "s4"); // turn, edge
    run = addSignalToCluster(run, cid, "s5"); // practice
    const [v] = validateClusters(run);
    expect(v!.size).toBe(MIN_CLUSTER_SIZE);
    expect(v!.distinctTags).toBeGreaterThanOrEqual(MIN_DISTINCT_TAGS);
    expect(v!.ok).toBe(true);
    expect(v!.reasons).toEqual([]);
  });
});

describe("buildTrendCandidate", () => {
  const cards = [
    card("s1", {
      title: "Alpha signal",
      patternTags: ["clash", "turn"],
      humanNeeds: ["safety"],
      evidence: 4,
      novelty: 3,
      primaryForce: "technology",
    }),
    card("s2", {
      title: "Beta signal",
      patternTags: ["practice"],
      humanNeeds: ["belonging"],
      evidence: 3,
      novelty: 4,
      primaryForce: "economy",
    }),
    card("s3", {
      title: "Gamma signal",
      patternTags: ["edge"],
      humanNeeds: ["safety"],
      evidence: 2,
      novelty: 2,
      primaryForce: "government",
    }),
  ];

  it("produces a TrendCandidate with deduped tags and finite scores", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = addSignalToCluster(run, cid, "s3");
    run = renameCluster(run, cid, "Pattern A");
    const trend = buildTrendCandidate(run.clusters[0]!, run);
    expect(trend.id).toBe(`trend_${cid}`);
    expect(trend.title).toBe("Pattern A");
    expect(trend.signalIds).toEqual(["s1", "s2", "s3"]);
    expect(new Set(trend.patternTags)).toEqual(
      new Set(["clash", "turn", "practice", "edge"]),
    );
    for (const k of [
      "humanNeedScore",
      "persistenceScore",
      "convergenceScore",
      "evolutionScore",
      "validityScore",
    ] as const) {
      expect(Number.isFinite(trend[k])).toBe(true);
      expect(trend[k]).toBeGreaterThanOrEqual(0);
    }
    expect(trend.humanNeedScore).toBeLessThanOrEqual(3);
    expect(trend.persistenceScore).toBeLessThanOrEqual(3);
    expect(trend.convergenceScore).toBeLessThanOrEqual(3);
    expect(trend.evolutionScore).toBeLessThanOrEqual(3);
    expect(trend.validityScore).toBe(
      trend.humanNeedScore +
        trend.persistenceScore +
        trend.convergenceScore +
        trend.evolutionScore,
    );
    expect(trend.isValidated).toBe(trend.validityScore >= 7);
  });
});

describe("commitPatternBoard", () => {
  const cards = [
    card("s1", { patternTags: ["clash", "turn"], humanNeeds: ["safety"] }),
    card("s2", { patternTags: ["practice"], humanNeeds: ["belonging"] }),
    card("s3", { patternTags: ["edge"], humanNeeds: ["safety"] }),
  ];

  it("throws when there are no clusters; state unchanged", () => {
    const run = buildRun(cards);
    expect(() => commitPatternBoard(run)).toThrow();
    expect(run.trendCandidates).toEqual([]);
    expect(run.stage).toBe("PATTERN_BOARD");
  });

  it("throws when any cluster fails validation; state unchanged", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    const before = run;
    expect(() => commitPatternBoard(run)).toThrow();
    expect(before.trendCandidates).toEqual([]);
    expect(before.stage).toBe("PATTERN_BOARD");
  });

  it("on valid clusters: builds a TrendCandidate per cluster and advances to TREND_VALIDATION", () => {
    const idGen = seqIdGen();
    let run = addCluster(buildRun(cards), idGen);
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = addSignalToCluster(run, cid, "s3");
    run = renameCluster(run, cid, "Cluster Alpha");
    const next = commitPatternBoard(run);
    expect(next.stage).toBe("TREND_VALIDATION");
    expect(next.trendCandidates).toHaveLength(1);
    const t = next.trendCandidates[0]!;
    expect(t.signalIds).toEqual(["s1", "s2", "s3"]);
    expect(t.title).toBe("Cluster Alpha");
    expect(new Set(t.patternTags)).toEqual(
      new Set(["clash", "turn", "practice", "edge"]),
    );
  });
});
