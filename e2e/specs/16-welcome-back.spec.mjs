export default async function welcomeBackSpec(browser, { check, BASE }) {
  for (const [lang, locale, expectedTitle] of [
    ['en', 'en-US', 'Welcome back!'],
    ['fr', 'fr-FR', 'Bon retour !'],
  ]) {
    // 1. 7h gap with hasSeenTutorial: true -> sheet visible -> Continue opens board
    const ctx1 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
    });
    await ctx1.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
      localStorage.setItem(
        'meowdoku_state_v2',
        JSON.stringify({
          schemaVersion: 2,
          hasSeenTutorial: true,
          settings: { reducedMotion: true },
        })
      );
      localStorage.setItem(
        'meowdoku_reminder_engagement_v1',
        JSON.stringify({
          sessionStarts: [Date.now() - 7 * 3600e3],
          sentLog: [],
          pauseAskedFor: null,
        })
      );
    }, lang);
    const page1 = await ctx1.newPage();
    try {
      await page1.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      const sheet = page1.locator('#welcome-back-sheet');
      const sheetVisible = await sheet
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      const sheetText = sheetVisible ? await sheet.innerText() : '';
      check(
        `welcome-back (${locale}): #welcome-back-sheet visible after 7h gap`,
        sheetVisible && sheetText.includes(expectedTitle)
      );

      await page1.locator('#btn-welcome-back-continue').click();
      const boardVisible = await page1
        .locator('#cell-0-0')
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      check(
        `welcome-back (${locale}): #btn-welcome-back-continue launches board`,
        boardVisible
      );
    } finally {
      await ctx1.close();
    }

    // 2. Deep link ?action=map suppresses welcome-back sheet
    const ctx2 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
    });
    await ctx2.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
      localStorage.setItem(
        'meowdoku_state_v2',
        JSON.stringify({
          schemaVersion: 2,
          hasSeenTutorial: true,
          settings: { reducedMotion: true },
        })
      );
      localStorage.setItem(
        'meowdoku_reminder_engagement_v1',
        JSON.stringify({
          sessionStarts: [Date.now() - 7 * 3600e3],
          sentLog: [],
          pauseAskedFor: null,
        })
      );
    }, lang);
    const page2 = await ctx2.newPage();
    try {
      await page2.goto(`${BASE}/?action=map`, { waitUntil: 'networkidle' });
      await page2.waitForTimeout(1100);
      const sheetVisible = await page2.locator('#welcome-back-sheet').isVisible().catch(() => false);
      check(
        `welcome-back (${locale}): ?action=map suppresses #welcome-back-sheet`,
        !sheetVisible
      );
    } finally {
      await ctx2.close();
    }

    // 3. 2h gap (< 6h) suppresses welcome-back sheet
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
          hasSeenTutorial: true,
          settings: { reducedMotion: true },
        })
      );
      localStorage.setItem(
        'meowdoku_reminder_engagement_v1',
        JSON.stringify({
          sessionStarts: [Date.now() - 2 * 3600e3],
          sentLog: [],
          pauseAskedFor: null,
        })
      );
    }, lang);
    const page3 = await ctx3.newPage();
    try {
      await page3.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page3.waitForTimeout(1100);
      const sheetVisible = await page3.locator('#welcome-back-sheet').isVisible().catch(() => false);
      check(
        `welcome-back (${locale}): 2h gap (<6h) does not show #welcome-back-sheet`,
        !sheetVisible
      );
    } finally {
      await ctx3.close();
    }
  }
}
