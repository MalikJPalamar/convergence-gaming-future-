import type { GameSave, MetaState } from "../types/game";

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
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid save payload");
  }
  if (parsed.version !== 1) {
    throw new Error("Invalid save payload");
  }
  if (!isValidMeta(parsed.meta)) {
    throw new Error("Invalid save payload");
  }
  return parsed as GameSave;
}

function isValidMeta(meta: unknown): meta is MetaState {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Record<string, unknown>;
  return (
    typeof m.insightShards === "number" &&
    isStringArray(m.unlockedMissionIds) &&
    isStringArray(m.unlockedSignalIds) &&
    isStringArray(m.unlockedUpgradeIds) &&
    Array.isArray(m.archive)
  );
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
