// No audio assets — short punchy tones synthesized with the Web Audio API. Gated by the
// caller checking useSettingsStore's soundEnabled before calling in.
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, gain: number, type: OscillatorType = "sine"): void {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gainNode = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = audio.currentTime + startOffset;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.008);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gainNode);
  gainNode.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** A pitch sweep between two frequencies — good for whooshes and zaps. */
function sweep(from: number, to: number, startOffset: number, duration: number, gain: number, type: OscillatorType = "sawtooth"): void {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gainNode = audio.createGain();
  osc.type = type;
  const now = audio.currentTime + startOffset;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gainNode);
  gainNode.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** A decaying white-noise burst — impact/crackle/air for big moments. */
function noiseBurst(startOffset: number, duration: number, gain: number): void {
  const audio = getContext();
  if (!audio) return;
  const len = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, len, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len); // decays to 0
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const g = audio.createGain();
  const now = audio.currentTime + startOffset;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  src.connect(g);
  g.connect(audio.destination);
  src.start(now);
  src.stop(now + duration + 0.02);
}

/** Per-reel landing click. */
export function playReelStop(): void {
  tone(300, 0, 0.07, 0.18, "square");
  tone(150, 0, 0.05, 0.12, "square");
}

/** Loud, energetic launch when the player hits SPIN. */
export function playSpinStart(): void {
  sweep(180, 520, 0, 0.28, 0.28, "sawtooth");
  sweep(90, 240, 0, 0.3, 0.2, "square");
  tone(760, 0.02, 0.09, 0.12, "triangle");
}

/** Short, bright, satisfying "you won" chime — punchy, not slow. */
export function playWin(): void {
  tone(659.25, 0, 0.1, 0.22, "triangle"); // E5
  tone(830.6, 0.05, 0.1, 0.22, "triangle"); // G#5
  tone(1046.5, 0.1, 0.16, 0.24, "triangle"); // C6
  tone(1567.98, 0.12, 0.12, 0.14, "sine"); // sparkle
}

/** Mystical, rising, LOUD shimmer for a scatter landing — a bell cascade climbing two
 * octaves with an airy whoosh, so a scatter is unmistakable. */
export function playScatter(): void {
  [880, 1108.7, 1318.5, 1760, 2217.5].forEach((f, i) => tone(f, i * 0.07, 0.42, 0.2, "sine"));
  [440, 554.4, 659.3, 880].forEach((f, i) => tone(f, i * 0.07, 0.5, 0.12, "triangle"));
  sweep(480, 2500, 0, 0.6, 0.14, "triangle");
  noiseBurst(0, 0.3, 0.06); // airy sparkle
  tone(2637, 0.34, 0.4, 0.12, "sine"); // high chime tail
}

/** Electric, punchy zap when a wild lands — rising zap + descending laser + bass thump and
 * crackle, clearly different from the scatter shimmer. */
export function playWild(): void {
  sweep(280, 1500, 0, 0.14, 0.32, "sawtooth"); // rising zap
  sweep(1700, 320, 0.1, 0.2, 0.24, "square"); // descending laser
  tone(1250, 0, 0.08, 0.22, "square"); // bright stinger
  noiseBurst(0, 0.13, 0.2); // electric crackle
  tone(85, 0.02, 0.2, 0.3, "sine"); // bass thump
}

/** The biggest moment — a triumphant, loud jackpot: deep boom + impact, an ascending
 * fanfare across two octaves with harmony, then a sustained shimmering bell tail. */
export function playJackpot(): void {
  noiseBurst(0, 0.4, 0.28); // impact crash
  tone(65, 0, 0.7, 0.4, "sine"); // deep boom
  tone(98, 0.02, 0.6, 0.28, "sine");
  const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
  fanfare.forEach((f, i) => {
    tone(f, i * 0.08, 0.55, 0.26, "triangle");
    tone(f * 1.5, i * 0.08, 0.55, 0.13, "sine"); // a fifth above = brass shine
  });
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, 0.52 + i * 0.06, 0.75, 0.16, "sine")); // shimmer tail
  sweep(180, 1700, 0, 0.75, 0.18, "sawtooth"); // rising riser under it all
}

/** Free-spins / feature trigger. */
export function playFeatureTrigger(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.09, 0.22, 0.16, "triangle"));
}
