import { create } from "zustand";
import type { GameSave, MetaState, RunState, RunStage } from "../types/game";
import type { PlayerResources, SignalCard } from "../types/cards";
import type { Mission, TimeHorizon } from "../types/missions";
import {
  createRun,
  advanceStage,
  setTimeHorizon as engineSetTimeHorizon,
  setPriorityStakeholders as engineSetPriorityStakeholders,
} from "../engine/runEngine";
import {
  saveGame,
  loadGame,
  clearSave,
  exportSave,
  importSave,
  defaultSave,
} from "../engine/saveEngine";
import {
  startSignalDraft,
  pickSignal,
  unpickSignal,
  commitSignalDraft,
} from "../engine/draftEngine";
import {
  addCluster,
  removeCluster,
  addSignalToCluster,
  removeSignalFromCluster,
  renameCluster,
  commitPatternBoard,
} from "../engine/patternEngine";
import missionsBundle from "../data/missions.ai.json";
import signalPoolJson from "../data/cards.ai.signals.json";
import balance from "../data/balance.json";

// Typed JSON imports — Vite supports JSON via tsconfig resolveJsonModule.
const missions = (missionsBundle as { missions: Mission[] }).missions;
const signalPool = signalPoolJson as SignalCard[];
const startingResourcesDefault = (
  balance as { startingResources: PlayerResources }
).startingResources;

const MENU_STAGES: RunStage[] = ["MAIN_MENU", "MISSION_SELECT", "ARCHIVE"];

interface GameStore {
  meta: MetaState;
  lastRun: RunState | null;
  settings: GameSave["settings"];
  /** stage to render — derived from lastRun.stage if a run exists, else menu stage */
  stage: RunStage;
  /** menu-only stage tracker, used when no run is active */
  menuStage: RunStage;

  /** action: navigate. Menu stages set menuStage; run stages patch lastRun.stage. */
  goto: (stage: RunStage) => void;
  startRun: (missionId: string, seedOverride?: string) => void;
  setTimeHorizon: (h: TimeHorizon) => void;
  togglePriorityStakeholder: (stakeholder: string) => void;
  advance: () => void;
  abandonRun: () => void;
  resetSave: () => void;
  importSaveString: (s: string) => void;
  exportSaveString: () => string;

  // Signal Draft (canonical names)
  startSignalDraft: () => void;
  pickSignal: (signalId: string) => void;
  unpickSignal: (signalId: string) => void;
  commitSignalDraft: () => void;
  // Signal Draft (back-compat aliases)
  draftStart: () => void;
  draftPick: (signalId: string) => void;
  draftUnpick: (signalId: string) => void;
  draftCommit: () => void;

  // Pattern Board (canonical names)
  addCluster: () => void;
  removeCluster: (clusterId: string) => void;
  addSignalToCluster: (clusterId: string, signalId: string) => void;
  removeSignalFromCluster: (clusterId: string, signalId: string) => void;
  renameCluster: (clusterId: string, title: string) => void;
  commitPatternBoard: () => void;
  // Pattern Board (back-compat aliases)
  patternAddCluster: () => void;
  patternRemoveCluster: (clusterId: string) => void;
  patternAddSignal: (clusterId: string, signalId: string) => void;
  patternRemoveSignal: (clusterId: string, signalId: string) => void;
  patternSetTitle: (clusterId: string, title: string) => void;
  patternCommit: () => void;
}

const generateSeed = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const initialSave: GameSave = loadGame() ?? defaultSave();

const initialMenuStage: RunStage = initialSave.lastRun
  ? "MAIN_MENU"
  : "MAIN_MENU";

const initialStage: RunStage = initialSave.lastRun
  ? initialSave.lastRun.stage
  : initialMenuStage;

const persist = (state: GameStore): void => {
  const payload: GameSave = {
    version: 1,
    meta: state.meta,
    lastRun: state.lastRun,
    settings: state.settings,
  };
  saveGame(payload);
};

export const useGameStore = create<GameStore>((set, get) => ({
  meta: initialSave.meta,
  lastRun: initialSave.lastRun,
  settings: initialSave.settings,
  stage: initialStage,
  menuStage: initialMenuStage,

  goto: (stage) => {
    set((state) => {
      if (MENU_STAGES.includes(stage)) {
        return { stage, menuStage: stage };
      }
      // Run stage: only valid if there's an active run.
      if (!state.lastRun) {
        return { stage: state.stage };
      }
      const nextRun: RunState = { ...state.lastRun, stage };
      return { stage, lastRun: nextRun };
    });
    persist(get());
  },

  startRun: (missionId, seedOverride) => {
    const seed = seedOverride ?? generateSeed();
    const run = createRun({
      missionId,
      seed,
      missions,
      signalPool,
      startingResources: startingResourcesDefault,
    });
    set({ lastRun: run, stage: run.stage });
    persist(get());
  },

  setTimeHorizon: (h) => {
    set((state) => {
      if (!state.lastRun) return {};
      const nextRun = engineSetTimeHorizon(state.lastRun, h);
      return { lastRun: nextRun };
    });
    persist(get());
  },

  togglePriorityStakeholder: (stakeholder) => {
    set((state) => {
      if (!state.lastRun) return {};
      const current = state.lastRun.priorityStakeholders;
      let next: string[];
      if (current.includes(stakeholder)) {
        next = current.filter((s) => s !== stakeholder);
      } else {
        if (current.length >= 3) return {};
        next = [...current, stakeholder];
      }
      const nextRun = engineSetPriorityStakeholders(state.lastRun, next);
      return { lastRun: nextRun };
    });
    persist(get());
  },

  advance: () => {
    set((state) => {
      if (!state.lastRun) return {};
      let nextRun = advanceStage(state.lastRun);
      // Auto-start the Signal Draft on first entry so the Draft screen has
      // cards in `drawn`. Idempotent if drawn is already populated.
      if (nextRun.stage === "SIGNAL_DRAFT" && nextRun.drawn.length === 0) {
        nextRun = startSignalDraft(nextRun);
      }
      return { lastRun: nextRun, stage: nextRun.stage };
    });
    persist(get());
  },

  abandonRun: () => {
    set({ lastRun: null, stage: "MAIN_MENU", menuStage: "MAIN_MENU" });
    persist(get());
  },

  resetSave: () => {
    clearSave();
    const fresh = defaultSave();
    set({
      meta: fresh.meta,
      lastRun: fresh.lastRun,
      settings: fresh.settings,
      stage: "MAIN_MENU",
      menuStage: "MAIN_MENU",
    });
  },

  importSaveString: (s) => {
    const parsed = importSave(s);
    set({
      meta: parsed.meta,
      lastRun: parsed.lastRun,
      settings: parsed.settings,
      stage: parsed.lastRun ? parsed.lastRun.stage : "MAIN_MENU",
      menuStage: "MAIN_MENU",
    });
    persist(get());
  },

  exportSaveString: () => {
    const state = get();
    return exportSave({
      version: 1,
      meta: state.meta,
      lastRun: state.lastRun,
      settings: state.settings,
    });
  },

  startSignalDraft: () => {
    set((state) => {
      if (!state.lastRun) return {};
      const nextRun = startSignalDraft(state.lastRun);
      return { lastRun: nextRun };
    });
    persist(get());
  },

  pickSignal: (signalId) => {
    set((state) => {
      if (!state.lastRun) return {};
      const mission = missions.find((m) => m.id === state.lastRun!.missionId);
      if (!mission) return {};
      const nextRun = pickSignal(state.lastRun, signalId, mission);
      return nextRun === state.lastRun ? {} : { lastRun: nextRun };
    });
    persist(get());
  },

  unpickSignal: (signalId) => {
    set((state) => {
      if (!state.lastRun) return {};
      const mission = missions.find((m) => m.id === state.lastRun!.missionId);
      if (!mission) return {};
      const nextRun = unpickSignal(state.lastRun, signalId, mission);
      return nextRun === state.lastRun ? {} : { lastRun: nextRun };
    });
    persist(get());
  },

  commitSignalDraft: () => {
    const state = get();
    if (!state.lastRun) return;
    try {
      // engine.commitSignalDraft already advances stage internally.
      const advanced = commitSignalDraft(state.lastRun);
      set({ lastRun: advanced, stage: advanced.stage });
      persist(get());
    } catch (err) {
      console.warn("commitSignalDraft failed:", err);
    }
  },

  addCluster: () => {
    set((state) => {
      if (!state.lastRun) return {};
      const nextRun = addCluster(state.lastRun);
      return nextRun === state.lastRun ? {} : { lastRun: nextRun };
    });
    persist(get());
  },

  removeCluster: (clusterId) => {
    set((state) => {
      if (!state.lastRun) return {};
      return { lastRun: removeCluster(state.lastRun, clusterId) };
    });
    persist(get());
  },

  addSignalToCluster: (clusterId, signalId) => {
    set((state) => {
      if (!state.lastRun) return {};
      return { lastRun: addSignalToCluster(state.lastRun, clusterId, signalId) };
    });
    persist(get());
  },

  removeSignalFromCluster: (clusterId, signalId) => {
    set((state) => {
      if (!state.lastRun) return {};
      return {
        lastRun: removeSignalFromCluster(state.lastRun, clusterId, signalId),
      };
    });
    persist(get());
  },

  renameCluster: (clusterId, title) => {
    set((state) => {
      if (!state.lastRun) return {};
      return { lastRun: renameCluster(state.lastRun, clusterId, title) };
    });
    persist(get());
  },

  commitPatternBoard: () => {
    const state = get();
    if (!state.lastRun) return;
    try {
      // engine.commitPatternBoard advances the stage internally.
      const advanced = commitPatternBoard(state.lastRun);
      set({ lastRun: advanced, stage: advanced.stage });
      persist(get());
    } catch (err) {
      console.warn("commitPatternBoard failed:", err);
    }
  },

  // --- Back-compat aliases. They delegate to the canonical actions above so
  // any existing UI wiring keeps working without behavioural change.
  draftStart: () => get().startSignalDraft(),
  draftPick: (id) => get().pickSignal(id),
  draftUnpick: (id) => get().unpickSignal(id),
  draftCommit: () => get().commitSignalDraft(),
  patternAddCluster: () => get().addCluster(),
  patternRemoveCluster: (id) => get().removeCluster(id),
  patternAddSignal: (cid, sid) => get().addSignalToCluster(cid, sid),
  patternRemoveSignal: (cid, sid) => get().removeSignalFromCluster(cid, sid),
  patternSetTitle: (cid, title) => get().renameCluster(cid, title),
  patternCommit: () => get().commitPatternBoard(),
}));

export const getMissions = (): Mission[] => missions;
export const getMission = (id: string): Mission | undefined =>
  missions.find((m) => m.id === id);
