export default async function remindersSpec(browser, { check, BASE }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  const seededPrefs = {
    enabled: true,
    timingMode: 'auto',
    reminderTime: '19:00',
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '08:00',
    categories: {
      streak: true,
      dailyPuzzle: true,
      continueAdventure: true,
      specialChallenges: true,
    },
    onboardingDismissed: true,
    lastSentDateByCategory: {},
  };

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.evaluate((prefs) => {
      localStorage.setItem('meowdoku_notifications_v1', JSON.stringify(prefs));
    }, seededPrefs);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const { plan, todayKey } = await page.evaluate(async () => {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const record = await new Promise((resolve, reject) => {
        const req = indexedDB.open('meowdoku_offline_db', 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('notification_prefs')) {
            resolve(null);
            return;
          }
          const tx = db.transaction('notification_prefs', 'readonly');
          const getReq = tx.objectStore('notification_prefs').get('prefs');
          getReq.onsuccess = () => resolve(getReq.result ?? null);
          getReq.onerror = () => reject(getReq.error);
        };
      });

      return { plan: record?.plan ?? [], todayKey: today };
    });

    check(
      'reminders: IndexedDB notification_prefs.prefs has non-empty plan',
      Array.isArray(plan) && plan.length > 0,
      `plan.length=${Array.isArray(plan) ? plan.length : 'invalid'}`
    );
    check(
      'reminders: plan[0].dateKey is not today',
      Array.isArray(plan) && plan.length > 0 && plan[0].dateKey !== todayKey,
      `plan[0].dateKey=${plan[0]?.dateKey}, today=${todayKey}`
    );
  } finally {
    await context.close();
  }
}
