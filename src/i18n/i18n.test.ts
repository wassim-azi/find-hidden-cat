import { describe, expect, it } from 'vitest';
import i18n, {
  changeAppLanguage,
  formatLocalizedDate,
  getCurrentLanguage,
} from './index';
import en from './locales/en.json';
import fr from './locales/fr.json';
import { getLocalizedNarrationClipUrl, getTutorialVoiceScript } from '../utils/narration';
import { rewardedAdService } from '../services/rewardedAds';
import { getLevelPuzzle } from '../game/levels';
import { createInitialBoard, setCellValue } from '../game/puzzleEngine';
import { validateBoard } from '../game/validation';
import { getNextHint } from '../game/hintEngine';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('French (fr-FR) & English (en) Localization Suite', () => {
  it('has 100% matching translation keys between en.json and fr.json with no empty values', () => {
    const enKeys = flattenKeys(en as unknown as Record<string, unknown>);
    const frKeys = flattenKeys(fr as unknown as Record<string, unknown>);

    expect(frKeys).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(180);

    for (const key of enKeys) {
      const enVal = i18n.getResource('en', 'translation', key);
      const frVal = i18n.getResource('fr', 'translation', key);
      expect(typeof enVal, `Missing EN key: ${key}`).toBe('string');
      expect(typeof frVal, `Missing FR key: ${key}`).toBe('string');
      expect((enVal as string).trim().length, `Empty EN key: ${key}`).toBeGreaterThan(0);
      expect((frVal as string).trim().length, `Empty FR key: ${key}`).toBeGreaterThan(0);
    }
  });

  it('switches immediately between English and French with correct pluralization & formatting', async () => {
    changeAppLanguage('fr');
    expect(getCurrentLanguage()).toBe('fr');
    expect(i18n.t('welcome.tagline')).toBe('Réfléchis bien. Trouve les chats.');
    expect(i18n.t('common.fishCoins', { count: 1 })).toBe('1 pièce poisson');
    expect(i18n.t('common.fishCoins', { count: 50 })).toBe('50 pièces poisson');
    expect(
      i18n.t('map.nextWorldNudge', { count: 2, world: 'Jardin Sucré' })
    ).toBe('Plus que 2 niveaux avant Jardin Sucré !');
    expect(formatLocalizedDate('2026-11-25', 'fr').toLowerCase()).toContain('nov');

    // Localized tutorial voice & clip URL
    expect(getLocalizedNarrationClipUrl(0, 'fr')).toBe('/media/audio/fr/narration-step-1.mp3');
    expect(getTutorialVoiceScript(0)).toContain('Règle numéro un');

    // Localized rewarded ad NOT_IMPLEMENTED message
    const adRes = await rewardedAdService.requestReward('free_hint');
    expect(adRes.status).toBe('NOT_IMPLEMENTED');
    expect(adRes.granted).toBe(false);
    expect(adRes.message).toContain('publicités');

    // Localized live validation & hint messages in French
    const puzzle = getLevelPuzzle(4);
    let board = createInitialBoard(puzzle);
    board = setCellValue(board, { row: 0, col: 0 }, 'cat');
    board = setCellValue(board, { row: 0, col: 3 }, 'cat');
    const val = validateBoard(puzzle, board);
    expect(val.primaryMessage).toContain('ligne 1');

    const hint = getNextHint(puzzle, board);
    expect(hint?.title).toBe("Corrige d'abord ce conflit");

    // Switch cleanly back to English
    changeAppLanguage('en');
    expect(getCurrentLanguage()).toBe('en');
    expect(i18n.t('welcome.tagline')).toBe('Think smart. Find the cats.');
    expect(getLocalizedNarrationClipUrl(0, 'en')).toBe('/media/audio/en/narration-step-1.mp3');
  });
});
