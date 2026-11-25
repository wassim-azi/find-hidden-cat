/**
 * Synchronized tutorial voiceover player.
 * 1. First attempts to play ffmpeg-extracted MP3 narration clips from /media/audio/narration-step-{idx}.mp3
 * 2. Falls back cleanly to native Web Speech API (speechSynthesis) when custom MP3s aren't present.
 */

export const TUTORIAL_SCRIPTS: readonly string[] = [
  'Rule one: One cat per color. Every colored region hides exactly one cat. Mark the empty tiles with an X to narrow it down!',
  'Rule two: One cat per row and column. No two cats can share the same horizontal row or vertical column.',
  'Rule three: Cats never touch. Keep all eight surrounding tiles clear around every cat, including diagonals!',
];

class TutorialNarrator {
  private audioEl: HTMLAudioElement | null = null;
  private isSpeaking = false;

  public stop(): void {
    this.isSpeaking = false;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      this.audioEl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public async speakStep(
    stepIndex: number,
    onStateChange?: (speaking: boolean) => void
  ): Promise<void> {
    this.stop();
    const script = TUTORIAL_SCRIPTS[stepIndex];
    if (!script || typeof window === 'undefined') return;

    this.isSpeaking = true;
    onStateChange?.(true);

    // Try synced ffmpeg-extracted narration MP3 first
    const clipUrl = `/media/audio/narration-step-${stepIndex + 1}.mp3`;
    try {
      const res = await fetch(clipUrl, { method: 'HEAD' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('audio')) {
        const audio = new Audio(clipUrl);
        this.audioEl = audio;
        audio.onended = () => {
          this.isSpeaking = false;
          onStateChange?.(false);
        };
        audio.onerror = () => {
          this.speakWithWebSpeech(script, onStateChange);
        };
        await audio.play();
        return;
      }
    } catch {
      // Fall through to Web Speech API
    }

    this.speakWithWebSpeech(script, onStateChange);
  }

  private speakWithWebSpeech(
    text: string,
    onStateChange?: (speaking: boolean) => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking = false;
      onStateChange?.(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.08;
      utterance.lang = 'en-US';
      utterance.onend = () => {
        this.isSpeaking = false;
        onStateChange?.(false);
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        onStateChange?.(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
      onStateChange?.(false);
    }
  }

  public get speaking(): boolean {
    return this.isSpeaking;
  }
}

export const tutorialNarrator = new TutorialNarrator();
