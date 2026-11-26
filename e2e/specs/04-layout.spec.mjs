import { devices } from 'playwright';
import { skipOnboarding } from '../helpers.mjs';

const VIEWPORTS = [
  { name: '320x568', options: { viewport: { width: 320, height: 568 } } },
  { name: '360x740', options: { viewport: { width: 360, height: 740 } } },
  { name: 'iPhone 13', options: { ...devices['iPhone 13'] } },
  { name: 'Pixel 7', options: { ...devices['Pixel 7'] } },
];

export default async function layoutSpec(browser, { check, BASE }) {
  for (const target of VIEWPORTS) {
    const context = await browser.newContext({
      ...target.options,
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
      await page.locator('#btn-welcome-play').click();

      const grid = page.locator('[role="grid"]');
      const hintBtn = page.locator('#btn-tool-hint');
      await grid.waitFor({ state: 'visible', timeout: 5000 });
      await hintBtn.waitFor({ state: 'visible', timeout: 5000 });

      const metrics = await page.evaluate(() => {
        const gridRect = document.querySelector('[role="grid"]')?.getBoundingClientRect();
        const hintRect = document.querySelector('#btn-tool-hint')?.getBoundingClientRect();
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          grid: gridRect
            ? {
                left: gridRect.left,
                top: gridRect.top,
                right: gridRect.right,
                bottom: gridRect.bottom,
              }
            : null,
          hint: hintRect
            ? {
                left: hintRect.left,
                top: hintRect.top,
                right: hintRect.right,
                bottom: hintRect.bottom,
              }
            : null,
        };
      });

      const inBounds = (rect) =>
        Boolean(rect) &&
        rect.left >= -1 &&
        rect.top >= -1 &&
        rect.right <= metrics.innerWidth + 1 &&
        rect.bottom <= metrics.innerHeight + 1;

      check(
        `layout (${target.name}): board [role="grid"] inside viewport`,
        inBounds(metrics.grid),
        JSON.stringify(metrics.grid)
      );
      check(
        `layout (${target.name}): #btn-tool-hint inside viewport`,
        inBounds(metrics.hint),
        JSON.stringify(metrics.hint)
      );
      check(
        `layout (${target.name}): no horizontal overflow`,
        metrics.scrollWidth <= metrics.innerWidth,
        `scrollWidth=${metrics.scrollWidth}, innerWidth=${metrics.innerWidth}`
      );
    } finally {
      await context.close();
    }
  }
}
