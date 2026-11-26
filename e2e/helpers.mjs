/**
 * Shared Playwright helpers for Meowdoku E2E specs.
 */

export async function closeTutorial(page) {
  // Wait briefly for tutorial overlay if it opens on level 1
  const nextBtn = page.locator('#btn-tutorial-next');
  const doneBtn = page.locator('#btn-tutorial-done');

  await Promise.race([
    nextBtn.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {}),
    doneBtn.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {}),
  ]);

  for (let step = 0; step < 12; step++) {
    if (await doneBtn.isVisible().catch(() => false)) {
      await doneBtn.click();
      await doneBtn.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      return;
    }
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(150);
    } else {
      break;
    }
  }
}

export async function dismissModals(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
}

export async function readBoard(page) {
  await page.waitForSelector('[data-row][data-col]', { timeout: 5000 });
  const cells = await page.locator('[data-row][data-col]').evaluateAll((els) =>
    els.map((el) => ({
      row: Number(el.getAttribute('data-row')),
      col: Number(el.getAttribute('data-col')),
      aria: el.getAttribute('aria-label') || '',
    }))
  );

  let maxIdx = 0;
  for (const c of cells) {
    if (c.row > maxIdx) maxIdx = c.row;
    if (c.col > maxIdx) maxIdx = c.col;
  }
  const size = maxIdx + 1;
  const regions = Array.from({ length: size }, () => Array(size).fill(''));
  const states = Array.from({ length: size }, () => Array(size).fill(''));

  for (const c of cells) {
    const parts = c.aria.split(',').map((s) => s.trim());
    regions[c.row][c.col] = parts[2] ?? '';
    states[c.row][c.col] = parts.slice(3).join(', ');
  }

  return { size, regions, states };
}

export function isCatPlaced(stateText) {
  const s = (stateText || '').toLowerCase();
  return s.includes('cat') || s.includes('chat');
}

export function solve(size, regions) {
  const usedCols = new Set();
  const usedRegions = new Set();
  const placed = [];

  function touchesExisting(r, c) {
    for (const p of placed) {
      if (Math.abs(p.row - r) <= 1 && Math.abs(p.col - c) <= 1) return true;
    }
    return false;
  }

  function backtrack(row) {
    if (row === size) return true;
    for (let col = 0; col < size; col++) {
      const reg = regions[row][col];
      if (usedCols.has(col) || usedRegions.has(reg) || touchesExisting(row, col)) {
        continue;
      }
      usedCols.add(col);
      usedRegions.add(reg);
      placed.push({ row, col });
      if (backtrack(row + 1)) return true;
      placed.pop();
      usedCols.delete(col);
      usedRegions.delete(reg);
    }
    return false;
  }

  if (!backtrack(0)) {
    throw new Error(`No valid solution found for ${size}x${size} board`);
  }
  return placed;
}

export async function placeCat(page, r, c) {
  await page.locator(`#cell-${r}-${c}`).click();
  await page.locator('#btn-ctx-place-cat').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('#btn-ctx-place-cat').click();
}

export async function heartsCount(page) {
  const aria = (await page.locator('#hud-hearts').getAttribute('aria-label')) || '';
  const match = aria.match(/\d+/);
  return match ? Number(match[0]) : -1;
}
