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
      const nextRun = advanceStage(state.lastRun);
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
}));

export const getMissions = (): Mission[] => missions;
export const getMission = (id: string): Mission | undefined =>
  missions.find((m) => m.id === id);
