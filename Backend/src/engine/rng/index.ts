import { randomBytes } from "node:crypto";

export interface Rng {
  nextUint32(): number;
  randomInt(maxExclusive: number): number;
}

/**
 * Rejection sampling: draws uint32s and rejects any >= the largest multiple of
 * `maxExclusive` that fits in 2^32, so every remaining value maps to an equally
 * sized bucket. Avoids the modulo-bias that a raw `x % n` would introduce.
 */
export function unbiasedRandomInt(maxExclusive: number, next32: () => number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error(`randomInt: maxExclusive must be a positive integer, got ${maxExclusive}`);
  }
  if (maxExclusive > 0x100000000) {
    throw new Error(`randomInt: maxExclusive must be <= 2^32, got ${maxExclusive}`);
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let x: number;
  do {
    x = next32();
  } while (x >= limit);
  return x % maxExclusive;
}

const SECURE_BUFFER_UINT32_COUNT = 4096;

class SecureRng implements Rng {
  private buffer: Buffer;
  private offset: number;

  constructor() {
    this.buffer = randomBytes(SECURE_BUFFER_UINT32_COUNT * 4);
    this.offset = 0;
  }

  nextUint32(): number {
    if (this.offset >= this.buffer.length) {
      this.buffer = randomBytes(SECURE_BUFFER_UINT32_COUNT * 4);
      this.offset = 0;
    }
    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  randomInt(maxExclusive: number): number {
    return unbiasedRandomInt(maxExclusive, () => this.nextUint32());
  }
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. Not cryptographically secure; test/replay only. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

class SeededRng implements Rng {
  private next: () => number;

  constructor(seed: string) {
    this.next = mulberry32(fnv1a32(seed));
  }

  nextUint32(): number {
    return this.next();
  }

  randomInt(maxExclusive: number): number {
    return unbiasedRandomInt(maxExclusive, () => this.nextUint32());
  }
}

/** Replays a previously recorded rngTrace exactly, in order. Used to byte-for-byte replay a stored spin. */
class TraceRng implements Rng {
  private index = 0;

  constructor(private readonly trace: readonly number[]) {}

  nextUint32(): number {
    const value = this.trace[this.index];
    if (value === undefined) {
      throw new Error(`TraceRng exhausted: trace has ${this.trace.length} values`);
    }
    this.index++;
    return value;
  }

  randomInt(maxExclusive: number): number {
    return unbiasedRandomInt(maxExclusive, () => this.nextUint32());
  }
}

export function createSecureRng(): Rng {
  return new SecureRng();
}

export function createSeededRng(seed: string): Rng {
  return new SeededRng(seed);
}

export function createTraceRng(trace: readonly number[]): Rng {
  return new TraceRng(trace);
}

/**
 * Wraps an Rng and records every raw nextUint32() draw it produces (including draws
 * rejected internally by unbiased rejection sampling) into `trace`, in order. Feeding
 * `trace` back into createTraceRng() and re-running the same resolveSpin call reproduces
 * the identical outcome — this is the byte-for-byte replay mechanism.
 */
export function createRecordingRng(inner: Rng): { rng: Rng; trace: number[] } {
  const trace: number[] = [];
  const rng: Rng = {
    nextUint32(): number {
      const value = inner.nextUint32();
      trace.push(value);
      return value;
    },
    randomInt(maxExclusive: number): number {
      return unbiasedRandomInt(maxExclusive, () => rng.nextUint32());
    },
  };
  return { rng, trace };
}
