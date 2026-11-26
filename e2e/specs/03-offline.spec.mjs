import { skipOnboarding } from '../helpers.mjs';

export default async function offlineSpec(browser, { check, BASE }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await skipOnboarding(page);

    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && reg.active);
    });
    check('offline: service worker is registered and active', swReady);

    // Wait briefly for SW clients.claim() and precache completion
    await page.waitForTimeout(800);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const playVisible = await page
      .locator('#btn-welcome-play')
      .waitFor({ state: 'visible', timeout: 6000 })
      .then(() => true)
      .catch(() => false);

    check('offline: app reloads offline and shows #btn-welcome-play', playVisible);
  } finally {
    await context.close();
  }
}
