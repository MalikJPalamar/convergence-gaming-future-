import type { RunState } from "../types/game";
import type { TrendCandidate, TrendBand } from "../types/scoring";
import { advanceStage } from "./runEngine";

export const VALID_THRESHOLD = 7;
export const MAJOR_THRESHOLD = 10;
export const SCORE_MIN = 0;
export const SCORE_MAX = 3;

export type TrendScoreField =
  | "humanNeedScore"
  | "persistenceScore"
  | "convergenceScore"
  | "evolutionScore";

const clampScore = (n: number): number =>
  Math.max(SCORE_MIN, Math.min(SCORE_MAX, n));

/** Classification bands: fad 0-3, weak 4-6, emerging 7-9, major 10-12. */
export function classifyValidity(score: number): TrendBand {
  // Defensive: an out-of-range sum still maps to the nearest band.
  const clamped = Math.max(0, Math.min(12, score));
  if (clamped >= MAJOR_THRESHOLD) return "major";
  if (clamped >= VALID_THRESHOLD) return "emerging";
  if (clamped >= 4) return "weak";
  return "fad";
}

const recomputeValidity = (t: TrendCandidate): TrendCandidate => {
  const validityScore =
    t.humanNeedScore +
    t.persistenceScore +
    t.convergenceScore +
    t.evolutionScore;
  return {
    ...t,
    validityScore,
    isValidated: validityScore >= VALID_THRESHOLD,
  };
};

/**
 * Pure. Clamps value to [SCORE_MIN, SCORE_MAX], recomputes validityScore +
 * isValidated. No-op (new run, same-shape data) if trendId missing.
 */
export function setTrendScore(
  run: RunState,
  trendId: string,
  field: TrendScoreField,
  value: number,
): RunState {
  const clamped = clampScore(value);
  const trendCandidates = run.trendCandidates.map((t) =>
    t.id === trendId ? recomputeValidity({ ...t, [field]: clamped }) : t,
  );
  return { ...run, trendCandidates };
}

/** Pure. Zeros the four sub-scores and recomputes validity. */
export function resetTrendScores(run: RunState, trendId: string): RunState {
  const trendCandidates = run.trendCandidates.map((t) =>
    t.id === trendId
      ? recomputeValidity({
          ...t,
          humanNeedScore: 0,
          persistenceScore: 0,
          convergenceScore: 0,
          evolutionScore: 0,
        })
      : t,
  );
  return { ...run, trendCandidates };
}

/**
 * Pure. Throws when no trend has validityScore >= VALID_THRESHOLD;
 * otherwise returns a run advanced to VELOCITY_MATRIX.
 */
export function commitTrendValidation(run: RunState): RunState {
  const anyValid = run.trendCandidates.some(
    (t) => t.validityScore >= VALID_THRESHOLD,
  );
  if (!anyValid) {
    throw new Error("At least one validated trend required");
  }
  return advanceStage({ ...run });
}
