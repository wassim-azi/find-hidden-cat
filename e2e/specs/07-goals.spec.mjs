import { closeTutorial, dismissModals, isCatPlaced, placeCat, readBoard, solve } from '../helpers.mjs';

export default async function goalsSpec(browser, { check, BASE }) {
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
      await page.waitForTimeout(300);
      await dismissModals(page);

      const bar = page.locator('#next-goal-card [role="progressbar"]');
      const visible = await bar
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      check(`goals (${locale}): #next-goal-card [role="progressbar"] visible on Map`, visible);
    } finally {
      await context.close();
    }
  }
}
