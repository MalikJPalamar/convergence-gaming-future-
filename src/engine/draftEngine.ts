import type { RunState } from "../types/game";
import type { Mission } from "../types/missions";
import type { SignalCard } from "../types/cards";
import { advanceStage } from "./runEngine";

export const DRAFT_HAND_SIZE = 12;
export const DRAFT_MIN_SELECT = 5;
export const DRAFT_MAX_SELECT = 7;
export const DOMAIN_DISCOUNT_LIMIT = 3;

// --- Back-compat aliases used by older callers (kept for safety; prefer the
// canonical names above). These are pure constants, no behavioural impact.
export const DRAFT_DRAW_COUNT = DRAFT_HAND_SIZE;
export const DRAFT_MIN_PICKS = DRAFT_MIN_SELECT;
export const DRAFT_MAX_PICKS = DRAFT_MAX_SELECT;
export const DRAFT_DOMAIN_DISCOUNT_LIMIT = DOMAIN_DISCOUNT_LIMIT;
export const DRAFT_BASE_ATTENTION_COST = 1;

const isDomainMatch = (card: SignalCard, mission: Mission): boolean =>
  card.aiDomain === mission.aiDomain;

const isForceRequired = (card: SignalCard, mission: Mission): boolean =>
  mission.requiredForces.includes(card.primaryForce);

/**
 * Discount-usage model: rather than tracking per-card flags, we recompute
 * `domainDiscountUsed` deterministically as
 *     min(DOMAIN_DISCOUNT_LIMIT, count of selected domain-cards).
 * The attention cost of an incremental pick is then the difference between
 * "attention paid before" and "attention paid after" — guaranteeing that
 * pick → unpick → pick lands on the same end-state attention (idempotent).
 */
const paidAttentionFor = (
  selected: readonly SignalCard[],
  mission: Mission,
): number => {
  let domainMatches = 0;
  let attention = 0;
  for (const c of selected) {
    if (isDomainMatch(c, mission)) {
      domainMatches += 1;
      if (domainMatches > DOMAIN_DISCOUNT_LIMIT) attention += 1;
    } else {
      attention += 1;
    }
  }
  return attention;
};

const credibilityBonusFor = (
  selected: readonly SignalCard[],
  mission: Mission,
): number => {
  let bonus = 0;
  for (const c of selected) if (isForceRequired(c, mission)) bonus += 1;
  return bonus;
};

const domainDiscountUsedFor = (
  selected: readonly SignalCard[],
  mission: Mission,
): number => {
  const matches = selected.filter((c) => isDomainMatch(c, mission)).length;
  return Math.min(DOMAIN_DISCOUNT_LIMIT, matches);
};

/** Move first DRAFT_HAND_SIZE deck cards into `drawn`. Pure. Idempotent. */
export function startSignalDraft(run: RunState): RunState {
  if (run.drawn.length > 0) return run;
  const take = Math.min(DRAFT_HAND_SIZE, run.deck.length);
  const drawn = run.deck.slice(0, take);
  const deck = run.deck.slice(take);
  return { ...run, deck, drawn };
}

export interface PickPreview {
  attentionCost: 0 | 1;
  credibilityBonus: 0 | 1;
  willGetDomainDiscount: boolean;
  /** false if attention would go negative or card not in drawn */
  legal: boolean;
}

export function previewPick(
  run: RunState,
  signalId: string,
  mission: Mission,
): PickPreview {
  const card = run.drawn.find((c) => c.id === signalId);
  if (!card) {
    return {
      attentionCost: 0,
      credibilityBonus: 0,
      willGetDomainDiscount: false,
      legal: false,
    };
  }
  const willGetDomainDiscount =
    isDomainMatch(card, mission) &&
    run.domainDiscountUsed < DOMAIN_DISCOUNT_LIMIT;
  const attentionCost: 0 | 1 = willGetDomainDiscount ? 0 : 1;
  const credibilityBonus: 0 | 1 = isForceRequired(card, mission) ? 1 : 0;
  const legal = attentionCost === 0 || run.resources.attention > 0;
  return { attentionCost, credibilityBonus, willGetDomainDiscount, legal };
}

/** Move a card from drawn → selected, applying attention math + force bonus. */
export function pickSignal(
  run: RunState,
  signalId: string,
  mission: Mission,
): RunState {
  const idx = run.drawn.findIndex((c) => c.id === signalId);
  if (idx < 0) return run;
  const card = run.drawn[idx]!;
  const willGetDomainDiscount =
    isDomainMatch(card, mission) &&
    run.domainDiscountUsed < DOMAIN_DISCOUNT_LIMIT;
  const attentionCost = willGetDomainDiscount ? 0 : 1;
  if (attentionCost === 1 && run.resources.attention <= 0) return run;

  const drawn = [...run.drawn.slice(0, idx), ...run.drawn.slice(idx + 1)];
  const selected = [...run.selected, card];
  const credibilityDelta = isForceRequired(card, mission) ? 1 : 0;

  return {
    ...run,
    drawn,
    selected,
    domainDiscountUsed: domainDiscountUsedFor(selected, mission),
    resources: {
      ...run.resources,
      attention: run.resources.attention - attentionCost,
      credibility: run.resources.credibility + credibilityDelta,
    },
  };
}

/** Reverse a pick: refund attention + reverse force bonus. No-op if not selected. */
export function unpickSignal(
  run: RunState,
  signalId: string,
  mission: Mission,
): RunState {
  const idx = run.selected.findIndex((c) => c.id === signalId);
  if (idx < 0) return run;
  const card = run.selected[idx]!;
  const selected = [
    ...run.selected.slice(0, idx),
    ...run.selected.slice(idx + 1),
  ];
  const drawn = [...run.drawn, card];

  const attentionDelta =
    paidAttentionFor(selected, mission) - paidAttentionFor(run.selected, mission);
  const credibilityDelta =
    credibilityBonusFor(selected, mission) -
    credibilityBonusFor(run.selected, mission);

  return {
    ...run,
    drawn,
    selected,
    domainDiscountUsed: domainDiscountUsedFor(selected, mission),
    resources: {
      ...run.resources,
      attention: run.resources.attention - attentionDelta,
      credibility: run.resources.credibility + credibilityDelta,
    },
  };
}

/** Validate selection size; throw if out of [DRAFT_MIN_SELECT, DRAFT_MAX_SELECT]. Otherwise advance stage. */
export function commitSignalDraft(run: RunState): RunState {
  const n = run.selected.length;
  if (n < DRAFT_MIN_SELECT || n > DRAFT_MAX_SELECT) {
    throw new Error(
      `Signal Draft requires ${DRAFT_MIN_SELECT}-${DRAFT_MAX_SELECT} selections (got ${n})`,
    );
  }
  return advanceStage(run);
}
