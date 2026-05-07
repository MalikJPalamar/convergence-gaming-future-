import { describe, it, expect } from "vitest";
import { createRng } from "../engine/rng";

describe("createRng", () => {
  it("produces identical first 20 next() values for same seed", () => {
    const a = createRng("alpha");
    const b = createRng("alpha");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("diverges within first 5 values for different seeds", () => {
    const a = createRng("alpha");
    const b = createRng("beta");
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("shuffle returns a permutation (same multiset, new array)", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rng = createRng("shuffle-seed");
    const shuffled = rng.shuffle(arr);
    expect(shuffled).not.toBe(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(arr);
    // some seed must produce a different order; this seed does.
    expect(shuffled).not.toEqual(arr);
  });

  it("int returns values in [0, max)", () => {
    const rng = createRng("ints");
    for (let i = 0; i < 50; i++) {
      const v = rng.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("pick is deterministic with same seed", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const a = createRng("pick");
    const b = createRng("pick");
    const seqA = Array.from({ length: 10 }, () => a.pick(arr));
    const seqB = Array.from({ length: 10 }, () => b.pick(arr));
    expect(seqA).toEqual(seqB);
  });

  it("fork produces different streams for different labels", () => {
    const root = createRng("root");
    const a = root.fork("a");
    const b = root.fork("b");
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("fork is deterministic across runs", () => {
    const r1 = createRng("root").fork("child");
    const r2 = createRng("root").fork("child");
    expect(Array.from({ length: 5 }, () => r1.next())).toEqual(
      Array.from({ length: 5 }, () => r2.next()),
    );
  });
});
