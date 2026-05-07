import type { PatternCluster, RunState } from "../types/game";
import type { TrendCandidate } from "../types/scoring";
import type { SignalCard, PatternTag, HumanNeed, MacroForce } from "../types/cards";
import { advanceStage } from "./runEngine";
import { createRng } from "./rng";

export const MIN_CLUSTER_SIZE = 3;
export const MAX_CLUSTERS = 3;
export const MIN_DISTINCT_TAGS = 2;

// --- Back-compat constants (callers may still reference these names).
export const PATTERN_MIN_CARDS_PER_CLUSTER = MIN_CLUSTER_SIZE;
export const PATTERN_MIN_TAGS_PER_CLUSTER = MIN_DISTINCT_TAGS;
export const PATTERN_MAX_CLUSTERS = MAX_CLUSTERS;

/**
 * Default deterministic id generator derived from the run seed and the
 * current cluster count. Each successive call within the same run is unique
 * because the seed varies with `run.clusters.length` at call time.
 */
const defaultIdGen = (run: RunState): (() => string) => {
  const rng = createRng(`${run.seed}::cluster::${run.clusters.length}`);
  return () => "cl_" + Math.floor(rng.next() * 0xffffffff).toString(36);
};

/** Build a {id → card} index from `run.selected` — the cluster's source set. */
const indexSelected = (run: RunState): Record<string, SignalCard> =>
  Object.fromEntries(run.selected.map((c) => [c.id, c]));

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

const cardsForCluster = (
  cluster: PatternCluster,
  signalsById: Record<string, SignalCard>,
): SignalCard[] =>
  cluster.signalIds
    .map((id) => signalsById[id])
    .filter((c): c is SignalCard => Boolean(c));

export function addCluster(
  run: RunState,
  idGen: () => string = defaultIdGen(run),
): RunState {
  if (run.clusters.length >= MAX_CLUSTERS) return run;
  const idx = run.clusters.length + 1;
  const cluster: PatternCluster = {
    id: idGen(),
    signalIds: [],
    proposedTitle: `Cluster ${idx}`,
  };
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
  if (!run.selected.some((c) => c.id === signalId)) return run;
  if (!run.clusters.some((c) => c.id === clusterId)) return run;
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

export function renameCluster(
  run: RunState,
  clusterId: string,
  title: string,
): RunState {
  const clusters = run.clusters.map((c) =>
    c.id === clusterId ? { ...c, proposedTitle: title } : c,
  );
  return { ...run, clusters };
}

/** Back-compat alias for the older store. Prefer `renameCluster`. */
export const setClusterTitle = renameCluster;

export interface ClusterValidation {
  clusterId: string;
  size: number;
  distinctTags: number;
  ok: boolean;
  reasons: string[];
}

export function validateClusters(run: RunState): ClusterValidation[] {
  const signalsById = indexSelected(run);
  return run.clusters.map((c) => {
    const size = c.signalIds.length;
    const distinctTags = tagsForCluster(c, signalsById).length;
    const reasons: string[] = [];
    if (size < MIN_CLUSTER_SIZE) {
      reasons.push(`needs at least ${MIN_CLUSTER_SIZE} cards (has ${size})`);
    }
    if (distinctTags < MIN_DISTINCT_TAGS) {
      reasons.push(
        `needs at least ${MIN_DISTINCT_TAGS} distinct pattern tags (has ${distinctTags})`,
      );
    }
    return {
      clusterId: c.id,
      size,
      distinctTags,
      ok: reasons.length === 0,
      reasons,
    };
  });
}

const clamp03 = (n: number): number => Math.max(0, Math.min(3, Math.round(n)));

const avg = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Build a TrendCandidate from a cluster.
 *
 * Score formulas (deterministic, all 0..3):
 *  - humanNeedScore  = min(3, distinct human needs across cluster members)
 *  - persistenceScore = clamp03(avg(evidence in 1..5) * 3 / 5)
 *      → maps a 1..5 evidence avg roughly into 0..3.
 *  - convergenceScore = clamp03(avg(novelty) * 3 / 5 * (size >= 4 ? 1 : 0.7))
 *      → reflects "more cards reinforce convergence".
 *  - evolutionScore  = min(3, distinct primaryForce values across cluster)
 *  - validityScore   = sum of the four (0..12)
 *  - isValidated     = validityScore >= 7
 */
export function buildTrendCandidate(
  cluster: PatternCluster,
  run: RunState,
): TrendCandidate {
  const signalsById = indexSelected(run);
  const cards = cardsForCluster(cluster, signalsById);
  const tags = tagsForCluster(cluster, signalsById);

  const needs = new Set<HumanNeed>();
  for (const c of cards) for (const n of c.humanNeeds) needs.add(n);
  const forces = new Set<MacroForce>();
  for (const c of cards) forces.add(c.primaryForce);

  const humanNeedScore = Math.min(3, needs.size);
  const persistenceScore = clamp03((avg(cards.map((c) => c.evidence)) * 3) / 5);
  const sizeWeight = cards.length >= 4 ? 1 : 0.7;
  const convergenceScore = clamp03(
    (avg(cards.map((c) => c.novelty)) * 3 * sizeWeight) / 5,
  );
  const evolutionScore = Math.min(3, forces.size);

  const validityScore =
    humanNeedScore + persistenceScore + convergenceScore + evolutionScore;

  return {
    id: `trend_${cluster.id}`,
    title: cluster.proposedTitle,
    signalIds: [...cluster.signalIds],
    patternTags: tags,
    humanNeedScore,
    persistenceScore,
    convergenceScore,
    evolutionScore,
    validityScore,
    isValidated: validityScore >= 7,
  };
}

/**
 * Validate every cluster, build TrendCandidates, advance stage to TREND_VALIDATION.
 * Throws if there are no clusters or any cluster fails validation; state unchanged.
 */
export function commitPatternBoard(run: RunState): RunState {
  if (run.clusters.length === 0) {
    throw new Error("Pattern Board requires at least one cluster");
  }
  const results = validateClusters(run);
  const failing = results.filter((r) => !r.ok);
  if (failing.length > 0) {
    const first = failing[0]!;
    throw new Error(
      `Cluster ${first.clusterId} invalid: ${first.reasons.join("; ")}`,
    );
  }
  const trendCandidates = run.clusters.map((c) => buildTrendCandidate(c, run));
  const withTrends: RunState = { ...run, trendCandidates };
  return advanceStage(withTrends);
}

/**
 * Back-compat helper used by older store wiring. Kept for safety; prefer
 * `commitPatternBoard(run)` which derives signals from `run.selected`.
 */
export function generateTrendCandidates(
  run: RunState,
  _signalsById?: Record<string, SignalCard>,
): TrendCandidate[] {
  void _signalsById;
  return run.clusters.map((c) => buildTrendCandidate(c, run));
}
