/**
 * #28 Celebration performance & reduced-motion E2E:
 * - 4x CPU throttling via CDP
 * - PerformanceObserver('longtask') installed before solving level 1
 * - Assert no long task > 200 ms during the 2 s after victory appears
 * - Repeat with Reduced Motion enabled via Settings and assert ParticleCanvas (<canvas>) is not rendered
 */
import {
  closeTutorial,
  dismissModals,
  isCatPlaced,
  placeCat,
  readBoard,
  skipOnboarding,
  solve,
} from '../helpers.mjs';

export default async function celebrationPerfSpec(browser, { check, BASE }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
  });
  await context.addInitScript(() => {
    localStorage.setItem('meowdoku_language_v1', 'en');
    localStorage.setItem('i18nextLng', 'en');
  });

  const page = await context.newPage();
  const cdp = await page.context().newCDPSession(page);

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await skipOnboarding(page);
    await page.locator('#btn-welcome-play').click();
    await page.locator('#cell-0-0').waitFor({ state: 'visible', timeout: 5000 });
    await closeTutorial(page);

    // Confirm ParticleCanvas is rendered when reducedMotion is false
    const canvasCountNormal = await page.locator('canvas').count();
    check('celebration-perf: ParticleCanvas present before reducedMotion', canvasCountNormal >= 1);

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const { size, regions, states } = await readBoard(page);
    const solution = solve(size, regions);

    await page.evaluate(() => {
      window.__celebrationLongTasks = [];
      if (typeof PerformanceObserver !== 'undefined') {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__celebrationLongTasks.push({
              startTime: entry.startTime,
              duration: entry.duration,
            });
          }
        });
        obs.observe({ entryTypes: ['longtask'] });
        window.__celebrationObs = obs;
      }
    });

    for (const { row, col } of solution) {
      if (!isCatPlaced(states[row][col])) {
        await placeCat(page, row, col);
      }
    }

    await page.locator('#btn-victory-next').waitFor({ state: 'visible', timeout: 10000 });
    const victoryAt = await page.evaluate(() => performance.now());
    await page.waitForTimeout(2000);

    const blockingTasks = await page.evaluate((since) => {
      const list = window.__celebrationLongTasks || [];
      return list.filter((t) => t.startTime >= since && t.duration > 200);
    }, victoryAt);

    check(
      'celebration-perf (4x CPU): no longtask > 200ms in 2s after victory',
      blockingTasks.length === 0,
      blockingTasks.length > 0 ? JSON.stringify(blockingTasks) : 'ok'
    );

    // Go to Map, dismiss any unlock modal, enable Reduced Motion in Settings, and verify no ParticleCanvas renders
    await page.locator('#btn-victory-levels').click();
    await page.locator('#btn-hud-settings').waitFor({ state: 'visible', timeout: 6000 });
    await page.waitForTimeout(500);
    await dismissModals(page);
    await page.locator('#btn-hud-settings').click();

    const reducedToggle = page.locator('#toggle-reduced-motion');
    await reducedToggle.waitFor({ state: 'visible', timeout: 5000 });
    await reducedToggle.click();
    await page.waitForTimeout(150);
    const checked = await reducedToggle.getAttribute('aria-checked');
    check('celebration-perf: #toggle-reduced-motion enabled', checked === 'true');

    await page.keyboard.press('Escape');
    await reducedToggle.waitFor({ state: 'hidden', timeout: 4000 });

    const canvasCountReducedMap = await page.locator('canvas').count();
    check(
      'celebration-perf: ParticleCanvas not rendered on Map when reducedMotion enabled',
      canvasCountReducedMap === 0,
      `canvasCount=${canvasCountReducedMap}`
    );

    // Solve Level 2 with reducedMotion enabled and confirm ParticleCanvas never renders
    await page.locator('#level-card-2').click();
    await page.locator('#cell-0-0').waitFor({ state: 'visible', timeout: 6000 });

    const board2 = await readBoard(page);
    const sol2 = solve(board2.size, board2.regions);
    for (const { row, col } of sol2) {
      if (!isCatPlaced(board2.states[row][col])) {
        await placeCat(page, row, col);
      }
    }

    await page.locator('#btn-victory-next').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);

    const canvasCountReducedVictory = await page.locator('canvas').count();
    check(
      'celebration-perf: ParticleCanvas not rendered during victory when reducedMotion enabled',
      canvasCountReducedVictory === 0,
      `canvasCount=${canvasCountReducedVictory}`
    );
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    await context.close();
  }
}
