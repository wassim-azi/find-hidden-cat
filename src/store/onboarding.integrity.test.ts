import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './gameStore';

const S = () => useGameStore.getState();

function installStorageWindow(): Map<string, string> {
  const ls = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
      setItem: (k: string, v: string) => void ls.set(k, String(v)),
      removeItem: (k: string) => void ls.delete(k),
    },
    matchMedia: () => ({ matches: false }),
  });
  return ls;
}

describe('onboarding store flow (#32)', () => {
  beforeEach(() => {
    S().resetAllProgress();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('fresh store starts on onboarding and startLevel(1) does not open passive tutorial', () => {
    expect(S().hasSeenTutorial).toBe(false);
    expect(S().screen).toBe('onboarding');

    S().startLevel(1, false);
    expect(S().screen).toBe('game');
    expect(S().isTutorialOpen).toBe(false);
  });

  it('after markTutorialSeen() and a store reload, it starts on welcome', async () => {
    const ls = installStorageWindow();
    vi.resetModules();
    const mod1 = await import('./gameStore');
    expect(mod1.useGameStore.getState().screen).toBe('onboarding');
    expect(mod1.useGameStore.getState().hasSeenTutorial).toBe(false);

    mod1.useGameStore.getState().markTutorialSeen();
    expect(mod1.useGameStore.getState().hasSeenTutorial).toBe(true);
    expect(ls.get('meowdoku_state_v2')).toContain('"hasSeenTutorial":true');

    // Simulate app reload by re-importing the store module against the same localStorage
    vi.resetModules();
    const mod2 = await import('./gameStore');
    expect(mod2.useGameStore.getState().hasSeenTutorial).toBe(true);
    expect(mod2.useGameStore.getState().screen).toBe('welcome');
  });

  it('openOnboarding() stores onboardingReturnScreen and closeOnboarding() returns there', () => {
    S().markTutorialSeen();
    S().goToScreen('map');
    S().setSettingsOpen(true);

    S().openOnboarding();
    expect(S().screen).toBe('onboarding');
    expect(S().onboardingReturnScreen).toBe('map');
    expect(S().isSettingsOpen).toBe(false);

    S().closeOnboarding();
    expect(S().screen).toBe('map');
    expect(S().onboardingReturnScreen).toBeNull();
    expect(S().isSettingsOpen).toBe(true);
  });
});
