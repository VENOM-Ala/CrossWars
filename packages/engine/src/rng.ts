/**
 * Deterministic RNG (mulberry32). The state lives inside GameState so that a
 * whole match can be replayed exactly from its seed + move list.
 */

export function seedFromString(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Returns the next float in [0, 1) and the advanced state. */
export function nextFloat(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

/** Fisher-Yates using the seeded stream. Returns a new array. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const [f, next] = nextFloat(s);
    s = next;
    const j = Math.floor(f * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, s];
}
