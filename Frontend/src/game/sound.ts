// No audio assets for this demo — short tones synthesized with the Web Audio API. Gated
// entirely by the caller checking useSettingsStore's soundEnabled before calling in.
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
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
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gainNode);
  gainNode.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playReelStop(): void {
  tone(320, 0, 0.08, 0.15, "square");
}

export function playWin(): void {
  tone(523.25, 0, 0.12, 0.12);
  tone(659.25, 0.08, 0.12, 0.12);
  tone(783.99, 0.16, 0.18, 0.12);
}

export function playFeatureTrigger(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.09, 0.2, 0.14));
}

export function playSpinStart(): void {
  tone(200, 0, 0.1, 0.08, "sawtooth");
}
