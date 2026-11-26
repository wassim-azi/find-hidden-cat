import { beforeEach, describe, expect, it, vi } from 'vitest';

const { playMock, hapticMock, burstAtMock, burstElementMock, victoryFountainMock } = vi.hoisted(
  () => ({
    playMock: vi.fn(),
    hapticMock: vi.fn(),
    burstAtMock: vi.fn(),
    burstElementMock: vi.fn(),
    victoryFountainMock: vi.fn(),
  })
);

vi.mock('../../utils/sound', () => ({
  soundManager: {
    play: playMock,
    playDragX: vi.fn(),
    setMusic: vi.fn(),
    suspendForBackground: vi.fn(),
  },
}));

vi.mock('../../utils/haptics', () => ({
  triggerHaptic: hapticMock,
}));

vi.mock('./ParticleCanvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ParticleCanvas')>();
  return {
    ...actual,
    particleBus: {
      burstAt: burstAtMock,
      burstElement: burstElementMock,
      victoryFountain: victoryFountainMock,
    },
  };
});

import { celebrate } from './Celebration';
import { MAX_ACTIVE_PARTICLES, pushCappedParticle } from './ParticleCanvas';
import { useGameStore } from '../../store/gameStore';

describe('Celebration API (#28)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().resetAllProgress();
  });

  it('small plays button sound + select haptic, and bursts 8 only when an element is given', () => {
    celebrate('small');
    expect(playMock).toHaveBeenCalledWith('button', true);
    expect(hapticMock).toHaveBeenCalledWith('select', true);
    expect(burstElementMock).not.toHaveBeenCalled();
    expect(burstAtMock).not.toHaveBeenCalled();
    expect(victoryFountainMock).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const fakeEl = {} as HTMLElement;
    celebrate('small', { element: fakeEl, color: '#AABBCC' });
    expect(playMock).toHaveBeenCalledWith('button', true);
    expect(hapticMock).toHaveBeenCalledWith('select', true);
    expect(burstElementMock).toHaveBeenCalledWith(fakeEl, '#AABBCC', 8);
  });

  it('medium plays hint sound + cat haptic, and bursts 16 on element or at screen centre', () => {
    celebrate('medium', { color: '#123456' });
    expect(playMock).toHaveBeenCalledWith('hint', true);
    expect(hapticMock).toHaveBeenCalledWith('cat', true);
    expect(burstAtMock).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), '#123456', 16);
    expect(burstElementMock).not.toHaveBeenCalled();
    expect(victoryFountainMock).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const fakeEl = {} as HTMLElement;
    celebrate('medium', { element: fakeEl, color: '#654321' });
    expect(burstElementMock).toHaveBeenCalledWith(fakeEl, '#654321', 16);
    expect(burstAtMock).not.toHaveBeenCalled();
  });

  it('big plays victory sound + victory haptic + victoryFountain', () => {
    celebrate('big');
    expect(playMock).toHaveBeenCalledWith('victory', true);
    expect(hapticMock).toHaveBeenCalledWith('victory', true);
    expect(victoryFountainMock).toHaveBeenCalledTimes(1);
  });

  it('reducedMotion suppresses particles at all levels while sound and haptics still respect their settings', () => {
    useGameStore.getState().updateSetting('reducedMotion', true);
    vi.clearAllMocks();

    const fakeEl = {} as HTMLElement;
    celebrate('small', { element: fakeEl });
    celebrate('medium', { element: fakeEl });
    celebrate('medium');
    celebrate('big');

    expect(burstElementMock).not.toHaveBeenCalled();
    expect(burstAtMock).not.toHaveBeenCalled();
    expect(victoryFountainMock).not.toHaveBeenCalled();
    expect(playMock).toHaveBeenCalledTimes(4);
    expect(hapticMock).toHaveBeenCalledTimes(4);

    useGameStore.getState().updateSetting('soundEnabled', false);
    useGameStore.getState().updateSetting('hapticsEnabled', false);
    vi.clearAllMocks();

    celebrate('big');
    expect(playMock).toHaveBeenCalledWith('victory', false);
    expect(hapticMock).toHaveBeenCalledWith('victory', false);
    expect(victoryFountainMock).not.toHaveBeenCalled();
  });

  it('enforces the 120-particle active cap in ParticleCanvas', () => {
    expect(MAX_ACTIVE_PARTICLES).toBe(120);
    const pool: Parameters<typeof pushCappedParticle>[0] = [];
    const sample: Parameters<typeof pushCappedParticle>[1] = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      color: '#FFFFFF',
      alpha: 1,
      life: 0,
      maxLife: 1,
      rotation: 0,
      vRot: 0,
      gravity: 100,
      drag: 0.95,
      shape: 'star',
    };

    for (let i = 0; i < 150; i++) {
      pushCappedParticle(pool, { ...sample });
    }
    expect(pool.length).toBe(120);
  });
});
