export type HapticPattern = 'select' | 'cat' | 'x' | 'error' | 'hint' | 'victory';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  select: 8,
  cat: [14, 24, 18],
  x: 10,
  error: [25, 35, 25],
  hint: [12, 20, 12],
  victory: [20, 40, 20, 40, 45],
};

export function triggerHaptic(pattern: HapticPattern, enabled: boolean): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Ignore unsupported vibration calls
  }
}
