import type { PatternTag } from "./cards";

export interface TrendCandidate {
  id: string;
  title: string;
  signalIds: string[];
  patternTags: PatternTag[];
  humanNeedScore: number;       // 0-3
  persistenceScore: number;     // 0-3
  convergenceScore: number;     // 0-3
  evolutionScore: number;       // 0-3
  validityScore: number;        // 0-12
  isValidated: boolean;
}

export type TrendBand = "fad" | "weak" | "emerging" | "major";

export type ScenarioFraming =
  | "optimistic"
  | "neutral"
  | "pessimistic"
  | "catastrophic";

export type ScenarioQuadrant =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right";

export interface Scenario {
  id: string;
  title: string;
  quadrant: ScenarioQuadrant;
  framing: ScenarioFraming;
  timeHorizon: string;
  summary: string;
  risks: string[];
  opportunities: string[];
  affectedStakeholders: string[];
}

export type BackcastItemType =
  | "indicator"
  | "entity"
  | "action"
  | "risk"
  | "opportunity";

export interface BackcastItem {
  id: string;
  type: BackcastItemType;
  title: string;
  description: string;
  yearOffset: number;
  linkedScenarioId?: string;
  linkedSignalIds?: string[];
}

export type ScoreBand =
  | "collapse_path"
  | "fragile_future"
  | "adaptive_future"
  | "strategic_future"
  | "preferred_future_secured";

export interface FutureReadinessScore {
  trendAccuracy: number;        // 0-100
  scenarioRobustness: number;   // 0-100
  stakeholderAlignment: number; // 0-100
  backcastQuality: number;      // 0-100
  ethicalResilience: number;    // 0-100
  total: number;                // 0-100
  band: ScoreBand;
}
