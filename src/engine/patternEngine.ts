import type { RunState, PatternCluster } from "../types/game";
import type { TrendCandidate } from "../types/scoring";
import type { SignalCard, PatternTag } from "../types/cards";

export const PATTERN_MIN_CARDS_PER_CLUSTER = 3;
export const PATTERN_MIN_TAGS_PER_CLUSTER = 2;
export const PATTERN_MAX_CLUSTERS = 3;

export function newClusterId(seed: string, index: number): string {
  return `cluster_${seed.slice(0, 8)}_${index}`;
}

export function addCluster(run: RunState): RunState {
  if (run.clusters.length >= PATTERN_MAX_CLUSTERS) {
    throw new Error("Maximum 3 clusters");
  }
  const id = newClusterId(run.seed, run.clusters.length);
  const cluster: PatternCluster = { id, signalIds: [], proposedTitle: "" };
  return { ...run, clusters: [...run.clusters, cluster] };
}

export function removeCluster(run: RunState, clusterId: string): RunState {
  const next = run.clusters.filter((c) => c.id !== clusterId);
  if (next.length === run.clusters.length) return run;
  return { ...run, clusters: next };
}

export function addSignalToCluster(
  run: RunState,
  clusterId: string,
  signalId: string,
): RunState {
  if (!run.selected.some((c) => c.id === signalId)) {
    throw new Error(`Signal not in selected pool: ${signalId}`);
  }
  if (!run.clusters.some((c) => c.id === clusterId)) {
    throw new Error(`Unknown cluster: ${clusterId}`);
  }
  // Remove signal from any other cluster it currently lives in, then add.
  const clusters = run.clusters.map((c) => {
    if (c.id === clusterId) {
      const without = c.signalIds.filter((s) => s !== signalId);
      return { ...c, signalIds: [...without, signalId] };
    }
    return { ...c, signalIds: c.signalIds.filter((s) => s !== signalId) };
  });
  return { ...run, clusters };
}

export function removeSignalFromCluster(
  run: RunState,
  clusterId: string,
  signalId: string,
): RunState {
  const clusters = run.clusters.map((c) =>
    c.id === clusterId
      ? { ...c, signalIds: c.signalIds.filter((s) => s !== signalId) }
      : c,
  );
  return { ...run, clusters };
}

export function setClusterTitle(
  run: RunState,
  clusterId: string,
  title: string,
): RunState {
  const clusters = run.clusters.map((c) =>
    c.id === clusterId ? { ...c, proposedTitle: title } : c,
  );
  return { ...run, clusters };
}

export interface ClusterValidationIssue {
  clusterId: string;
  reason: "too_few_cards" | "too_few_tags";
}

const tagsForCluster = (
  cluster: PatternCluster,
  signalsById: Record<string, SignalCard>,
): PatternTag[] => {
  const set = new Set<PatternTag>();
  for (const id of cluster.signalIds) {
    const card = signalsById[id];
    if (!card) continue;
    for (const t of card.patternTags) set.add(t);
  }
  return [...set];
};

export function validateClusters(run: RunState): ClusterValidationIssue[] {
  const signalsById: Record<string, SignalCard> = Object.fromEntries(
    run.selected.map((c) => [c.id, c]),
  );
  const issues: ClusterValidationIssue[] = [];
  for (const c of run.clusters) {
    if (c.signalIds.length < PATTERN_MIN_CARDS_PER_CLUSTER) {
      issues.push({ clusterId: c.id, reason: "too_few_cards" });
      continue;
    }
    const tags = tagsForCluster(c, signalsById);
    if (tags.length < PATTERN_MIN_TAGS_PER_CLUSTER) {
      issues.push({ clusterId: c.id, reason: "too_few_tags" });
    }
  }
  return issues;
}

export function generateTrendCandidates(
  run: RunState,
  signalsById: Record<string, SignalCard>,
): TrendCandidate[] {
  return run.clusters.map((cluster) => {
    const tags = tagsForCluster(cluster, signalsById).slice().sort();
    const firstCard =
      cluster.signalIds.length > 0
        ? signalsById[cluster.signalIds[0]!]
        : undefined;
    const synthetic =
      "Trend: " + (firstCard ? firstCard.title.slice(0, 60) : "Untitled");
    const title =
      cluster.proposedTitle.trim().length > 0
        ? cluster.proposedTitle
        : synthetic;
    return {
      id: `trend_${cluster.id}`,
      title,
      signalIds: [...cluster.signalIds],
      patternTags: tags,
      humanNeedScore: 0,
      persistenceScore: 0,
      convergenceScore: 0,
      evolutionScore: 0,
      validityScore: 0,
      isValidated: false,
    };
  });
}

export function commitPatternBoard(
  run: RunState,
  signalsById: Record<string, SignalCard>,
): RunState {
  if (run.clusters.length === 0) {
    throw new Error("At least one cluster required");
  }
  const issues = validateClusters(run);
  if (issues.length > 0) {
    throw new Error("Cluster validation failed");
  }
  return { ...run, trendCandidates: generateTrendCandidates(run, signalsById) };
}
