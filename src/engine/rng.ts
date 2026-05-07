// Mulberry32 PRNG seeded by an FNV-1a hash of the seed string.
// Tiny, fast, and deterministic across JS engines.

export interface SeededRng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
  fork(label: string): SeededRng;
}

function fnv1a(input: string): number {
  // 32-bit FNV-1a; final >>> 0 forces unsigned.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  let state = a >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFromSeedNumber(seedNumber: number, seedString: string): SeededRng {
  const next = mulberry32(seedNumber);
  const self: SeededRng = {
    next,
    int(maxExclusive) {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    pick(arr) {
      return arr[self.int(arr.length)] as never;
    },
    shuffle(arr) {
      // Fisher-Yates on a copy.
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = self.int(i + 1);
        const tmp = out[i] as never;
        out[i] = out[j] as never;
        out[j] = tmp;
      }
      return out as never;
    },
    fork(label) {
      // Combine seed + label so siblings diverge, and forks are stable.
      return createRng(`${seedString}::${label}`);
    },
  };
  return self;
}

export function createRng(seed: string): SeededRng {
  return rngFromSeedNumber(fnv1a(seed), seed);
}
