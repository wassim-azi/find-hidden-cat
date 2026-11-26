/**
 * #21 Puzzle chests: a seeded pending chest opens from the Map, and the odds sheet
 * publishes the exact 70 / 25 / 5 % table.
 */
export default async function chestsSpec(browser, { check, BASE }) {
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
      await page.evaluate(() => {
        localStorage.setItem(
          'meowdoku_state_v2',
          JSON.stringify({
            schemaVersion: 2,
            settings: { reducedMotion: true },
            chests: {
              progress: 1,
              pending: [
                { id: 'chest-e2e-1', earnedAt: Date.now(), bonus: { kind: 'booster', id: 'superHint' } },
              ],
              rngState: 12345,
              opened: 0,
              sinceLastAccessory: 0,
            },
          })
        );
      });
      await page.reload({ waitUntil: 'networkidle' });

      await page.locator('#btn-welcome-levels').click();
      const chestBtn = page.locator('#btn-open-chest');
      const btnVisible = await chestBtn
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      check(`chests (${locale}): Map shows #btn-open-chest for a pending chest`, btnVisible);

      if (btnVisible) {
        await chestBtn.click();
      }
      const reveal = page.locator('#chest-reveal-modal');
      const revealVisible = await reveal
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      const revealText = revealVisible ? await reveal.innerText() : '';
      check(
        `chests (${locale}): reveal shows the stored contents (+30 coins, Super Hint)`,
        revealVisible && revealText.includes('+30') && /super/i.test(revealText),
        revealText.replace(/\s+/g, ' ').slice(0, 120)
      );

      await page.keyboard.press('Escape');
      await reveal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      const btnGone = (await chestBtn.count()) === 0;
      check(`chests (${locale}): chest button disappears once opened`, btnGone);

      await page.locator('#nav-tab-missions').click();
      await page.locator('#missions-tab-events').click();
      await page.locator('#chest-track-card').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#btn-chest-odds').click();
      const sheet = page.locator('#chest-odds-sheet');
      const sheetVisible = await sheet
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      const sheetText = sheetVisible ? await sheet.innerText() : '';
      const hasOdds = /\b70\b/.test(sheetText) && /\b25\b/.test(sheetText) && /\b5\b/.test(sheetText);
      check(`chests (${locale}): #chest-odds-sheet publishes 70 / 25 / 5`, sheetVisible && hasOdds);
    } finally {
      await context.close();
    }
  }
}
