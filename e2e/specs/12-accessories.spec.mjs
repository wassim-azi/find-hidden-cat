import fs from 'node:fs';
import path from 'node:path';
import { skipOnboarding } from '../helpers.mjs';

const ALL_ACCESSORIES = [
  'scarf',
  'flowerCrown',
  'starCrown',
  'winterBeanie',
  'snowflakeCollar',
  'blossomCrown',
  'butterflyBow',
  'sunHat',
  'shellNecklace',
  'leafScarf',
  'acornCharm',
  'goldBell',
  'pawCharm',
  'roundGlasses',
];

export default async function accessoriesSpec(browser, { check, BASE }) {
  const outDir = path.resolve(process.cwd(), 'e2e/__screenshots__');
  fs.mkdirSync(outDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: 'en-US',
  });
  await context.addInitScript((accessories) => {
    localStorage.setItem('meowdoku_language_v1', 'en');
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem(
      'meowdoku_state_v2',
      JSON.stringify({
        schemaVersion: 2,
        unlockedCatIds: ['mochi', 'marmalade', 'pebble', 'biscuit'],
        activeMascotCatId: 'mochi',
        unlockedAccessoryIds: accessories,
        activeAccessoryId: null,
        claimedSetIds: [],
        settings: { reducedMotion: true },
      })
    );
  }, ALL_ACCESSORIES);

  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await skipOnboarding(page);
    await page.locator('#btn-welcome-levels').click();
    await page.locator('#nav-tab-cats').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-tab-cats').click();

    // Verify village set claim button is visible for complete set
    const claimVisible = await page
      .locator('#btn-claim-set-village')
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    check('accessories: #btn-claim-set-village visible when Village set complete', claimVisible);

    // Open Mochi profile and capture 160x160 screenshot for every accessory
    await page.locator('#cat-card-mochi').click();
    const portrait = page.locator('#cat-profile-portrait');
    await portrait.waitFor({ state: 'visible', timeout: 5000 });

    let renderedCount = 0;
    for (const accId of ALL_ACCESSORIES) {
      const btn = page.locator(`#btn-accessory-${accId}`);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      const svgGroup = portrait.locator(`[data-accessory="${accId}"]`);
      const exists = (await svgGroup.count()) === 1;
      if (exists) {
        renderedCount++;
        await portrait.screenshot({
          path: path.join(outDir, `accessory-${accId}.png`),
        });
      }
    }

    check(
      `accessories: all ${ALL_ACCESSORIES.length} accessories rendered & screenshotted`,
      renderedCount === ALL_ACCESSORIES.length,
      `${renderedCount}/${ALL_ACCESSORIES.length}`
    );
  } finally {
    await context.close();
  }
}
