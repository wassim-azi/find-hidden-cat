import { skipOnboarding } from '../helpers.mjs';

export default async function missionsSpec(browser, { check, BASE }) {
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
      // Navigate to Map (which shows BottomNav) then tap Missions tab
      await page.locator('#btn-welcome-levels').click();
      await page.locator('#nav-tab-missions').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#nav-tab-missions').click();

      const dailyVisible = await page
        .locator('#missions-daily')
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      const weeklyVisible = await page
        .locator('#missions-weekly')
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      const milestoneVisible = await page
        .locator('#missions-milestone')
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      check(`missions (${locale}): #missions-daily visible`, dailyVisible);
      check(`missions (${locale}): #missions-weekly visible`, weeklyVisible);
      check(`missions (${locale}): #missions-milestone visible`, milestoneVisible);
    } finally {
      await context.close();
    }
  }
}
