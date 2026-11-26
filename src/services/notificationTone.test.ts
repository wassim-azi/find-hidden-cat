import { describe, expect, it } from 'vitest';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';

const FORBIDDEN_EN = [
  'miss you',
  'missing you',
  'sad',
  'lonely',
  'last chance',
  "before it's gone",
  "don't lose",
  "you'll lose",
  'hurry',
  'expire',
  'abandon',
  'disappoint',
  'forgot',
];

const FORBIDDEN_FR = [
  'tu nous manques',
  'triste',
  'seul',
  'dernière chance',
  'trop tard',
  'dépêche',
  'ne perds pas',
  'tu vas perdre',
  'expire',
  'abandon',
  'déçu',
  'oublié',
];

describe('notificationTone (#27)', () => {
  it('EN notifications.msg copy contains zero guilt or urgency phrases', () => {
    const msgs = en.notifications.msg;
    for (const [key, value] of Object.entries(msgs)) {
      const lower = value.toLowerCase();
      for (const bad of FORBIDDEN_EN) {
        expect(lower, `EN notifications.msg.${key} matched "${bad}"`).not.toContain(bad);
      }
    }
  });

  it('FR notifications.msg copy contains zero guilt or urgency phrases', () => {
    const msgs = fr.notifications.msg;
    for (const [key, value] of Object.entries(msgs)) {
      const lower = value.toLowerCase();
      for (const bad of FORBIDDEN_FR) {
        expect(lower, `FR notifications.msg.${key} matched "${bad}"`).not.toContain(bad);
      }
    }
  });
});
