import { closeTutorial, heartsCount, isCatPlaced, placeCat, readBoard, solve } from '../helpers.mjs';

export default async function heartsSpec(browser, { check, BASE }) {
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
    await page.locator('#btn-welcome-play').click();
    await closeTutorial(page);

    const initialHearts = await heartsCount(page);
    check('hearts: starts with 3 hearts in Classic mode', initialHearts === 3, `got ${initialHearts}`);

    const { size, regions, states } = await readBoard(page);
    const solution = solve(size, regions);
    const solutionSet = new Set(solution.map((s) => `${s.row},${s.col}`));

    // Find an empty cell that is NOT part of the solution
    let wrongCell = null;
    for (let r = 0; r < size && !wrongCell; r++) {
      for (let c = 0; c < size && !wrongCell; c++) {
        if (solutionSet.has(`${r},${c}`)) continue;
        if (isCatPlaced(states[r][c])) continue;
        if ((states[r][c] || '').toLowerCase() === 'empty') {
          wrongCell = { row: r, col: c };
        }
      }
    }
    // Fallback to any non-solution non-cat cell if all empty cells are solution cells
    if (!wrongCell) {
      for (let r = 0; r < size && !wrongCell; r++) {
        for (let c = 0; c < size && !wrongCell; c++) {
          if (!solutionSet.has(`${r},${c}`) && !isCatPlaced(states[r][c])) {
            wrongCell = { row: r, col: c };
          }
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      await placeCat(page, wrongCell.row, wrongCell.col);
      await page.waitForTimeout(200);
    }

    const outModalVisible = await page
      .locator('#btn-hearts-map')
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);

    check('hearts: 3 wrong placements trigger Out-of-Hearts modal (#btn-hearts-map visible)', outModalVisible);
  } finally {
    await context.close();
  }
}
