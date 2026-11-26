export default async function seasonsSpec(browser, { check, BASE }) {
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
      await page.locator('#btn-welcome-levels').click();
      await page.locator('#nav-tab-cats').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#nav-tab-cats').click();

      const section = page.locator('#seasonal-section');
      const visible = await section
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      check(`seasons (${locale}): #seasonal-section visible`, visible);

      const itemCount = await section.locator('[data-seasonal-item]').count();
      check(`seasons (${locale}): shows 2 seasonal items`, itemCount === 2, `count=${itemCount}`);

      const sectionText = (await section.textContent()) ?? '';
      // Must show an end date (has a 4-digit year or month+day digits) and NO mm:ss countdown
      const hasDateDigit = /\d/.test(sectionText);
      const hasCountdown = /\b\d{1,2}:\d{2}\b/.test(sectionText);
      check(`seasons (${locale}): end date shown without countdown timer`, hasDateDigit && !hasCountdown);
    } finally {
      await context.close();
    }
  }
}
