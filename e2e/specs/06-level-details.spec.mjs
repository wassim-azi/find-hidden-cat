import { closeTutorial, dismissModals, isCatPlaced, placeCat, readBoard, solve } from '../helpers.mjs';

export default async function levelDetailsSpec(browser, { check, BASE }) {
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
      await page.locator('#btn-welcome-play').click();
      await closeTutorial(page);

      const { size, regions, states } = await readBoard(page);
      const solution = solve(size, regions);
      for (const { row, col } of solution) {
        if (!isCatPlaced(states[row][col])) {
          await placeCat(page, row, col);
        }
      }

      await page.locator('#btn-victory-levels').waitFor({ state: 'visible', timeout: 6000 });
      await page.locator('#btn-victory-levels').click();
      await page.waitForSelector('#level-card-1', { timeout: 5000 });
      await page.waitForTimeout(300);
      await dismissModals(page);

      const level1Node = page.locator('#level-card-1');
      await level1Node.click();

      const sheet = page.locator('#level-details-sheet');
      const sheetVisible = await sheet
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      const sheetText = sheetVisible ? await sheet.innerText() : '';
      const hasFormattedTime = /\d+:\d{2}/.test(sheetText);

      check(
        `level-details (${locale}): sheet opens on completed level 1 with formatted best time`,
        sheetVisible && hasFormattedTime,
        hasFormattedTime ? 'time found' : sheetText.slice(0, 120)
      );

      await page.locator('#btn-level-details-play').click();
      const cellVisible = await page
        .locator('#cell-0-0')
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      check(`level-details (${locale}): #btn-level-details-play launches puzzle (#cell-0-0 visible)`, cellVisible);
    } finally {
      await context.close();
    }
  }
}
