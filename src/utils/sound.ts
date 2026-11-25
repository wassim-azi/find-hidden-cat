export type SoundEffect =
  | 'select'
  | 'placeCat'
  | 'removeCat'
  | 'markX'
  | 'error'
  | 'hint'
  | 'victory'
  | 'button';

class SoundManager {
  private ctx: AudioContext | null = null;
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
    return this.ctx;
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
      switch (effect) {
        case 'select':
          this.playTone(540, 0.065, 'sine', 0.055, 0, 620);
          break;
        case 'button':
          this.playTone(480, 0.055, 'triangle', 0.05, 0, 560);
          break;
        case 'placeCat':
          // Cheerful soft marimba + playful kitten chirp glide
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
          // Gentle, friendly low double boop
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
            this.playTone(n, 0.26, idx === notes.length - 1 ? 'triangle' : 'sine', 0.08, idx * 0.085);
          });
          break;
        }
      }
    } catch {
      // Gracefully ignore audio errors on restricted devices
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

    // Gentle pentatonic lullaby notes (C major pentatonic)
    const melody = [523.25, 659.25, 587.33, 440.0, 523.25, 783.99, 659.25, 587.33];
    this.musicTimer = window.setInterval(() => {
      const freq = melody[this.musicStep % melody.length]!;
      this.musicStep += 1;
      this.playTone(freq, 0.55, 'sine', 0.018);
    }, 950);
  }
}

export const soundManager = new SoundManager();
