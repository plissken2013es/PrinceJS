"use strict";

const { test, expect } = require("@playwright/test");
const {
  boot,
  waitForState,
  currentState,
  startState,
  startLevel,
  waitForLevel,
  waitForCutsceneOrLevel,
  finishLevel,
  gameInfo,
  expectLoopRunning,
  hold
} = require("./helpers");

const LEVELS = Array.from({ length: 14 }, (_, i) => i + 1);

test("boots through the title into the first level", async ({ page }) => {
  const problems = await boot(page);

  await page.keyboard.press("Enter");
  await waitForState(page, "Title");
  await page.keyboard.press("Enter");
  await waitForLevel(page, 1);

  await hold(page, "ArrowRight", 700);
  await expectLoopRunning(page);
  expect(problems).toEqual([]);
});

for (const level of LEVELS) {
  test(`level ${level} loads and runs`, async ({ page }) => {
    const problems = await boot(page);
    await startLevel(page, level);

    await hold(page, "ArrowRight", 700);
    await hold(page, "ArrowLeft", 700);
    await expectLoopRunning(page);

    const info = await gameInfo(page);
    expect(info.enemies).toBe(info.guards);
    expect(problems).toEqual([]);
  });
}

// Finishing a level at different phases of the 80ms world tick used to crash
// the transitions into levels 4 and 12 in roughly half of the attempts.
for (const from of LEVELS.slice(0, -1)) {
  const to = from + 1;
  test(`transition from level ${from} to level ${to}`, async ({ page }) => {
    const problems = await boot(page);

    for (let delay = 0; delay < 80; delay += 10) {
      const attempt = `finishing level ${from} after ${delay}ms`;
      try {
        await startLevel(page, from);
        await finishLevel(page, delay);
        await waitForCutsceneOrLevel(page, to);
        if ((await currentState(page)) === "Cutscene") {
          await page.keyboard.press("Enter");
        }
        await waitForLevel(page, to);
        await expectLoopRunning(page);
      } catch (error) {
        // Report the exception that froze the game rather than the resulting timeout
        expect(problems, attempt).toEqual([]);
        throw error;
      }
      expect(problems, attempt).toEqual([]);
    }
  });
}

test("restarting the game does not keep enemies from the previous run", async ({ page }) => {
  const problems = await boot(page);
  await page.keyboard.press("Enter");
  await waitForState(page, "Title");
  await page.keyboard.press("Enter");
  await waitForLevel(page, 1);

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Control+r");
    await waitForState(page, "Title");
    await page.keyboard.press("Enter");
    await waitForLevel(page, 1);
    await hold(page, "ArrowRight", 300);

    const info = await gameInfo(page);
    expect(info.enemies).toBe(info.guards);
  }
  await expectLoopRunning(page);
  expect(problems).toEqual([]);
});

const SCREENS = [
  { state: "Cutscene", level: 1, next: "Game" },
  { state: "Cutscene", level: 2, next: "Game" },
  { state: "Cutscene", level: 4, next: "Game" },
  { state: "Cutscene", level: 6, next: "Game" },
  { state: "Cutscene", level: 8, next: "Game" },
  { state: "Cutscene", level: 9, next: "Game" },
  { state: "Cutscene", level: 12, next: "Game" },
  { state: "Cutscene", level: 15, next: "EndTitle" },
  { state: "Cutscene", level: 16, next: "Title" },
  { state: "EndTitle", level: 1, next: "Title" },
  { state: "Credits", level: 1, next: "Game" }
];

for (const screen of SCREENS) {
  test(`${screen.state} ${screen.level} plays and can be skipped`, async ({ page }) => {
    const problems = await boot(page);
    await startState(page, screen.state, screen.level);

    await page.waitForTimeout(1500);
    await expectLoopRunning(page);

    await page.keyboard.press("Enter");
    await waitForState(page, screen.next);
    await expectLoopRunning(page);
    expect(problems).toEqual([]);
  });
}
