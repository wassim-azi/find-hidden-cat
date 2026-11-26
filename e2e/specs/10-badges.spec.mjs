import { skipOnboarding } from '../helpers.mjs';

export default async function badgesSpec(browser, { check, BASE }) {
  for (const [lang, locale] of [
    ['en', 'en-US'],
    ['fr', 'fr-FR'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
    });
    await context.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
    }, lang);

    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await skipOnboarding(page);
      await page.locator('#btn-welcome-levels').click();
      await page.locator('#nav-tab-missions').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#nav-tab-missions').click();
      await page.locator('#missions-tab-achievements').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#missions-tab-achievements').click();

      const groups = ['progress', 'skill', 'daily', 'world', 'technique'];
      let allPresent = true;
      for (const g of groups) {
        const count = await page.locator(`#ach-group-${g}`).count();
        if (count !== 1) allPresent = false;
      }
      check(
        `badges (${locale}): all 5 achievement group sections rendered`,
        allPresent
      );
    } finally {
      await context.close();
    }
  }
}
