import type { SignalCard } from "../types/cards";
import type { SeededRng } from "./rng";

export function dealHand(
  deck: readonly SignalCard[],
  n: number,
  rng: SeededRng,
): SignalCard[] {
  return rng.shuffle(deck).slice(0, n);
}
