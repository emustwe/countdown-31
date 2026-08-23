/**
 * Centralized Sound Manager for Count Down 31
 * Provides zero-latency synthesized Web Audio sound effects with optional Howler static asset playback.
 */
import { Howl } from "howler";

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private soundCache: Map<string, Howl> = new Map();
  private lastPlaybackAt = 0;
  private lastHoverAt = 0;
  private userActivated = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      this.lastPlaybackAt = Date.now();
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /** Lets the global UI sound layer avoid doubling a component-specific sound. */
  public wasPlayedSince(timestamp: number) {
    return this.lastPlaybackAt >= timestamp;
  }

  public unlock() {
    this.userActivated = true;
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  private playNotes(
    notes: Array<{ frequency: number; delay?: number; duration?: number; gain?: number }>,
    wave: OscillatorType = "sine",
  ) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    notes.forEach(({ frequency, delay = 0, duration = 0.09, gain = 0.16 }) => {
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(Math.max(0.001, gain * this.volume), start);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    });
  }

  /** Very quiet focus cue; throttled so moving across a menu never becomes noisy. */
  public playHover() {
    if (!this.userActivated) return;
    const now = Date.now();
    if (now - this.lastHoverAt < 75) return;
    this.lastHoverAt = now;
    this.playNotes([{ frequency: 720, duration: 0.025, gain: 0.045 }], "sine");
  }

  public playNavigate() {
    this.playNotes([
      { frequency: 330, duration: 0.07, gain: 0.12 },
      { frequency: 520, delay: 0.045, duration: 0.09, gain: 0.13 },
    ], "triangle");
  }

  public playOpen() {
    this.playNotes([
      { frequency: 440, duration: 0.08, gain: 0.11 },
      { frequency: 660, delay: 0.055, duration: 0.11, gain: 0.13 },
    ], "sine");
  }

  public playClose() {
    this.playNotes([
      { frequency: 560, duration: 0.07, gain: 0.1 },
      { frequency: 350, delay: 0.04, duration: 0.09, gain: 0.11 },
    ], "sine");
  }

  public playToggle(on: boolean) {
    this.playNotes(
      on
        ? [{ frequency: 480, duration: 0.055, gain: 0.12 }, { frequency: 760, delay: 0.04, duration: 0.08, gain: 0.13 }]
        : [{ frequency: 610, duration: 0.055, gain: 0.11 }, { frequency: 360, delay: 0.04, duration: 0.08, gain: 0.11 }],
      "square",
    );
  }

  public playConfirm() {
    this.playNotes([
      { frequency: 523.25, duration: 0.09, gain: 0.15 },
      { frequency: 659.25, delay: 0.055, duration: 0.11, gain: 0.16 },
      { frequency: 783.99, delay: 0.11, duration: 0.14, gain: 0.17 },
    ], "triangle");
  }

  public playSuccess() {
    this.playNotes([
      { frequency: 659.25, duration: 0.12, gain: 0.16 },
      { frequency: 783.99, delay: 0.07, duration: 0.14, gain: 0.17 },
      { frequency: 1046.5, delay: 0.14, duration: 0.2, gain: 0.18 },
    ], "sine");
  }

  public playError() {
    this.playNotes([
      { frequency: 185, duration: 0.16, gain: 0.18 },
      { frequency: 155, delay: 0.08, duration: 0.2, gain: 0.17 },
    ], "sawtooth");
  }

  public playCopy() {
    this.playNotes([
      { frequency: 880, duration: 0.045, gain: 0.1 },
      { frequency: 1174.66, delay: 0.035, duration: 0.07, gain: 0.11 },
    ], "sine");
  }

  public playCoin() {
    this.playNotes([
      { frequency: 1046.5, duration: 0.08, gain: 0.16 },
      { frequency: 1318.5, delay: 0.05, duration: 0.09, gain: 0.16 },
      { frequency: 1568, delay: 0.1, duration: 0.12, gain: 0.15 },
    ], "square");
  }

  public playEquip() {
    this.playNotes([
      { frequency: 280, duration: 0.08, gain: 0.14 },
      { frequency: 560, delay: 0.045, duration: 0.12, gain: 0.16 },
      { frequency: 840, delay: 0.09, duration: 0.14, gain: 0.15 },
    ], "triangle");
  }

  public playSkillCast() {
    this.playNotes([
      { frequency: 300, duration: 0.08, gain: 0.17 },
      { frequency: 620, delay: 0.04, duration: 0.13, gain: 0.18 },
      { frequency: 980, delay: 0.085, duration: 0.16, gain: 0.16 },
    ], "sawtooth");
  }

  public playTurnStart() {
    this.playNotes([
      { frequency: 740, duration: 0.07, gain: 0.13 },
      { frequency: 988, delay: 0.065, duration: 0.13, gain: 0.16 },
    ], "triangle");
  }

  /**
   * Soft tactile pop for normal button presses.
   */
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.05);

    gain.gain.setValueAtTime(0.22 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Card select tick sound (sharp card flick).
   */
  public playCardSelect() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(310, t + 0.04);

    gain.gain.setValueAtTime(0.28 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Blunder / Skip Elimination Buzzer (dissonant warning buzz + thud).
   */
  public playBlunder() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [130, 185, 260].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.8, t + 0.45);

      gain.gain.setValueAtTime(0.35 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * Rising pitch chimes for +1, +2, +3 number increments.
   * Scales pitch based on current target / count number (1 to 31).
   */
  public playStep(currentCount: number = 1, amount: 1 | 2 | 3 = 1) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseFreq = 280 + Math.min(currentCount, 31) * 16;
    const steps =
      amount === 3
        ? [baseFreq, baseFreq * 1.2, baseFreq * 1.45]
        : amount === 2
          ? [baseFreq, baseFreq * 1.25]
          : [baseFreq];

    steps.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, startTime + 0.08);

      gain.gain.setValueAtTime(0.25 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.09);
    });
  }

  /**
   * Danger Warning Sound (Count >= 28).
   */
  public playDanger() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.22);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Victory Fanfare.
   */
  public playVictory() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const startTime = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  /**
   * Defeat / Elimination sound.
   */
  public playSpinDefeat() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.6);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  /**
   * Rewind skill sound.
   */
  public playSkillRewind() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.35);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * Turbo leap skill sound.
   */
  public playSkillTurbo() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    [587.33, 880, 1174.66].forEach((f, i) => {
      const startTime = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.24 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  /**
   * Shield skill sound.
   */
  public playSkillShield() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(659.25, t);
    osc.frequency.linearRampToValueAtTime(523.25, t + 0.5);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  /**
   * Barnaby Cow Moo Sound Effect.
   */
  public playMoo() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(210, t + 0.25);
    osc.frequency.linearRampToValueAtTime(120, t + 0.65);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.7);
  }
}

export const soundManager = new SoundManager();
