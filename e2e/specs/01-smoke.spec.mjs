import { closeTutorial, isCatPlaced, placeCat, readBoard, solve } from '../helpers.mjs';

export default async function smokeSpec(browser, { check, BASE }) {
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
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

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

      const victoryVisible = await page
        .locator('#btn-victory-next')
        .waitFor({ state: 'visible', timeout: 6000 })
        .then(() => true)
        .catch(() => false);

      check(`smoke (${locale}): level 1 solved & victory screen visible`, victoryVisible);
      check(
        `smoke (${locale}): zero pageerror events`,
        pageErrors.length === 0,
        pageErrors.join(' | ')
      );
      check(
        `smoke (${locale}): zero console.error logs`,
        consoleErrors.length === 0,
        consoleErrors.join(' | ')
      );
    } finally {
      await context.close();
    }
  }
}
