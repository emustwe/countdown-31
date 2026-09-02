/**
 * Centralized Sound Manager for Count Down 31
 * Provides zero-latency synthesized Web Audio sound effects with optional Howler static asset playback.
 */
import { Howl } from "howler";

export type BgmTrackType =
  | "arcade"
  | "vegas"
  | "synthwave"
  | "tropical"
  | "vip"
  | "chiptune"
  | "lofi";

export const BGM_AUDIO_MAP: Record<BgmTrackType, string> = {
  arcade: "/assets/sounds/arcade-party-bgm.wav",
  vegas: "/assets/sounds/vegas-funk-bgm.wav",
  synthwave: "/assets/sounds/cyber-synthwave-bgm.wav",
  tropical: "/assets/sounds/tropical-party-bgm.wav",
  vip: "/assets/sounds/vip-club-bgm.wav",
  chiptune: "/assets/sounds/retro-chiptune-bgm.wav",
  lofi: "/assets/sounds/lofi-chillhop-bgm.wav",
};

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

  /** Play a static audio file asset using Howler with caching */
  public playAudioFile(src: string, volumeScale = 1.0) {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      let sound = this.soundCache.get(src);
      if (!sound) {
        sound = new Howl({
          src: [src],
          volume: this.volume * volumeScale,
          preload: true,
        });
        this.soundCache.set(src, sound);
      }
      sound.volume(this.volume * volumeScale);
      sound.play();
    } catch {
      // Fallback
    }
  }

  /**
   * Play the litupsubway-ui-close-sfx audio for each card spinning / rolling over
   */
  public playCardSpinWhoosh() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/litupsubway-ui-close-sfx-513359.mp3", 0.95);
  }

  public playOpen() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/litupsubway-ui-open-sfx-513358.mp3", 0.85);
  }

  public playClose() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/litupsubway-ui-close-sfx-513359.mp3", 0.85);
  }

  public playToggle(on: boolean) {
    this.playNotes(
      on
        ? [{ frequency: 480, duration: 0.055, gain: 0.12 }, { frequency: 760, delay: 0.04, duration: 0.08, gain: 0.13 }]
        : [{ frequency: 610, duration: 0.055, gain: 0.11 }, { frequency: 360, delay: 0.04, duration: 0.08, gain: 0.11 }],
      "square",
    );
  }

  public playSuccess() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/u_o8xh7gwsrj-flower_pickup_positive-476369.mp3", 0.9);
  }

  public playError() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/soundshelfstudio-ui-error-pop-515668.mp3", 0.85);
  }

  public playCopy() {
    this.playNotes([
      { frequency: 880, duration: 0.045, gain: 0.1 },
      { frequency: 1174.66, delay: 0.035, duration: 0.07, gain: 0.11 },
    ], "sine");
  }

  public playCoin() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/u_o8xh7gwsrj-flower_pickup_positive-476369.mp3", 0.85);
  }

  public playEquip() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/litupsubway-ui-equip-sfx-513361.mp3", 0.9);
  }

  public playSkillCast() {
    this.playNotes([
      { frequency: 300, duration: 0.08, gain: 0.17 },
      { frequency: 620, delay: 0.04, duration: 0.13, gain: 0.18 },
      { frequency: 980, delay: 0.085, duration: 0.16, gain: 0.16 },
    ], "sawtooth");
  }

  public playTurnStart() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/49447089-game-start-317318.mp3", 0.8);
  }

  private bgmSound: Howl | null = null;
  private bgmPlaying: boolean = false;
  private bgmVolume: number = 0.85;
  private bgmDucked: boolean = false;
  private bgmTrack: BgmTrackType = "arcade";

  /**
   * Duck/silence BGM completely (used when mascot animation is shown on screen)
   */
  public duckBgm(duck: boolean) {
    this.bgmDucked = duck;
    if (this.bgmSound) {
      if (duck) {
        this.bgmSound.volume(0);
        try {
          this.bgmSound.pause();
        } catch {}
      } else {
        this.bgmSound.volume(this.bgmVolume);
        if (this.bgmPlaying) {
          try {
            this.bgmSound.play();
          } catch {}
        }
      }
    }
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmSound && !this.bgmDucked) {
      this.bgmSound.volume(this.bgmVolume);
    }
  }

  public setBgmTrack(track: BgmTrackType) {
    if (this.bgmTrack === track && this.bgmPlaying) return;
    this.bgmTrack = track;
    if (this.bgmPlaying) {
      this.startBgm(track);
    }
  }

  public getBgmTrack(): BgmTrackType {
    return this.bgmTrack;
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public isBgmPlaying(): boolean {
    return this.bgmPlaying;
  }

  public toggleBgm(track?: BgmTrackType): boolean {
    if (this.bgmPlaying) {
      this.stopBgm();
    } else {
      this.startBgm(track);
    }
    return this.bgmPlaying;
  }

  /**
   * Starts BGM using strictly ONE selected studio track:
   * - "arcade": 136 BPM Mastered Party Beat
   * - "vegas": 128 BPM Vegas Casino Funk
   * - "synthwave": 125 BPM Cyber Synthwave 80s
   * - "tropical": 120 BPM Tropical Beach Party
   * - "vip": 130 BPM High-Stakes VIP Club
   * - "chiptune": 144 BPM 8-Bit Retro Chiptune
   * - "lofi": 90 BPM Lofi Chill Hop Pasture
   */
  public startBgm(track?: BgmTrackType) {
    if (typeof window === "undefined" || this.isMuted) return;
    const selectedTrack = track ?? this.bgmTrack;
    this.bgmTrack = selectedTrack;

    // Hard stop and unload any current audio before starting the new track
    this.stopBgm();
    this.bgmPlaying = true;

    const audioFile = BGM_AUDIO_MAP[selectedTrack] || BGM_AUDIO_MAP.arcade;

    try {
      this.bgmSound = new Howl({
        src: [audioFile],
        loop: true,
        volume: this.bgmDucked ? 0 : this.bgmVolume,
        autoplay: false,
        preload: true,
      });
      if (!this.bgmDucked) {
        this.bgmSound.volume(this.bgmVolume);
        this.bgmSound.play();
      }
    } catch {
      // fallback
    }
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmSound) {
      try {
        this.bgmSound.stop();
        this.bgmSound.unload();
      } catch {}
      this.bgmSound = null;
    }
  }

  /**
   * Crisp Vegas Chip Clink & Arcade Crystal Pick Blip
   */
  public playCardSelect() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // High energy Vegas chip click + arcade arpeggio ping (C6 -> E6 -> G6)
    const t = ctx.currentTime;
    [1046.5, 1318.5, 1568.0].forEach((freq, idx) => {
      const start = t + idx * 0.025;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, start + 0.06);

      gain.gain.setValueAtTime(0.24 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.06);
    });
  }

  /**
   * Vegas Slot Machine Payline Lock & Bell Chime
   */
  public playConfirm() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Rich Vegas slot machine double chime with resonant bell harmonics
    const notes = [
      { freq: 523.25, delay: 0.0, dur: 0.14, gain: 0.28 },   // C5 Bell
      { freq: 659.25, delay: 0.06, dur: 0.16, gain: 0.32 },  // E5 Bell
      { freq: 783.99, delay: 0.12, dur: 0.18, gain: 0.35 },  // G5 Bell
      { freq: 1046.5, delay: 0.18, dur: 0.28, gain: 0.40 },  // C6 Jackpot Bell
    ];

    notes.forEach((n) => {
      const start = ctx.currentTime + n.delay;
      const osc = ctx.createOscillator();
      const harmonicOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      harmonicOsc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, start);
      harmonicOsc.frequency.setValueAtTime(n.freq * 2, start);

      gain.gain.setValueAtTime(n.gain * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

      osc.connect(gain);
      harmonicOsc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      harmonicOsc.start(start);
      osc.stop(start + n.dur);
      harmonicOsc.stop(start + n.dur);
    });
  }

  /**
   * Full Vegas Casino Jackpot Coin Cascade & Celebration Fanfare
   */
  public playVictory() {
    if (this.isMuted) return;
    this.playAudioFile("/assets/sounds/u_o8xh7gwsrj-flower_pickup_positive-476369.mp3", 0.95);

    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Cascading golden coin payout flurry
    for (let i = 0; i < 10; i++) {
      const coinTime = ctx.currentTime + 0.15 + i * 0.07;
      const coinFreq = 1200 + (i % 4) * 240;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(coinFreq, coinTime);
      osc.frequency.exponentialRampToValueAtTime(coinFreq * 1.4, coinTime + 0.05);

      gain.gain.setValueAtTime(0.18 * this.volume, coinTime);
      gain.gain.exponentialRampToValueAtTime(0.001, coinTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(coinTime);
      osc.stop(coinTime + 0.06);
    }
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
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

    gain.gain.setValueAtTime(0.22 * this.volume, t);
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
    this.playAudioFile("/assets/sounds/soundshelfstudio-ui-error-pop-515668.mp3", 0.9);
  }

  /**
   * Rising pitch chimes for +1, +2, +3 number increments.
   * Scales pitch based on current target / count number (1 to 31).
   */
  public playStep(currentCount: number = 1, amount: 1 | 2 | 3 = 1) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseFreq = 340 + Math.min(currentCount, 31) * 18;
    const steps =
      amount === 3
        ? [baseFreq, baseFreq * 1.25, baseFreq * 1.5]
        : amount === 2
          ? [baseFreq, baseFreq * 1.25]
          : [baseFreq];

    steps.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.1, startTime + 0.07);

      gain.gain.setValueAtTime(0.26 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.08);
    });
  }

  /**
   * Danger Warning Sound (Count >= 28) - Vegas Tension Heartbeat Pulse
   */
  public playDanger() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [880, 440].forEach((f, i) => {
      const start = t + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, start);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, start + 0.15);

      gain.gain.setValueAtTime(0.28 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.15);
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
