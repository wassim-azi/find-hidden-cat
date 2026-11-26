import { skipOnboarding } from '../helpers.mjs';

export default async function calendarSpec(browser, { check, BASE }) {
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
      await page.locator('#btn-welcome-daily-gift').click();

      const day1 = page.locator('#calendar-day-1');
      await day1.waitFor({ state: 'visible', timeout: 5000 });
      check(
        `calendar (${locale}): #calendar-day-1 starts with data-state="today"`,
        (await day1.getAttribute('data-state')) === 'today'
      );

      await page.locator('#btn-claim-daily-reward').click();
      await page.waitForTimeout(200);
      check(
        `calendar (${locale}): #calendar-day-1 transitions to data-state="claimed"`,
        (await day1.getAttribute('data-state')) === 'claimed'
      );

      const adCount = await page.locator('#btn-calendar-ad').count();
      check(`calendar (${locale}): #btn-calendar-ad is absent`, adCount === 0);

      await page.locator('#btn-calendar-info').click();
      const infoSheet = page.locator('#calendar-info-sheet');
      await infoSheet.waitFor({ state: 'visible', timeout: 5000 });
      const infoText = (await infoSheet.textContent()) ?? '';
      check(`calendar (${locale}): #calendar-info-sheet contains "10"`, infoText.includes('10'));
    } finally {
      await context.close();
    }
  }
}
