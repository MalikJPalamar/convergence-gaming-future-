import { describe, it, expect } from "vitest";
import {
  addCluster,
  removeCluster,
  addSignalToCluster,
  removeSignalFromCluster,
  setClusterTitle,
  validateClusters,
  generateTrendCandidates,
  commitPatternBoard,
  newClusterId,
  PATTERN_MAX_CLUSTERS,
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

describe("newClusterId", () => {
  it("is deterministic and uses seed prefix + index", () => {
    expect(newClusterId("seed-abcdefghi", 0)).toBe("cluster_seed-abc_0");
    expect(newClusterId("seed-abcdefghi", 2)).toBe("cluster_seed-abc_2");
  });
});

describe("addCluster / removeCluster", () => {
  it("addCluster adds a new empty cluster", () => {
    const run = buildRun([]);
    const next = addCluster(run);
    expect(next.clusters).toHaveLength(1);
    expect(next.clusters[0]?.signalIds).toEqual([]);
    expect(next.clusters[0]?.proposedTitle).toBe("");
  });

  it("addCluster throws when at the 3-cluster limit", () => {
    let run = buildRun([]);
    for (let i = 0; i < PATTERN_MAX_CLUSTERS; i++) run = addCluster(run);
    expect(() => addCluster(run)).toThrowError("Maximum 3 clusters");
  });

  it("removeCluster is a no-op when id missing", () => {
    const run = buildRun([]);
    const next = removeCluster(run, "nope");
    expect(next.clusters).toEqual([]);
  });

  it("removeCluster removes by id", () => {
    let run = addCluster(buildRun([]));
    const id = run.clusters[0]!.id;
    run = removeCluster(run, id);
    expect(run.clusters).toEqual([]);
  });
});

describe("addSignalToCluster", () => {
  const cards = [
    card("s1", { patternTags: ["clash", "turn"] }),
    card("s2", { patternTags: ["practice"] }),
    card("s3", { patternTags: ["edge"] }),
  ];

  it("rejects signalId not in run.selected", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    expect(() => addSignalToCluster(run, cid, "missing")).toThrow();
  });

  it("adds a signal to a cluster", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    expect(run.clusters[0]!.signalIds).toEqual(["s1"]);
  });

  it("moves a signal already in another cluster (one cluster per signal)", () => {
    let run = addCluster(addCluster(buildRun(cards)));
    const cidA = run.clusters[0]!.id;
    const cidB = run.clusters[1]!.id;
    run = addSignalToCluster(run, cidA, "s1");
    run = addSignalToCluster(run, cidB, "s1");
    expect(run.clusters.find((c) => c.id === cidA)!.signalIds).toEqual([]);
    expect(run.clusters.find((c) => c.id === cidB)!.signalIds).toEqual(["s1"]);
  });

  it("removeSignalFromCluster removes only from the specified cluster", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = removeSignalFromCluster(run, cid, "s1");
    expect(run.clusters[0]!.signalIds).toEqual(["s2"]);
  });
});

describe("setClusterTitle", () => {
  it("updates a cluster's proposedTitle", () => {
    let run = addCluster(buildRun([]));
    const cid = run.clusters[0]!.id;
    run = setClusterTitle(run, cid, "Agentic Procurement");
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
    card("s6", { patternTags: ["outlier"] }),
  ];

  it("flags too_few_cards for clusters with <3 cards", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    const issues = validateClusters(run);
    expect(issues).toEqual([{ clusterId: cid, reason: "too_few_cards" }]);
  });

  it("flags too_few_tags for clusters with <2 distinct tags", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    // 3 cards but all share tag "clash" → only 1 distinct tag
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = addSignalToCluster(run, cid, "s3");
    const issues = validateClusters(run);
    expect(issues).toEqual([{ clusterId: cid, reason: "too_few_tags" }]);
  });

  it("returns empty for a passing cluster", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1"); // clash
    run = addSignalToCluster(run, cid, "s4"); // turn, edge
    run = addSignalToCluster(run, cid, "s5"); // practice
    expect(validateClusters(run)).toEqual([]);
  });
});

describe("generateTrendCandidates", () => {
  const cards = [
    card("s1", { title: "Alpha signal that exists in the world", patternTags: ["clash", "turn"] }),
    card("s2", { title: "Beta signal", patternTags: ["practice", "edge"] }),
    card("s3", { title: "Gamma signal", patternTags: ["outlier"] }),
  ];
  const signalsById: Record<string, SignalCard> = Object.fromEntries(
    cards.map((c) => [c.id, c]),
  );

  it("uses proposedTitle when set; tags are sorted alphabetically", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = addSignalToCluster(run, cid, "s3");
    run = setClusterTitle(run, cid, "Custom Title");
    const trends = generateTrendCandidates(run, signalsById);
    expect(trends).toHaveLength(1);
    expect(trends[0]!.title).toBe("Custom Title");
    expect(trends[0]!.signalIds).toEqual(["s1", "s2", "s3"]);
    expect(trends[0]!.patternTags).toEqual([
      "clash",
      "edge",
      "outlier",
      "practice",
      "turn",
    ]);
    expect(trends[0]!.id).toBe(`trend_${cid}`);
    expect(trends[0]!.validityScore).toBe(0);
    expect(trends[0]!.isValidated).toBe(false);
  });

  it("synthesizes a title from the first card when proposedTitle empty", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = addSignalToCluster(run, cid, "s3");
    const trends = generateTrendCandidates(run, signalsById);
    expect(trends[0]!.title.startsWith("Trend: ")).toBe(true);
    expect(trends[0]!.title).toContain("Alpha signal");
  });
});

describe("commitPatternBoard", () => {
  const cards = [
    card("s1", { patternTags: ["clash", "turn"] }),
    card("s2", { patternTags: ["practice"] }),
    card("s3", { patternTags: ["edge"] }),
  ];
  const signalsById = Object.fromEntries(cards.map((c) => [c.id, c]));

  it("throws when there are no clusters", () => {
    const run = buildRun(cards);
    expect(() => commitPatternBoard(run, signalsById)).toThrowError(
      "At least one cluster required",
    );
  });

  it("throws when any cluster fails validation", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1"); // only 1 card
    expect(() => commitPatternBoard(run, signalsById)).toThrowError(
      "Cluster validation failed",
    );
  });

  it("returns run with trendCandidates when valid", () => {
    let run = addCluster(buildRun(cards));
    const cid = run.clusters[0]!.id;
    run = addSignalToCluster(run, cid, "s1");
    run = addSignalToCluster(run, cid, "s2");
    run = addSignalToCluster(run, cid, "s3");
    const next = commitPatternBoard(run, signalsById);
    expect(next.trendCandidates).toHaveLength(1);
    expect(next.trendCandidates[0]!.signalIds).toEqual(["s1", "s2", "s3"]);
    // does not change stage
    expect(next.stage).toBe(run.stage);
  });
});
