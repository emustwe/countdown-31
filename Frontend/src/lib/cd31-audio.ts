// Tiny Web Audio helper for Count Down 31 — synthesizes short blips (no audio files needed).
// A "tick" for the reel stepping through numbers, and a "select" blip when a number is picked.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, durMs: number, type: OscillatorType, gain: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
  osc.connect(g);
  g.connect(a.destination);
  osc.start(t);
  osc.stop(t + durMs / 1000);
}

/** Short high click — the reel stepping one number forward. */
export function playTick() {
  blip(1500, 35, "square", 0.05);
}
/** A softer blip when the player selects a number. */
export function playSelect() {
  blip(560, 90, "triangle", 0.07);
}
