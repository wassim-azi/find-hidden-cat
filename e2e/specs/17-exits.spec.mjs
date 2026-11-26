/**
 * #26 Exit audit + calm victory stopping point:
 * - Bottom nav visible on map, cats, missions, shop, profile
 * - Game shows #btn-pause; Pause -> #btn-pause-levels returns to map
 * - Victory shows full-size #btn-victory-levels (height >= 44px) and never auto-navigates over 8s
 * - ModalSheet closes with Escape (#btn-welcome-daily-gift -> Escape -> calendar closed)
 */
import {
  closeTutorial,
  isCatPlaced,
  placeCat,
  readBoard,
  skipOnboarding,
  solve,
} from '../helpers.mjs';

export default async function exitsSpec(browser, { check, BASE }) {
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
    await skipOnboarding(page);

    // 1. ModalSheet closes on Escape (Daily Calendar)
    await page.locator('#btn-welcome-daily-gift').click();
    const calDay = page.locator('#calendar-day-1');
    await calDay.waitFor({ state: 'visible', timeout: 5000 });
    await page.keyboard.press('Escape');
    const calClosed = await calDay
      .waitFor({ state: 'hidden', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    check('exits: ModalSheet (daily calendar) closes with Escape', calClosed);

    // 2. Hub screens: map, cats, missions, shop, profile all keep bottom nav visible
    await page.locator('#btn-welcome-levels').click();
    const tabs = ['map', 'cats', 'missions', 'shop', 'profile'];
    for (const tab of tabs) {
      await page.locator(`#nav-tab-${tab}`).click();
      await page.waitForTimeout(150);
      let allVisible = true;
      for (const t of tabs) {
        const vis = await page.locator(`#nav-tab-${t}`).isVisible().catch(() => false);
        if (!vis) allVisible = false;
      }
      check(`exits (${tab}): bottom nav #nav-tab-* visible`, allVisible);
    }

    // 3. Game screen: #btn-pause visible; Pause -> #btn-pause-levels returns to map
    await page.locator('#nav-tab-map').click();
    await page.locator('#level-card-1').click();
    await page.locator('#cell-0-0').waitFor({ state: 'visible', timeout: 5000 });
    await closeTutorial(page);

    const pauseVisible = await page
      .locator('#btn-pause')
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    check('exits (game): #btn-pause visible', pauseVisible);

    await page.locator('#btn-pause').click();
    const pauseLevels = page.locator('#btn-pause-levels');
    await pauseLevels.waitFor({ state: 'visible', timeout: 3000 });
    await pauseLevels.click();
    const backOnMap = await page
      .locator('#nav-tab-map')
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    check('exits (game): Pause -> #btn-pause-levels returns to map', backOnMap);

    // 4. Victory screen: full-size #btn-victory-levels (height >= 44px) & no auto-navigate for 8s
    await page.locator('#level-card-1').click();
    await page.locator('#cell-0-0').waitFor({ state: 'visible', timeout: 5000 });
    const { size, regions, states } = await readBoard(page);
    const solution = solve(size, regions);
    for (const { row, col } of solution) {
      if (!isCatPlaced(states[row][col])) {
        await placeCat(page, row, col);
      }
    }

    const victoryMapBtn = page.locator('#btn-victory-levels');
    const victoryVisible = await victoryMapBtn
      .waitFor({ state: 'visible', timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    const box = victoryVisible ? await victoryMapBtn.boundingBox() : null;
    check(
      'exits (victory): #btn-victory-levels visible and height >= 44px',
      victoryVisible && Boolean(box && box.height >= 44),
      box ? `height=${Math.round(box.height)}` : 'missing'
    );

    // Wait 8s and confirm victory screen has not auto-navigated away
    await page.waitForTimeout(8000);
    const stillOnVictory = await victoryMapBtn.isVisible().catch(() => false);
    check('exits (victory): stays on victory after 8s (no auto-advance)', stillOnVictory);
  } finally {
    await context.close();
  }
}
