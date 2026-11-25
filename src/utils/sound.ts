export type SoundEffect =
  | 'select'
  | 'placeCat'
  | 'removeCat'
  | 'markX'
  | 'error'
  | 'hint'
  | 'victory'
  | 'button';

const SAMPLE_URLS: Partial<Record<SoundEffect, string>> = {
  select: '/media/audio/sfx-select.mp3',
  placeCat: '/media/audio/sfx-place-cat.mp3',
  removeCat: '/media/audio/sfx-remove-cat.mp3',
  markX: '/media/audio/sfx-mark-x.mp3',
  error: '/media/audio/sfx-error.mp3',
  hint: '/media/audio/sfx-hint.mp3',
  victory: '/media/audio/sfx-victory.mp3',
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SoundEffect, AudioBuffer>();
  private loadingStarted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.loadingStarted) {
      this.loadingStarted = true;
      void this.preloadSamples();
    }
    return this.ctx;
  }

  private async preloadSamples(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;

    const entries = Object.entries(SAMPLE_URLS) as [SoundEffect, string][];
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arr = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arr);
          this.buffers.set(key, decoded);
        } catch {
          // Gracefully fall back to procedural Web Audio synth
        }
      })
    );
  }

  private playBuffer(effect: SoundEffect, volume = 0.72): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    const buffer = this.buffers.get(effect);
    if (!buffer) return false;

    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    return true;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    delay = 0,
    endFreq?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public play(effect: SoundEffect, enabled: boolean): void {
    if (!enabled) return;
    try {
      // Play ffmpeg-mastered studio audio sample if preloaded
      if (this.playBuffer(effect)) return;

      // Instant procedural fallback before samples finish decoding
      switch (effect) {
        case 'select':
          this.playTone(540, 0.065, 'sine', 0.055, 0, 620);
          break;
        case 'button':
          this.playTone(480, 0.055, 'triangle', 0.05, 0, 560);
          break;
        case 'placeCat':
          this.playTone(523.25, 0.12, 'triangle', 0.08, 0, 659.25);
          this.playTone(783.99, 0.16, 'sine', 0.07, 0.06, 880);
          break;
        case 'removeCat':
          this.playTone(460, 0.1, 'sine', 0.06, 0, 320);
          break;
        case 'markX':
          this.playTone(360, 0.05, 'triangle', 0.045, 0, 300);
          break;
        case 'error':
          this.playTone(220, 0.11, 'sine', 0.075, 0, 185);
          this.playTone(185, 0.13, 'sine', 0.065, 0.09, 155);
          break;
        case 'hint':
          this.playTone(659.25, 0.12, 'sine', 0.065, 0);
          this.playTone(880, 0.15, 'sine', 0.065, 0.08);
          this.playTone(1174.66, 0.22, 'sine', 0.06, 0.16);
          break;
        case 'victory': {
          const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
          notes.forEach((n, idx) => {
            this.playTone(
              n,
              0.26,
              idx === notes.length - 1 ? 'triangle' : 'sine',
              0.08,
              idx * 0.085
            );
          });
          break;
        }
      }
    } catch {
      // Gracefully ignore audio errors
    }
  }

  /**
   * Soft ascending pentatonic marimba tick while drag-painting X marks.
   */
  public playDragX(step: number, enabled: boolean): void {
    if (!enabled) return;
    try {
      const scale = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99];
      const freq = scale[step % scale.length]!;
      this.playTone(freq, 0.055, 'triangle', 0.042, 0, freq * 0.96);
    } catch {
      // Ignore
    }
  }

  /**
   * Gentle cozy music-box loop. Only starts when explicitly enabled by the user.
   */
  public setMusic(enabled: boolean): void {
    if (typeof window === 'undefined') return;

    if (!enabled) {
      if (this.musicTimer !== null) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      return;
    }

    if (this.musicTimer !== null) return;

    const melody = [523.25, 659.25, 587.33, 440.0, 523.25, 783.99, 659.25, 587.33];
    this.musicTimer = window.setInterval(() => {
      const freq = melody[this.musicStep % melody.length]!;
      this.musicStep += 1;
      this.playTone(freq, 0.55, 'sine', 0.018);
    }, 950);
  }
}

export const soundManager = new SoundManager();
