import type { SignalCard, PlayerResources } from "./cards";
import type { Mission, TimeHorizon } from "./missions";
import type {
  TrendCandidate,
  Scenario,
  BackcastItem,
  FutureReadinessScore,
} from "./scoring";

export type RunStage =
  | "MAIN_MENU"
  | "MISSION_SELECT"
  | "MISSION_BRIEF"
  | "SIGNAL_DRAFT"
  | "PATTERN_BOARD"
  | "TREND_VALIDATION"
  | "VELOCITY_MATRIX"
  | "SCENARIO_FORGE"
  | "BACKCAST_TIMELINE"
  | "RUN_OUTCOME"
  | "ARCHIVE";

export interface PatternCluster {
  id: string;
  signalIds: string[];
  proposedTitle: string;
}

export interface RunState {
  /** stable seed string used to initialise the run RNG */
  seed: string;
  missionId: string;
  stage: RunStage;
  timeHorizon: TimeHorizon | null;
  priorityStakeholders: string[];
  resources: PlayerResources;
  /** the deck the player draws from, pre-shuffled deterministically */
  deck: SignalCard[];
  /** cards revealed during signal draft */
  drawn: SignalCard[];
  /** cards picked by the player */
  selected: SignalCard[];
  /** count of mission-domain picks that received the attention discount */
  domainDiscountUsed: number;
  /** Pattern Board: clusters of selected signals, generated trends in commit */
  clusters: PatternCluster[];
  trendCandidates: TrendCandidate[];
  scenarios: Scenario[];
  preferredScenarioId: string | null;
  backcastItems: BackcastItem[];
  finalScore: FutureReadinessScore | null;
  /** events for the in-run log; useful for debugging + archive */
  log: RunLogEntry[];
}

export interface RunLogEntry {
  at: number;
  stage: RunStage;
  message: string;
}

export interface MetaState {
  insightShards: number;
  unlockedMissionIds: string[];
  unlockedSignalIds: string[];
  unlockedUpgradeIds: string[];
  archive: ArchiveEntry[];
}

export interface ArchiveEntry {
  id: string;
  missionId: string;
  finishedAt: number;
  band: string;
  score: number;
  preferredScenarioTitle: string | null;
}

export interface GameSave {
  version: 1;
  meta: MetaState;
  lastRun: RunState | null;
  settings: {
    reduceMotion: boolean;
  };
}

export interface MissionsBundle {
  missions: Mission[];
}
