import { describe, it, expect } from "vitest";
import { dealHand } from "../engine/cardEngine";
import { createRng } from "../engine/rng";
import type { SignalCard } from "../types/cards";

const card = (id: string): SignalCard => ({
  id,
  title: id,
  description: id,
  primaryForce: "technology",
  secondaryForces: [],
  aiDomain: "ai_agents",
  patternTags: [],
  humanNeeds: [],
  evidence: 1,
  novelty: 1,
  uncertainty: 1,
  impact: 1,
  velocity: 1,
  stakeholders: [],
  possibleTrendLinks: [],
  unlockTier: 0,
});

describe("dealHand", () => {
  it("returns n cards and is deterministic for same seed", () => {
    const deck = Array.from({ length: 10 }, (_, i) => card(`c${i}`));
    const a = dealHand(deck, 5, createRng("hand"));
    const b = dealHand(deck, 5, createRng("hand"));
    expect(a).toHaveLength(5);
    expect(a).toEqual(b);
  });
});
