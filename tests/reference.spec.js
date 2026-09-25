"use strict";

// Reference screenshots of every level, taken at a deterministic point:
// randomness is seeded, the world only advances a fixed number of ticks and
// the screenshot is taken once the timed HUD messages are gone.
// They are the baseline to compare against when porting to another engine.
// Recorded from the original Phaser 2 version: npm run test:baseline

const { test, expect } = require("@playwright/test");
const { boot, seedRandom, resetRandom, startLevel, waitForHudIdle, freezeWorld, stepWorld } = require("./helpers");

const TICKS = 20;

for (let level = 1; level <= 14; level++) {
  test(`level ${level} looks like the reference`, async ({ page }) => {
    await seedRandom(page);
    const problems = await boot(page);

    await freezeWorld(page);
    await resetRandom(page);
    await startLevel(page, level);
    // Let pending timed actions (e.g. the kid turning around, HUD messages) happen first
    await waitForHudIdle(page);
    await stepWorld(page, TICKS);
    await page.waitForTimeout(100);

    await expect(page.locator("canvas")).toHaveScreenshot(`level-${String(level).padStart(2, "0")}.png`);
    expect(problems).toEqual([]);
  });
}
