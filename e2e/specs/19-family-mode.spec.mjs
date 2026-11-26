/**
 * #29 Family-friendly mode E2E:
 * - Turn on via #toggle-family-mode and skip the optional PIN
 * - Shop: #btn-shop-ad-coins absent
 * - Calendar: no streak UI / text
 * - Notification settings: #toggle-notif-cat-streak absent
 * - Turn off -> parent gate multiplication question -> answer correctly -> off
 * - Runs in both EN and FR
 */
import { skipOnboarding } from '../helpers.mjs';

export default async function familyModeSpec(browser, { check, BASE }) {
  for (const [lang, locale] of [
    ['en', 'en-US'],
    ['fr', 'fr-FR'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale,
    });
    await context.addInitScript((l) => {
      localStorage.setItem('meowdoku_language_v1', l);
      localStorage.setItem('i18nextLng', l);
    }, lang);

    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await skipOnboarding(page);

      // 1. Open Settings and turn on Family Mode, skip optional PIN
      await page.locator('#btn-welcome-settings').click();
      const familyToggle = page.locator('#toggle-family-mode');
      await familyToggle.waitFor({ state: 'visible', timeout: 5000 });
      await familyToggle.click();

      const skipPinBtn = page.locator('#btn-family-pin-skip');
      await skipPinBtn.waitFor({ state: 'visible', timeout: 5000 });
      await skipPinBtn.click();
      await skipPinBtn.waitFor({ state: 'hidden', timeout: 4000 });

      const checkedOn = await familyToggle.getAttribute('aria-checked');
      const break30Checked = await page
        .locator('#btn-break-reminder-30')
        .getAttribute('aria-checked');
      check(
        `family (${locale}): #toggle-family-mode is on and break reminder defaults to 30m`,
        checkedOn === 'true' && break30Checked === 'true'
      );

      await page.keyboard.press('Escape');
      await familyToggle.waitFor({ state: 'hidden', timeout: 4000 });

      // 2. Shop: ad buttons hidden
      await page.locator('#btn-welcome-levels').click();
      await page.locator('#nav-tab-shop').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#nav-tab-shop').click();
      await page.locator('#btn-buy-hint').waitFor({ state: 'visible', timeout: 5000 });
      const shopAdCoinsCount = await page.locator('#btn-shop-ad-coins').count();
      const shopAdHintCount = await page.locator('#btn-shop-ad-hint').count();
      check(
        `family (${locale}): Shop hides #btn-shop-ad-coins and #btn-shop-ad-hint`,
        shopAdCoinsCount === 0 && shopAdHintCount === 0
      );

      // 3. Calendar: no streak text or streak UI
      await page.locator('#nav-tab-missions').click();
      await page.locator('#btn-missions-daily-calendar').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#btn-missions-daily-calendar').click();
      await page.locator('#calendar-day-1').waitFor({ state: 'visible', timeout: 5000 });

      const calendarDialog = page.locator('[role="dialog"]').last();
      const calendarText = (await calendarDialog.textContent()) || '';
      const hasStreakText =
        /streak|série|freeze|gel/i.test(calendarText) ||
        (await page.locator('#calendar-next-milestone').count()) > 0 ||
        (await page.locator('#streak-recovery-banner').count()) > 0;
      check(
        `family (${locale}): Daily calendar hides all streak text and streak UI`,
        !hasStreakText,
        hasStreakText ? calendarText : 'ok'
      );

      await page.keyboard.press('Escape');
      await page.locator('#calendar-day-1').waitFor({ state: 'hidden', timeout: 4000 });

      // 4. Notification settings: only dailyPuzzle category toggle shown (#toggle-notif-cat-streak absent)
      await page.locator('#nav-tab-profile').click();
      await page.locator('#btn-profile-notifications').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#btn-profile-notifications').click();
      await page.locator('#toggle-notifications-master').waitFor({ state: 'visible', timeout: 5000 });

      const streakToggleCount = await page.locator('#toggle-notif-cat-streak').count();
      const adventureToggleCount = await page.locator('#toggle-notif-cat-continueAdventure').count();
      const specialToggleCount = await page.locator('#toggle-notif-cat-specialChallenges').count();
      const dailyToggleCount = await page.locator('#toggle-notif-cat-dailyPuzzle').count();
      check(
        `family (${locale}): Notification settings hides streak/other categories and keeps dailyPuzzle`,
        streakToggleCount === 0 &&
          adventureToggleCount === 0 &&
          specialToggleCount === 0 &&
          dailyToggleCount === 1
      );

      await page.keyboard.press('Escape');
      await page
        .locator('#toggle-notifications-master')
        .waitFor({ state: 'hidden', timeout: 4000 });

      // 5. Turn off via parent gate multiplication challenge
      await page.locator('#btn-hud-settings').click();
      await familyToggle.waitFor({ state: 'visible', timeout: 5000 });
      await familyToggle.click();

      const questionEl = page.locator('#family-gate-question');
      await questionEl.waitFor({ state: 'visible', timeout: 5000 });
      const qText = (await questionEl.textContent()) || '';
      const match = qText.match(/(\d+)\s*[×x*]\s*(\d+)/);
      const expectedAnswer = match ? Number(match[1]) * Number(match[2]) : NaN;
      check(
        `family (${locale}): parent gate shows multiplication question`,
        Number.isFinite(expectedAnswer),
        qText
      );

      await page.locator('#input-family-gate').fill(String(expectedAnswer));
      await page.locator('#btn-family-gate-submit').click();
      await questionEl.waitFor({ state: 'hidden', timeout: 4000 });

      const checkedOff = await familyToggle.getAttribute('aria-checked');
      check(`family (${locale}): #toggle-family-mode is off after gate`, checkedOff === 'false');
    } finally {
      await context.close();
    }
  }
}
