async function dragAcrossCells(page, fromSel, toSel) {
  const fromEl = page.locator(fromSel);
  const toEl = page.locator(toSel);
  await fromEl.waitFor({ state: 'visible', timeout: 4000 });
  const a = await fromEl.boundingBox();
  const b = await toEl.boundingBox();
  if (!a || !b) throw new Error(`Missing boundingBox for drag ${fromSel} -> ${toSel}`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

async function completeGuidedSteps(page) {
  // Step 1: place cat at (0,1)
  await page.locator('#onboarding-cell-0-1').click();
  await page.locator('#btn-onboarding-place').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('#btn-onboarding-place').click();

  // Step 2: ack Rule 1
  await page.locator('#btn-onboarding-next').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('#btn-onboarding-next').click();

  // Step 3: turn on Notes X
  await page.locator('#btn-onboarding-tool').click();

  // Step 4: tap row 0 + col 1 cells
  for (const [r, c] of [
    [0, 0],
    [0, 2],
    [0, 3],
    [1, 1],
    [2, 1],
    [3, 1],
  ]) {
    await page.locator(`#onboarding-cell-${r}-${c}`).click();
  }

  // Step 5: drag across row 1 to mark (1,0) and (1,2)
  await dragAcrossCells(page, '#onboarding-cell-1-0', '#onboarding-cell-1-2');

  // Step 6: place cat at (3,2)
  await page.locator('#onboarding-cell-3-2').click();
  await page.locator('#btn-onboarding-place').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('#btn-onboarding-place').click();

  // Step 7: drag across row 3 to mark (3,0) and (3,3)
  await dragAcrossCells(page, '#onboarding-cell-3-0', '#onboarding-cell-3-3');

  // Step 8: place cat at (2,0)
  await page.locator('#onboarding-cell-2-0').click();
  await page.locator('#btn-onboarding-place').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('#btn-onboarding-place').click();

  // Step 9: free play, place last cat at (1,3)
  await page.locator('#onboarding-cell-1-3').click();
  await page.locator('#btn-onboarding-place').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('#btn-onboarding-place').click();
}

export default async function onboardingSpec(browser, { check, BASE }) {
  for (const [lang, locale, dblText] of [
    ['en', 'en-US', 'Double-tap'],
    ['fr', 'fr-FR', 'Touche-la deux fois'],
  ]) {
    // 1. Complete all 10 steps on a fresh profile -> Level 1 -> reload stays off onboarding
    const ctx1 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
    });
    await ctx1.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
    }, lang);
    const page1 = await ctx1.newPage();
    try {
      await page1.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      const instrVisible = await page1
        .locator('#onboarding-instruction')
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      check(`onboarding (${locale}): fresh profile opens on onboarding`, instrVisible);

      await completeGuidedSteps(page1);

      const startBtn = page1.locator('#btn-onboarding-start');
      const startVisible = await startBtn
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      check(`onboarding (${locale}): #btn-onboarding-start visible at step 10`, startVisible);

      await startBtn.click();
      const lvl1Visible = await page1
        .locator('#cell-0-0')
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      check(`onboarding (${locale}): Start game opens Level 1 (#cell-0-0 visible)`, lvl1Visible);

      await page1.reload({ waitUntil: 'networkidle' });
      const welcomePlay = await page1
        .locator('#btn-welcome-play')
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      const onboardAfter = await page1.locator('#onboarding-instruction').isVisible().catch(() => false);
      check(`onboarding (${locale}): reload after completion skips onboarding`, welcomePlay && !onboardAfter);
    } finally {
      await ctx1.close();
    }

    // 2. Skip on fresh profile -> Welcome -> reload skips onboarding; + replay from Settings
    const ctx2 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
    });
    await ctx2.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
    }, lang);
    const page2 = await ctx2.newPage();
    try {
      await page2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page2.locator('#btn-onboarding-skip').waitFor({ state: 'visible', timeout: 4000 });
      await page2.locator('#btn-onboarding-skip').click();

      const welcomeVisible = await page2
        .locator('#btn-welcome-play')
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      check(`onboarding (${locale}): Skip goes to Welcome`, welcomeVisible);

      await page2.reload({ waitUntil: 'networkidle' });
      const welcomeReload = await page2
        .locator('#btn-welcome-play')
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      check(`onboarding (${locale}): reload after Skip stays on Welcome`, welcomeReload);

      // Replay from Settings -> Done -> back on Settings
      await page2.locator('#btn-welcome-settings').click();
      await page2.locator('#btn-settings-replay-tutorial').waitFor({ state: 'visible', timeout: 4000 });
      await page2.locator('#btn-settings-replay-tutorial').click();

      await page2.locator('#onboarding-instruction').waitFor({ state: 'visible', timeout: 4000 });
      await completeGuidedSteps(page2);

      const doneBtn = page2.locator('#btn-onboarding-done');
      await doneBtn.waitFor({ state: 'visible', timeout: 4000 });
      await doneBtn.click();

      const backOnSettings = await page2
        .locator('#btn-settings-replay-tutorial')
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      check(`onboarding (${locale}): Settings replay Done returns to Settings`, backOnSettings);
    } finally {
      await ctx2.close();
    }

    // 3. controlMode: 'double-tap' copy & dblclick placement
    const ctx3 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
    });
    await ctx3.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
      localStorage.setItem(
        'meowdoku_state_v2',
        JSON.stringify({
          schemaVersion: 2,
          hasSeenTutorial: false,
          settings: { controlMode: 'double-tap', reducedMotion: true },
        })
      );
    }, lang);
    const page3 = await ctx3.newPage();
    try {
      await page3.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page3.locator('#onboarding-instruction').waitFor({ state: 'visible', timeout: 4000 });
      const step1Text = await page3.locator('#onboarding-instruction').innerText();
      check(
        `onboarding (${locale}): double-tap step 1 copy matches mode`,
        step1Text.includes(dblText),
        step1Text
      );

      await page3.locator('#onboarding-cell-0-1').dblclick();
      const nextVisible = await page3
        .locator('#btn-onboarding-next')
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      check(`onboarding (${locale}): dblclick places cat and advances to step 2`, nextVisible);
    } finally {
      await ctx3.close();
    }
  }

  // 4. 320x568 viewport with zero vertical scroll
  const ctxSmall = await browser.newContext({
    viewport: { width: 320, height: 568 },
    locale: 'en-US',
  });
  await ctxSmall.addInitScript(() => {
    localStorage.setItem('meowdoku_language_v1', 'en');
    localStorage.setItem('i18nextLng', 'en');
  });
  const pageSmall = await ctxSmall.newPage();
  try {
    await pageSmall.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await pageSmall.locator('#onboarding-instruction').waitFor({ state: 'visible', timeout: 4000 });
    await pageSmall.locator('#btn-onboarding-tool').waitFor({ state: 'visible', timeout: 4000 });

    const fit = await pageSmall.evaluate(() => {
      const rootScrollH = document.documentElement.scrollHeight;
      const rootClientH = document.documentElement.clientHeight;
      const toolRect = document.querySelector('#btn-onboarding-tool')?.getBoundingClientRect();
      const gridRect = document.querySelector('[role="grid"]')?.getBoundingClientRect();
      return {
        rootScrollH,
        rootClientH,
        toolBottom: toolRect?.bottom ?? 9999,
        gridTop: gridRect?.top ?? -1,
        gridBottom: gridRect?.bottom ?? 9999,
      };
    });
    check(
      'onboarding (320x568): fits inside viewport with no vertical scroll',
      fit.rootScrollH <= fit.rootClientH && fit.toolBottom <= 568 && fit.gridTop >= 0 && fit.gridBottom <= 568,
      JSON.stringify(fit)
    );
  } finally {
    await ctxSmall.close();
  }
}
