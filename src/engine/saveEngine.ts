import type {
  ArchiveEntry,
  GameSave,
  MetaState,
  RunStage,
  RunState,
} from "../types/game";

const RUN_STAGES: RunStage[] = [
  "MAIN_MENU",
  "MISSION_SELECT",
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

const SAVE_KEY = "signal_forge_save_v1";

export function defaultSave(): GameSave {
  return {
    version: 1,
    meta: {
      insightShards: 0,
      unlockedMissionIds: [],
      unlockedSignalIds: [],
      unlockedUpgradeIds: [],
      archive: [],
    },
    lastRun: null,
    settings: { reduceMotion: false },
  };
}

export function saveGame(state: GameSave): void {
  globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(): GameSave | null {
  const raw = globalThis.localStorage.getItem(SAVE_KEY);
  if (raw == null) return null;
  try {
    return parseAndValidate(raw);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  globalThis.localStorage.removeItem(SAVE_KEY);
}

export function exportSave(state: GameSave): string {
  return JSON.stringify(state, null, 2);
}

export function importSave(payload: string): GameSave {
  try {
    return parseAndValidate(payload);
  } catch {
    throw new Error("Invalid save payload");
  }
}

function parseAndValidate(payload: string): GameSave {
  const parsed = JSON.parse(payload);
  if (!isObject(parsed)) throw new Error("Invalid save payload");
  if (parsed.version !== 1) throw new Error("Invalid save payload");
  if (!isValidMeta(parsed.meta)) throw new Error("Invalid save payload");
  if (!isValidLastRun(parsed.lastRun)) throw new Error("Invalid save payload");
  if (!isValidSettings(parsed.settings)) throw new Error("Invalid save payload");
  return parsed as unknown as GameSave;
}

function isValidMeta(meta: unknown): meta is MetaState {
  if (!isObject(meta)) return false;
  return (
    typeof meta.insightShards === "number" &&
    isStringArray(meta.unlockedMissionIds) &&
    isStringArray(meta.unlockedSignalIds) &&
    isStringArray(meta.unlockedUpgradeIds) &&
    Array.isArray(meta.archive) &&
    meta.archive.every(isValidArchiveEntry)
  );
}

function isValidArchiveEntry(entry: unknown): entry is ArchiveEntry {
  if (!isObject(entry)) return false;
  return (
    typeof entry.id === "string" &&
    typeof entry.missionId === "string" &&
    typeof entry.finishedAt === "number" &&
    typeof entry.band === "string" &&
    typeof entry.score === "number" &&
    (entry.preferredScenarioTitle === null ||
      typeof entry.preferredScenarioTitle === "string")
  );
}

function isValidLastRun(value: unknown): value is RunState | null {
  if (value === null) return true;
  if (!isObject(value)) return false;
  // Structural check: enough to reject {} / null / arrays / wrong-type fields.
  // Deep validation of every field would couple this to the live RunState
  // schema, which churns across milestones; we instead spot-check the keys
  // that a corrupted save would most likely break runtime invariants on.
  return (
    typeof value.seed === "string" &&
    typeof value.missionId === "string" &&
    typeof value.stage === "string" &&
    (RUN_STAGES as string[]).includes(value.stage as string) &&
    isObject(value.resources) &&
    Array.isArray(value.priorityStakeholders) &&
    Array.isArray(value.deck) &&
    Array.isArray(value.drawn) &&
    Array.isArray(value.selected) &&
    typeof value.domainDiscountUsed === "number" &&
    Array.isArray(value.clusters) &&
    Array.isArray(value.trendCandidates) &&
    Array.isArray(value.scenarios) &&
    Array.isArray(value.backcastItems) &&
    Array.isArray(value.log)
  );
}

function isValidSettings(value: unknown): value is GameSave["settings"] {
  if (!isObject(value)) return false;
  return typeof value.reduceMotion === "boolean";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
