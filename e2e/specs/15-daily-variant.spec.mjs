/**
 * #24 Daily difficulty choice: the first tap opens the variant sheet, Relaxed starts with
 * exactly one locked starter cat, and the choice is locked for the rest of the day.
 */
export default async function dailyVariantSpec(browser, { check, BASE }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
  });
  await context.addInitScript(() => {
    localStorage.setItem('meowdoku_language_v1', 'en');
    localStorage.setItem('i18nextLng', 'en');
  });

  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

    await page.locator('#btn-daily-challenge').click();
    const sheet = page.locator('#daily-variant-sheet');
    const sheetVisible = await sheet
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    const sheetText = sheetVisible ? await sheet.innerText() : '';
    check('daily-variant: #btn-daily-challenge opens #daily-variant-sheet', sheetVisible);
    check(
      'daily-variant: sheet offers 3 options and states the same reward',
      (await page
        .locator('#btn-daily-variant-relaxed, #btn-daily-variant-standard, #btn-daily-variant-tricky')
        .count()) === 3 &&
        sheetText.includes('Same reward for every option')
    );

    await page.locator('#btn-daily-variant-relaxed').click();
    await page.waitForSelector('[data-row][data-col]', { timeout: 6000 });
    const lockedCount = await page
      .locator('[data-row][data-col]')
      .evaluateAll(
        (els) => els.filter((el) => (el.getAttribute('aria-label') || '').includes('Locked starter cat')).length
      );
    check('daily-variant: Relaxed board has exactly 1 locked starter cat', lockedCount === 1, `locked=${lockedCount}`);

    // Back to the Welcome screen (fresh app start), the choice is kept for today
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#btn-daily-challenge').click();
    const boardShown = await page
      .locator('[data-row][data-col]')
      .first()
      .waitFor({ state: 'visible', timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    const sheetShownAgain = await sheet.isVisible().catch(() => false);
    const lockedAgain = boardShown
      ? await page
          .locator('[data-row][data-col]')
          .evaluateAll(
            (els) => els.filter((el) => (el.getAttribute('aria-label') || '').includes('Locked starter cat')).length
          )
      : -1;
    check(
      'daily-variant: second tap starts the locked Relaxed Daily directly (no sheet)',
      boardShown && !sheetShownAgain && lockedAgain === 1,
      `board=${boardShown} sheet=${sheetShownAgain} locked=${lockedAgain}`
    );
  } finally {
    await context.close();
  }
}
