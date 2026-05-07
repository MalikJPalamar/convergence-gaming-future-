import { describe, it, expect } from "vitest";
import {
  startSignalDraft,
  pickSignal,
  unpickSignal,
  commitSignalDraft,
  previewPick,
  DRAFT_HAND_SIZE,
  DRAFT_MIN_SELECT,
  DRAFT_MAX_SELECT,
  DOMAIN_DISCOUNT_LIMIT,
} from "../engine/draftEngine";
import type { Mission } from "../types/missions";
import type { SignalCard, PlayerResources } from "../types/cards";
import type { RunState } from "../types/game";

const startingResources: PlayerResources = {
  attention: 10,
  credibility: 5,
  capital: 5,
  trust: 5,
  time: 8,
};

const mission: Mission = {
  id: "m_agents",
  title: "Agents",
  briefing: "b",
  coreQuestion: "q?",
  aiDomain: "ai_agents",
  timeHorizons: ["near_1_2_years"],
  requiredForces: ["technology", "economy"],
  startingResources,
  scenarioAxes: [],
  winCondition: "w",
  failureCondition: "f",
  difficulty: 2,
  defaultStakeholders: [],
};

const card = (
  id: string,
  patch: Partial<SignalCard> = {},
): SignalCard => ({
  id,
  title: id,
  description: id,
  primaryForce: "technology",
  secondaryForces: [],
  aiDomain: "ai_agents",
  patternTags: [],
  humanNeeds: [],
  evidence: 3,
  novelty: 3,
  uncertainty: 3,
  impact: 3,
  velocity: 3,
  stakeholders: [],
  possibleTrendLinks: [],
  unlockTier: 0,
  ...patch,
});

const buildDeck = (n: number, factory: (i: number) => SignalCard): SignalCard[] =>
  Array.from({ length: n }, (_, i) => factory(i));

const baseRun = (deck: SignalCard[], overrides: Partial<RunState> = {}): RunState => ({
  seed: "seed-test",
  missionId: mission.id,
  stage: "SIGNAL_DRAFT",
  timeHorizon: null,
  priorityStakeholders: [],
  resources: { ...startingResources },
  deck,
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
  ...overrides,
});

describe("startSignalDraft", () => {
  it("moves first DRAFT_HAND_SIZE cards from deck to drawn", () => {
    const deck = buildDeck(20, (i) => card(`c${i}`));
    const run = baseRun(deck);
    const next = startSignalDraft(run);
    expect(next.drawn).toHaveLength(DRAFT_HAND_SIZE);
    expect(next.drawn.map((c) => c.id)).toEqual(
      deck.slice(0, DRAFT_HAND_SIZE).map((c) => c.id),
    );
    expect(next.deck).toHaveLength(20 - DRAFT_HAND_SIZE);
  });

  it("does not mutate the input run", () => {
    const deck = buildDeck(15, (i) => card(`c${i}`));
    const run = baseRun(deck);
    const deckCopy = [...run.deck];
    startSignalDraft(run);
    expect(run.deck).toEqual(deckCopy);
    expect(run.drawn).toEqual([]);
  });

  it("is idempotent if drawn is already populated", () => {
    const deck = buildDeck(20, (i) => card(`c${i}`));
    const run = baseRun(deck);
    const once = startSignalDraft(run);
    const twice = startSignalDraft(once);
    expect(twice.drawn.map((c) => c.id)).toEqual(once.drawn.map((c) => c.id));
    expect(twice.deck.map((c) => c.id)).toEqual(once.deck.map((c) => c.id));
  });
});

describe("pickSignal", () => {
  const buildDrawnRun = (overrides: Partial<RunState> = {}): RunState => {
    const drawn: SignalCard[] = [
      card("a1", { aiDomain: "ai_agents", primaryForce: "technology" }),
      card("a2", { aiDomain: "ai_agents", primaryForce: "economy" }),
      card("a3", { aiDomain: "ai_agents", primaryForce: "government" }),
      card("a4", { aiDomain: "ai_agents", primaryForce: "infrastructure" }),
      card("h1", { aiDomain: "ai_health", primaryForce: "public_health" }),
      card("h2", { aiDomain: "ai_health", primaryForce: "technology" }),
      card("h3", { aiDomain: "ai_security", primaryForce: "media_telecom" }),
    ];
    return baseRun([], { drawn, ...overrides });
  };

  it("moves a card from drawn to selected", () => {
    const run = buildDrawnRun();
    const next = pickSignal(run, "a1", mission);
    expect(next.drawn.find((c) => c.id === "a1")).toBeUndefined();
    expect(next.selected.map((c) => c.id)).toEqual(["a1"]);
  });

  it("first matching domain pick costs 0 attention; discount counter ticks", () => {
    const run = buildDrawnRun();
    const next = pickSignal(run, "a1", mission);
    expect(next.resources.attention).toBe(startingResources.attention);
    expect(next.domainDiscountUsed).toBe(1);
  });

  it("first 3 mission-domain picks cost 0 attention; 4th costs 1", () => {
    let run = buildDrawnRun();
    run = pickSignal(run, "a1", mission); // discount 1
    run = pickSignal(run, "a2", mission); // discount 2
    run = pickSignal(run, "a3", mission); // discount 3
    expect(run.domainDiscountUsed).toBe(DOMAIN_DISCOUNT_LIMIT);
    expect(run.resources.attention).toBe(startingResources.attention);
    const before = run.resources.attention;
    run = pickSignal(run, "a4", mission); // 4th, paid
    expect(run.resources.attention).toBe(before - 1);
    expect(run.domainDiscountUsed).toBe(DOMAIN_DISCOUNT_LIMIT);
  });

  it("non-matching domain pick costs 1 attention", () => {
    const run = buildDrawnRun();
    const next = pickSignal(run, "h1", mission);
    expect(next.resources.attention).toBe(startingResources.attention - 1);
    expect(next.domainDiscountUsed).toBe(0);
  });

  it("required-force pick grants +1 credibility", () => {
    // a1 has primaryForce technology → in requiredForces
    const run = buildDrawnRun();
    const next = pickSignal(run, "a1", mission);
    expect(next.resources.credibility).toBe(startingResources.credibility + 1);
  });

  it("non-required-force pick grants no credibility bonus", () => {
    const run = buildDrawnRun();
    const next = pickSignal(run, "a3", mission); // government, not required
    expect(next.resources.credibility).toBe(startingResources.credibility);
  });

  it("picking a card not in drawn is a no-op (returns same state)", () => {
    const run = buildDrawnRun();
    const next = pickSignal(run, "missing", mission);
    expect(next).toBe(run);
  });

  it("illegal pick (attention=0, no discount) returns same state without mutation", () => {
    // Burn all attention with non-domain picks first.
    const run = buildDrawnRun({ resources: { ...startingResources, attention: 0 } });
    const next = pickSignal(run, "h1", mission); // non-domain → would cost 1
    expect(next).toBe(run);
    expect(run.resources.attention).toBe(0);
    expect(run.selected).toEqual([]);
  });

  it("illegal-pick allows discounted pick even at attention=0", () => {
    const run = baseRun([], {
      drawn: [card("a1", { aiDomain: "ai_agents", primaryForce: "government" })],
      resources: { ...startingResources, attention: 0 },
    });
    const next = pickSignal(run, "a1", mission); // domain match, discounted, cost 0
    expect(next.selected.map((c) => c.id)).toEqual(["a1"]);
    expect(next.resources.attention).toBe(0);
    expect(next.domainDiscountUsed).toBe(1);
  });
});

describe("previewPick", () => {
  const drawn: SignalCard[] = [
    card("a1", { aiDomain: "ai_agents", primaryForce: "technology" }),
    card("h1", { aiDomain: "ai_health", primaryForce: "media_telecom" }),
  ];
  const run: RunState = baseRun([], { drawn });

  it("indicates discount + free attention for a domain match below the limit", () => {
    const p = previewPick(run, "a1", mission);
    expect(p.willGetDomainDiscount).toBe(true);
    expect(p.attentionCost).toBe(0);
    expect(p.credibilityBonus).toBe(1);
    expect(p.legal).toBe(true);
  });

  it("indicates non-discounted cost for a non-domain match", () => {
    const p = previewPick(run, "h1", mission);
    expect(p.willGetDomainDiscount).toBe(false);
    expect(p.attentionCost).toBe(1);
    expect(p.credibilityBonus).toBe(0);
    expect(p.legal).toBe(true);
  });

  it("returns legal=false when card not in drawn", () => {
    const p = previewPick(run, "nope", mission);
    expect(p.legal).toBe(false);
  });

  it("returns legal=false when attention=0 and no discount available", () => {
    const tight: RunState = baseRun([], {
      drawn: [card("h1", { aiDomain: "ai_health", primaryForce: "media_telecom" })],
      resources: { ...startingResources, attention: 0 },
    });
    const p = previewPick(tight, "h1", mission);
    expect(p.legal).toBe(false);
    expect(p.attentionCost).toBe(1);
  });
});

describe("unpickSignal", () => {
  const drawn: SignalCard[] = [
    card("a1", { aiDomain: "ai_agents", primaryForce: "technology" }),
    card("a2", { aiDomain: "ai_agents", primaryForce: "economy" }),
    card("a3", { aiDomain: "ai_agents", primaryForce: "government" }),
    card("a4", { aiDomain: "ai_agents", primaryForce: "infrastructure" }),
    card("h1", { aiDomain: "ai_health", primaryForce: "public_health" }),
  ];

  it("reverses cost and bonus exactly for a non-domain pick", () => {
    const start: RunState = baseRun([], { drawn: [...drawn] });
    const picked = pickSignal(start, "h1", mission);
    const unpicked = unpickSignal(picked, "h1", mission);
    expect(unpicked.resources).toEqual(start.resources);
    expect(unpicked.domainDiscountUsed).toBe(start.domainDiscountUsed);
    expect(unpicked.selected.map((c) => c.id)).toEqual([]);
  });

  it("reverses a discounted pick, decrementing the discount counter", () => {
    const start: RunState = baseRun([], { drawn: [...drawn] });
    const picked = pickSignal(start, "a1", mission);
    const unpicked = unpickSignal(picked, "a1", mission);
    expect(unpicked.resources).toEqual(start.resources);
    expect(unpicked.domainDiscountUsed).toBe(0);
  });

  it("unpicking a 4th paid domain pick refunds 1 attention; counter stays at limit", () => {
    let run: RunState = baseRun([], { drawn: [...drawn] });
    run = pickSignal(run, "a1", mission);
    run = pickSignal(run, "a2", mission);
    run = pickSignal(run, "a3", mission);
    const before4 = run.resources.attention;
    run = pickSignal(run, "a4", mission);
    expect(run.resources.attention).toBe(before4 - 1);
    const reverted = unpickSignal(run, "a4", mission);
    expect(reverted.resources.attention).toBe(before4);
    expect(reverted.domainDiscountUsed).toBe(DOMAIN_DISCOUNT_LIMIT);
  });

  it("unpicking a card not in selected is a no-op", () => {
    const run: RunState = baseRun([], { drawn: [...drawn] });
    const next = unpickSignal(run, "nope", mission);
    expect(next).toBe(run);
  });

  it("pick → unpick → pick lands on equal final attention (round-trip)", () => {
    let run: RunState = baseRun([], { drawn: [...drawn] });
    const finalAfterFirstPick = pickSignal(run, "h1", mission).resources.attention;
    run = pickSignal(run, "h1", mission);
    run = unpickSignal(run, "h1", mission);
    run = pickSignal(run, "h1", mission);
    expect(run.resources.attention).toBe(finalAfterFirstPick);
  });

  it("end-to-end: pick 5 then unpick all returns resources to starting", () => {
    let run: RunState = baseRun([], { drawn: [...drawn] });
    const startSnap = { ...run.resources };
    run = pickSignal(run, "a1", mission);
    run = pickSignal(run, "a2", mission);
    run = pickSignal(run, "h1", mission);
    run = pickSignal(run, "a3", mission);
    run = pickSignal(run, "a4", mission);
    run = unpickSignal(run, "a3", mission);
    run = unpickSignal(run, "a1", mission);
    run = unpickSignal(run, "h1", mission);
    run = unpickSignal(run, "a4", mission);
    run = unpickSignal(run, "a2", mission);
    expect(run.resources).toEqual(startSnap);
    expect(run.domainDiscountUsed).toBe(0);
    expect(run.selected).toEqual([]);
  });
});

describe("commitSignalDraft", () => {
  const drawn: SignalCard[] = Array.from({ length: 12 }, (_, i) =>
    card(`c${i}`, { aiDomain: "ai_agents", primaryForce: "technology" }),
  );

  it("throws when fewer than DRAFT_MIN_SELECT selections", () => {
    let run: RunState = baseRun([], { drawn: [...drawn] });
    run = pickSignal(run, "c0", mission);
    run = pickSignal(run, "c1", mission);
    run = pickSignal(run, "c2", mission);
    run = pickSignal(run, "c3", mission);
    expect(() => commitSignalDraft(run)).toThrow();
  });

  it("throws when more than DRAFT_MAX_SELECT selections", () => {
    let run: RunState = baseRun([], { drawn: [...drawn] });
    for (let i = 0; i < 8; i++) run = pickSignal(run, `c${i}`, mission);
    expect(() => commitSignalDraft(run)).toThrow();
  });

  it("advances stage to PATTERN_BOARD on 5..7 selections", () => {
    for (const n of [DRAFT_MIN_SELECT, 6, DRAFT_MAX_SELECT]) {
      let run: RunState = baseRun([], { drawn: [...drawn] });
      for (let i = 0; i < n; i++) run = pickSignal(run, `c${i}`, mission);
      const next = commitSignalDraft(run);
      expect(next.selected).toHaveLength(n);
      expect(next.stage).toBe("PATTERN_BOARD");
    }
  });
});
