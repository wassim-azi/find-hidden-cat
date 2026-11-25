import i18n, { AppLanguage, getCurrentLanguage } from '../i18n';

/**
 * Bilingual synchronized tutorial voiceover & live-caption engine (en / fr-FR).
 * 1. Checks locale-scoped pre-recorded MP3: /media/audio/{lang}/narration-step-{step}.mp3
 *    (strictly scoped per language — never silently falls back to English audio when French is active).
 * 2. Falls back to native Web Speech API selecting a matching fr-FR or en-US voice.
 */

export function getTutorialVoiceScript(stepIndex: number): string {
  const stepNum = stepIndex + 1;
  return i18n.t(`tutorial.steps.${stepNum}.voice`);
}

export function getLocalizedNarrationClipUrl(
  stepIndex: number,
  lang: AppLanguage = getCurrentLanguage()
): string {
  return `/media/audio/${lang}/narration-step-${stepIndex + 1}.mp3`;
}

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
    const lang = getCurrentLanguage();
    const script = getTutorialVoiceScript(stepIndex);
    if (!script || typeof window === 'undefined') return;

    this.isSpeaking = true;
    onStateChange?.(true);

    // Try locale-matched ffmpeg-extracted narration MP3 first
    const clipUrl = getLocalizedNarrationClipUrl(stepIndex, lang);
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
          this.speakWithWebSpeech(script, lang, onStateChange);
        };
        await audio.play();
        return;
      }
    } catch {
      // Fall through to localized Web Speech API
    }

    this.speakWithWebSpeech(script, lang, onStateChange);
  }

  private pickVoice(lang: AppLanguage): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    if (lang === 'fr') {
      return (
        voices.find((v) => v.lang.toLowerCase() === 'fr-fr') ??
        voices.find((v) => v.lang.toLowerCase().startsWith('fr')) ??
        null
      );
    }

    return (
      voices.find((v) => v.lang.toLowerCase() === 'en-us') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
      null
    );
  }

  private speakWithWebSpeech(
    text: string,
    lang: AppLanguage,
    onStateChange?: (speaking: boolean) => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking = false;
      onStateChange?.(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
      utterance.rate = lang === 'fr' ? 1.0 : 1.02;
      utterance.pitch = 1.05;

      const voice = this.pickVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

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
