/**
 * #30 Local "My stats" sheet & JSON export E2E:
 * - Solve level 1 -> Profile -> #btn-profile-stats -> #stats-sheet shows "1" for puzzles completed
 * - Click #btn-stats-export -> download filename matches meowdoku-stats-YYYY-MM-DD.json and parses with formatVersion === 1
 * - Runs in EN and FR
 */
import { readFile } from 'node:fs/promises';
import {
  closeTutorial,
  dismissModals,
  isCatPlaced,
  placeCat,
  readBoard,
  skipOnboarding,
  solve,
} from '../helpers.mjs';

export default async function statsSpec(browser, { check, BASE }) {
  for (const [lang, locale] of [
    ['en', 'en-US'],
    ['fr', 'fr-FR'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
      acceptDownloads: true,
    });
    await context.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
    }, lang);

    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await skipOnboarding(page);
      await page.locator('#btn-welcome-play').click();
      await page.locator('#cell-0-0').waitFor({ state: 'visible', timeout: 5000 });
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
      await page.locator('#nav-tab-profile').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500);
      await dismissModals(page);

      await page.locator('#nav-tab-profile').click();
      const statsBtn = page.locator('#btn-profile-stats');
      await statsBtn.waitFor({ state: 'visible', timeout: 5000 });
      await statsBtn.click();

      const sheet = page.locator('#stats-sheet');
      await sheet.waitFor({ state: 'visible', timeout: 5000 });
      const puzzlesText = (await page.locator('#stat-puzzles').innerText()).trim();
      check(
        `stats (${locale}): #stats-sheet shows 1 puzzle completed`,
        /\b1$/.test(puzzlesText),
        puzzlesText
      );

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#btn-stats-export').click(),
      ]);
      const filename = download.suggestedFilename();
      const nameMatches = /^meowdoku-stats-\d{4}-\d{2}-\d{2}\.json$/.test(filename);
      const path = await download.path();
      const parsed = path ? JSON.parse(await readFile(path, 'utf8')) : null;
      check(
        `stats (${locale}): exported filename matches meowdoku-stats-YYYY-MM-DD.json`,
        nameMatches,
        filename
      );
      check(
        `stats (${locale}): exported JSON parses with formatVersion === 1`,
        Boolean(parsed && parsed.formatVersion === 1 && parsed.lifetime?.puzzlesCompleted === 1),
        parsed ? `formatVersion=${parsed.formatVersion}, puzzles=${parsed.lifetime?.puzzlesCompleted}` : 'null'
      );
    } finally {
      await context.close();
    }
  }
}
