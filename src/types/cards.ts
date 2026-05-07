export type MacroForce =
  | "technology"
  | "education"
  | "wealth_distribution"
  | "infrastructure"
  | "government"
  | "media_telecom"
  | "demographics"
  | "geopolitics"
  | "environment"
  | "economy"
  | "public_health";

export type PatternTag =
  | "clash"
  | "turn"
  | "practice"
  | "hack"
  | "edge"
  | "outlier";

export type HumanNeed =
  | "safety"
  | "belonging"
  | "status"
  | "mastery"
  | "convenience"
  | "agency"
  | "survival"
  | "meaning";

export type AiDomain =
  | "ai_agents"
  | "synthetic_media"
  | "ai_governance"
  | "ai_labor"
  | "ai_education"
  | "ai_health"
  | "ai_infrastructure"
  | "ai_security"
  | "ai_science"
  | "ai_creativity"
  | "ai_economy"
  | "ai_companions"
  | "ai_geopolitics"
  | "ai_energy"
  | "ai_hardware"
  | "open_source_ai"
  | "ai_persuasion";

export interface SignalCard {
  id: string;
  title: string;
  description: string;
  primaryForce: MacroForce;
  secondaryForces: MacroForce[];
  aiDomain: AiDomain;
  patternTags: PatternTag[];
  humanNeeds: HumanNeed[];
  /** 1-5 */ evidence: number;
  /** 1-5 */ novelty: number;
  /** 1-5 */ uncertainty: number;
  /** 1-5 */ impact: number;
  /** 1-5 */ velocity: number;
  stakeholders: string[];
  possibleTrendLinks: string[];
  unlockTier: number;
}

export type ActionCategory =
  | "build_capability"
  | "find_disruption"
  | "develop_strategy"
  | "brainstorm_idea"
  | "form_partnership"
  | "regulate"
  | "invest"
  | "educate_public"
  | "launch_pilot"
  | "red_team";

export interface ActionCard {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  cost: Partial<PlayerResources>;
  effects: Partial<PlayerResources>;
  tags: string[];
  unlockTier: number;
}

export interface PlayerResources {
  attention: number;
  credibility: number;
  capital: number;
  trust: number;
  time: number;
}
