export default async function catProfileSpec(browser, { check, BASE }) {
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

      // Unlocked cat profile + favourite toggle
      await page.locator('#cat-card-mochi').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#cat-card-mochi').click();

      const sheet = page.locator('#cat-profile-sheet');
      const sheetVisible = await sheet
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      check(`cat-profile (${locale}): #cat-profile-sheet opens for Mochi`, sheetVisible);

      const favBtn = page.locator('#btn-cat-profile-favourite');
      await favBtn.click();
      await page.waitForTimeout(150);
      check(
        `cat-profile (${locale}): #btn-cat-profile-favourite has aria-pressed="true" after click`,
        (await favBtn.getAttribute('aria-pressed')) === 'true'
      );

      // Close sheet via Escape
      await page.keyboard.press('Escape');
      await sheet.waitFor({ state: 'hidden', timeout: 4000 });

      // Locked cat profile opens with progressbar
      await page.locator('#cat-card-marmalade').click();
      const progressBar = page.locator('#cat-profile-sheet [role="progressbar"]');
      const barVisible = await progressBar
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      check(
        `cat-profile (${locale}): locked cat opens #cat-profile-sheet with [role="progressbar"]`,
        barVisible
      );
    } finally {
      await context.close();
    }
  }
}
