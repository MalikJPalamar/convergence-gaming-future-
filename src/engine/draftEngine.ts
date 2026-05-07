import type { RunState } from "../types/game";
import type { Mission } from "../types/missions";
import type { SignalCard } from "../types/cards";

export const DRAFT_DRAW_COUNT = 12;
export const DRAFT_MIN_PICKS = 5;
export const DRAFT_MAX_PICKS = 7;
export const DRAFT_DOMAIN_DISCOUNT_LIMIT = 3;
export const DRAFT_BASE_ATTENTION_COST = 1;

/** Move first DRAFT_DRAW_COUNT cards from deck to drawn. Idempotent if drawn already populated. */
export function startSignalDraft(run: RunState): RunState {
  if (run.drawn.length > 0) {
    return run;
  }
  const take = Math.min(DRAFT_DRAW_COUNT, run.deck.length);
  const drawn = run.deck.slice(0, take);
  const deck = run.deck.slice(take);
  return { ...run, deck, drawn };
}

export interface PickPreview {
  attentionCost: number;
  credibilityBonus: number;
  willUseDomainDiscount: boolean;
}

const isDomainMatch = (card: SignalCard, mission: Mission): boolean =>
  card.aiDomain === mission.aiDomain;

const isForceRequired = (card: SignalCard, mission: Mission): boolean =>
  mission.requiredForces.includes(card.primaryForce);

/** Total attention paid for a list of selected cards under domain discount rules. */
const paidAttentionFor = (
  selected: SignalCard[],
  mission: Mission,
): number => {
  let domainMatches = 0;
  let attention = 0;
  for (const c of selected) {
    if (isDomainMatch(c, mission)) {
      domainMatches += 1;
      if (domainMatches > DRAFT_DOMAIN_DISCOUNT_LIMIT) {
        attention += DRAFT_BASE_ATTENTION_COST;
      }
    } else {
      attention += DRAFT_BASE_ATTENTION_COST;
    }
  }
  return attention;
};

/** Total credibility bonus granted for a list of selected cards. */
const bonusFor = (selected: SignalCard[], mission: Mission): number => {
  let bonus = 0;
  for (const c of selected) {
    if (isForceRequired(c, mission)) bonus += 1;
  }
  return bonus;
};

const domainDiscountUsedFor = (
  selected: SignalCard[],
  mission: Mission,
): number => {
  const matches = selected.filter((c) => isDomainMatch(c, mission)).length;
  return Math.min(DRAFT_DOMAIN_DISCOUNT_LIMIT, matches);
};

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
      willUseDomainDiscount: false,
    };
  }
  const before = paidAttentionFor(run.selected, mission);
  const after = paidAttentionFor([...run.selected, card], mission);
  const attentionCost = after - before;
  const credibilityBonus = isForceRequired(card, mission) ? 1 : 0;
  const willUseDomainDiscount =
    isDomainMatch(card, mission) &&
    run.domainDiscountUsed < DRAFT_DOMAIN_DISCOUNT_LIMIT;
  return { attentionCost, credibilityBonus, willUseDomainDiscount };
}

export function pickSignal(
  run: RunState,
  signalId: string,
  mission: Mission,
): RunState {
  const idx = run.drawn.findIndex((c) => c.id === signalId);
  if (idx < 0) {
    throw new Error(`Card not in drawn pool: ${signalId}`);
  }
  const card = run.drawn[idx]!;
  const drawn = [...run.drawn.slice(0, idx), ...run.drawn.slice(idx + 1)];
  const selected = [...run.selected, card];

  const attentionDelta =
    paidAttentionFor(selected, mission) - paidAttentionFor(run.selected, mission);
  const credibilityDelta =
    bonusFor(selected, mission) - bonusFor(run.selected, mission);

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

export function unpickSignal(
  run: RunState,
  signalId: string,
  mission: Mission,
): RunState {
  const idx = run.selected.findIndex((c) => c.id === signalId);
  if (idx < 0) {
    throw new Error(`Card not in selected pool: ${signalId}`);
  }
  const card = run.selected[idx]!;
  const selected = [
    ...run.selected.slice(0, idx),
    ...run.selected.slice(idx + 1),
  ];
  const drawn = [...run.drawn, card];

  const attentionDelta =
    paidAttentionFor(selected, mission) - paidAttentionFor(run.selected, mission);
  const credibilityDelta =
    bonusFor(selected, mission) - bonusFor(run.selected, mission);

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

export function commitSignalDraft(run: RunState): RunState {
  const n = run.selected.length;
  if (n < DRAFT_MIN_PICKS || n > DRAFT_MAX_PICKS) {
    throw new Error("Signal Draft requires 5–7 selections");
  }
  return run;
}
