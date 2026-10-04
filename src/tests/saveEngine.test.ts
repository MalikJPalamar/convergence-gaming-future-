import { describe, it, expect, beforeEach } from "vitest";
import {
  saveGame,
  loadGame,
  clearSave,
  exportSave,
  importSave,
  defaultSave,
} from "../engine/saveEngine";
import type { GameSave } from "../types/game";

const SAVE_KEY = "signal_forge_save_v1";

const makeSave = (): GameSave => ({
  version: 1,
  meta: {
    insightShards: 7,
    unlockedMissionIds: ["m_agents"],
    unlockedSignalIds: ["s1", "s2"],
    unlockedUpgradeIds: ["u1"],
    archive: [
      {
        id: "a1",
        missionId: "m_agents",
        finishedAt: 1234,
        band: "adaptive_future",
        score: 72,
        preferredScenarioTitle: "A title",
      },
    ],
  },
  lastRun: null,
  settings: { reduceMotion: false },
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe("saveEngine round-trip", () => {
  it("save then load returns a deep-equal payload", () => {
    const save = makeSave();
    saveGame(save);
    const loaded = loadGame();
    expect(loaded).toEqual(save);
  });

  it("loadGame returns null when nothing saved", () => {
    expect(loadGame()).toBeNull();
  });

  it("clearSave removes the key", () => {
    saveGame(makeSave());
    expect(globalThis.localStorage.getItem(SAVE_KEY)).not.toBeNull();
    clearSave();
    expect(globalThis.localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(loadGame()).toBeNull();
  });
});

describe("exportSave / importSave", () => {
  it("exportSave output parses back via importSave", () => {
    const save = makeSave();
    const payload = exportSave(save);
    expect(typeof payload).toBe("string");
    expect(payload).toContain("\n"); // pretty-printed
    expect(importSave(payload)).toEqual(save);
  });

  it("rejects non-JSON", () => {
    expect(() => importSave("not json {")).toThrowError("Invalid save payload");
  });

  it("rejects JSON missing version", () => {
    const bad = JSON.stringify({ meta: {}, lastRun: null });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects JSON with wrong version", () => {
    const bad = JSON.stringify({ version: 2, meta: makeSave().meta });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects JSON with wrong meta shape", () => {
    const bad = JSON.stringify({
      version: 1,
      meta: { insightShards: "no", unlockedMissionIds: [] },
      lastRun: null,
      settings: { reduceMotion: false },
    });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects malformed archive entries", () => {
    const base = makeSave();
    const bad = JSON.stringify({
      ...base,
      meta: {
        ...base.meta,
        archive: [{ id: "a1" /* missing missionId/score/etc. */ }],
      },
    });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects null settings", () => {
    const base = makeSave();
    const bad = JSON.stringify({ ...base, settings: null });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects missing settings", () => {
    const base = makeSave();
    const { settings: _settings, ...rest } = base;
    const bad = JSON.stringify(rest);
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects empty-object lastRun", () => {
    const base = makeSave();
    const bad = JSON.stringify({ ...base, lastRun: {} });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects array lastRun", () => {
    const base = makeSave();
    const bad = JSON.stringify({ ...base, lastRun: [] });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("rejects lastRun with unknown stage", () => {
    const base = makeSave();
    const bad = JSON.stringify({
      ...base,
      lastRun: {
        seed: "s",
        missionId: "m_agents",
        stage: "NOT_A_STAGE",
        timeHorizon: null,
        priorityStakeholders: [],
        resources: {
          attention: 10,
          credibility: 5,
          capital: 5,
          trust: 5,
          time: 10,
        },
        deck: [],
        drawn: [],
        selected: [],
        domainDiscountUsed: 0,
        clusters: [],
        trendCandidates: [],
        scenarios: [],
        preferredScenarioId: null,
        backcastItems: [],
        finalScore: null,
        log: [],
      },
    });
    expect(() => importSave(bad)).toThrowError("Invalid save payload");
  });

  it("accepts a well-formed lastRun", () => {
    const base = makeSave();
    const ok = JSON.stringify({
      ...base,
      lastRun: {
        seed: "s",
        missionId: "m_agents",
        stage: "MISSION_BRIEF",
        timeHorizon: null,
        priorityStakeholders: [],
        resources: {
          attention: 10,
          credibility: 5,
          capital: 5,
          trust: 5,
          time: 10,
        },
        deck: [],
        drawn: [],
        selected: [],
        domainDiscountUsed: 0,
        clusters: [],
        trendCandidates: [],
        scenarios: [],
        preferredScenarioId: null,
        backcastItems: [],
        finalScore: null,
        log: [],
      },
    });
    expect(() => importSave(ok)).not.toThrow();
  });
});

describe("defaultSave", () => {
  it("has version 1 and zero shards, lastRun null", () => {
    const d = defaultSave();
    expect(d.version).toBe(1);
    expect(d.meta.insightShards).toBe(0);
    expect(d.meta.unlockedMissionIds).toEqual([]);
    expect(d.meta.unlockedSignalIds).toEqual([]);
    expect(d.meta.unlockedUpgradeIds).toEqual([]);
    expect(d.meta.archive).toEqual([]);
    expect(d.lastRun).toBeNull();
  });
});
