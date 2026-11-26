import { particleBus } from './ParticleCanvas';
import { soundManager, SoundEffect } from '../../utils/sound';
import { triggerHaptic, HapticPattern } from '../../utils/haptics';
import { useGameStore } from '../../store/gameStore';

export type CelebrationLevel = 'small' | 'medium' | 'big';

const DEFAULT_PARTICLE_COLOR = '#F4C553';

const SOUND_BY_LEVEL: Record<CelebrationLevel, SoundEffect> = {
  small: 'button',
  medium: 'hint',
  big: 'victory',
};

const HAPTIC_BY_LEVEL: Record<CelebrationLevel, HapticPattern> = {
  small: 'select',
  medium: 'cat',
  big: 'victory',
};

export function celebrate(
  level: CelebrationLevel,
  opts?: { element?: HTMLElement | null; color?: string }
): void {
  const settings = useGameStore.getState().settings;

  soundManager.play(SOUND_BY_LEVEL[level], settings.soundEnabled);
  triggerHaptic(HAPTIC_BY_LEVEL[level], settings.hapticsEnabled);

  if (settings.reducedMotion) return;

  const color = opts?.color ?? DEFAULT_PARTICLE_COLOR;

  if (level === 'small') {
    if (opts?.element) {
      particleBus.burstElement(opts.element, color, 8);
    }
    return;
  }

  if (level === 'medium') {
    if (opts?.element) {
      particleBus.burstElement(opts.element, color, 16);
    } else {
      const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
      const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
      particleBus.burstAt(cx, cy, color, 16);
    }
    return;
  }

  particleBus.victoryFountain();
}
