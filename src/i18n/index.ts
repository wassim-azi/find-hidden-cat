import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

export type AppLanguage = 'en' | 'fr';

const LANG_STORAGE_KEY = 'meowdoku_lang_v1';

export function detectInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';

  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') {
      return saved;
    }
  } catch {
    // Ignore storage restriction
  }

  // Detect browser preferred language(s)
  const navLangs: readonly string[] =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : [];

  for (const lang of navLangs) {
    if (lang.toLowerCase().startsWith('fr')) {
      return 'fr';
    }
    if (lang.toLowerCase().startsWith('en')) {
      return 'en';
    }
  }

  return 'en';
}

function syncDocumentMetadata(lang: AppLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang === 'fr' ? 'fr-FR' : 'en';
  document.title = i18n.t('meta.title');
}

const initialLanguage = detectInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

syncDocumentMetadata(initialLanguage);

export function getCurrentLanguage(): AppLanguage {
  return i18n.language?.startsWith('fr') ? 'fr' : 'en';
}

export function changeAppLanguage(lang: AppLanguage): void {
  void i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage error
    }
  }
  syncDocumentMetadata(lang);
}

/**
 * Formats an ISO YYYY-MM-DD date string using locale-appropriate conventions
 * (e.g. "25 nov." in fr-FR vs "Nov 25" in en).
 */
export function formatLocalizedDate(dateKey: string, lang = getCurrentLanguage()): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(Date.UTC(y, m - 1, d));
  try {
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return dateKey;
  }
}

export function formatLocalizedNumber(n: number, lang = getCurrentLanguage()): string {
  try {
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US').format(n);
  } catch {
    return String(n);
  }
}

export default i18n;
