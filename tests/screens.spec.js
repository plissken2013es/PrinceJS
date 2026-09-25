"use strict";

// Compares the title, cutscenes, credits and end screens with the original Phaser 2
// version at fixed moments, using a fake clock so that both play at the same pace.
// Screenshots are recorded from the Phaser 2 build: npm run test:baseline

const { test, expect } = require("@playwright/test");
const { boot, seedRandom, resetRandom } = require("./helpers");

// Moments (ms after the screen starts) are kept away from multiples of the cutscene
// tick (120ms) and, on the title screens, which count frames, away from fades: the
// engines can be a few frames apart there (Phaser 2 does not run at exactly 60 updates
// per second under the fake clock).
const SCREENS = [
  { name: "title", scene: "Title", level: 1, moments: [3050, 9050, 18050, 27050, 36050, 41050] },
  { name: "credits", scene: "Credits", level: 1, moments: [4050, 22050, 25050] },
  { name: "end-title", scene: "EndTitle", level: 1, moments: [4050, 22050, 30050] },
  ...[1, 2, 4, 6, 8, 9, 12, 15, 16].map((level) => ({
    name: `cutscene-${String(level).padStart(2, "0")}`,
    scene: "Cutscene",
    level,
    moments: [2550, 6550, 12550]
  }))
];

test.describe.configure({ timeout: 3 * 60 * 1000 });

for (const screen of SCREENS) {
  test(`${screen.name} looks like the original game`, async ({ page }) => {
    await seedRandom(page);
    await page.clock.install();
    const problems = await boot(page);
    await resetRandom(page);

    // Far enough ahead that the clock, still running, has not passed it yet
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.evaluate(({ scene, level }) => {
      PrinceJS.currentLevel = level;
      window.engine.start(scene);
    }, screen);
    let elapsed = 0;
    while (!(await page.evaluate((scene) => window.engine.running(scene), screen.scene))) {
      await page.clock.runFor(16);
      elapsed += 16;
      expect(elapsed, `${screen.scene} did not start`).toBeLessThan(10000);
    }

    let now = 0;
    for (const moment of screen.moments) {
      await page.clock.runFor(moment - now);
      now = moment;
      // The next scene loads its data over the network, in real time, so the moment it
      // appears is not deterministic: only compare while this screen is still showing
      if (!(await page.evaluate((scene) => window.engine.running(scene), screen.scene))) {
        break;
      }
      const screenshot = await page.screenshot({ clip: await page.locator("canvas").boundingBox() });
      expect(screenshot).toMatchSnapshot(`${screen.name}-${moment}.png`);
    }
    expect(problems).toEqual([]);
  });
}
