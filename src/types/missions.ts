import type { MacroForce, PlayerResources } from "./cards";

export type TimeHorizon =
  | "near_1_2_years"
  | "mid_3_5_years"
  | "long_5_10_years"
  | "far_10_plus_years";

export interface ScenarioAxis {
  id: string;
  label: string;
  negativePole: string;
  positivePole: string;
  category: string;
}

export interface Mission {
  id: string;
  title: string;
  briefing: string;
  coreQuestion: string;
  aiDomain: string;
  timeHorizons: TimeHorizon[];
  requiredForces: MacroForce[];
  startingResources: PlayerResources;
  scenarioAxes: ScenarioAxis[];
  winCondition: string;
  failureCondition: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  defaultStakeholders: string[];
}
