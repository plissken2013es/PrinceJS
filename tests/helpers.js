"use strict";

// Every engine specific detail the tests rely on lives in this file,
// so a port to another Phaser version only needs to adapt these helpers.

const { expect } = require("@playwright/test");

// A frozen game never reaches the awaited state, so fail well before the test timeout
const WAIT = { timeout: 15000 };

// Collects everything that indicates a broken game: uncaught exceptions,
// console errors, failed asset requests and sprite frames that do not exist.
function watchPage(page) {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || message.text().includes("Cannot set frameName")) {
      problems.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.push(`http ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
}

// Makes Math.random and Phaser's RNG deterministic (used by torches and loose floors).
async function seedRandom(page) {
  await page.addInitScript(() => {
    let seed = 1234567;
    Math.random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  });
}

// Loads the page and waits until all assets are loaded ("Click to Start").
async function boot(page) {
  const problems = watchPage(page);
  await page.goto("/");
  await waitForState(page, "Preloader");
  await page.waitForFunction(() => PrinceJS.game.state.getCurrentState().text.text === "Click to Start", null, WAIT);
  await page.evaluate(() => PrinceJS.game.rnd.sow([1234567]));
  return problems;
}

// Waits until the given state is active and its create() has run.
async function waitForState(page, name) {
  await page.waitForFunction(
    (name) =>
      typeof PrinceJS !== "undefined" &&
      PrinceJS.game &&
      PrinceJS.game.state.current === name &&
      PrinceJS.game.state._created &&
      !PrinceJS.game.state._pendingState,
    name,
    WAIT
  );
}

async function currentState(page) {
  return page.evaluate(() => PrinceJS.game.state.current);
}

// Starts a state directly, bypassing the normal flow.
async function startState(page, name, level = 1) {
  await page.evaluate(
    ({ name, level }) => {
      PrinceJS.currentLevel = level;
      PrinceJS.game.state.start(name);
    },
    { name, level }
  );
  await waitForState(page, name);
}

// Loads a level without its cutscene, the same way the game restarts a level.
async function startLevel(page, level) {
  await page.evaluate((level) => {
    PrinceJS.currentLevel = level;
    const game = PrinceJS.game;
    if (game.state.current === "Game" && game.state._created) {
      game.state.getCurrentState().leaveTo("Game");
    } else {
      game.state.start("Game");
    }
  }, level);
  await waitForLevel(page, level);
}

async function waitForLevel(page, level) {
  await waitForState(page, "Game");
  await page.waitForFunction((level) => PrinceJS.currentLevel === level, level, WAIT);
}

// Finishes the current level exactly like the exit door does (Kid.js): the
// next level is requested from a setTimeout, outside of Phaser's game loop.
// The delay lets callers probe different phases of the 80ms world tick.
async function finishLevel(page, delay) {
  await page.evaluate((delay) => {
    const game = PrinceJS.game.state.getCurrentState();
    setTimeout(() => game.kid.onNextLevel.dispatch(PrinceJS.currentLevel), delay);
  }, delay);
}

async function gameInfo(page) {
  return page.evaluate(() => {
    const game = PrinceJS.game.state.getCurrentState();
    return {
      level: PrinceJS.currentLevel,
      enemies: game.enemies.length,
      guards: PrinceJS.game.cache.getJSON("level").guards.length,
      room: game.kid.room,
      action: game.kid.action
    };
  });
}

// Fails if the game loop stopped running, which is what happens in Phaser 2
// when an exception is thrown inside an update.
async function expectLoopRunning(page) {
  const before = await page.evaluate(() => PrinceJS.game.time.time);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => PrinceJS.game.time.time);
  expect(after, "game loop stopped").toBeGreaterThan(before);
}

async function hold(page, key, millis) {
  await page.keyboard.down(key);
  await page.waitForTimeout(millis);
  await page.keyboard.up(key);
}

// The HUD shows "LEVEL n" and then the remaining minutes, both driven by wall
// clock timeouts (Interface.js). Waits until that sequence is over and the text is gone.
async function waitForHudIdle(page) {
  await page.waitForTimeout(2500);
  await page.waitForFunction(
    () => {
      const ui = PrinceJS.game.state.getCurrentState().ui;
      return ui.text.text === "" && ui.showTextType === null;
    },
    null,
    WAIT
  );
}

// Stops the world tick so the scene only changes when stepWorld() is called.
async function freezeWorld(page) {
  await page.evaluate(() => PrinceJS.game.time.events.pause());
}

async function stepWorld(page, ticks) {
  await page.evaluate((ticks) => {
    const game = PrinceJS.game.state.getCurrentState();
    for (let i = 0; i < ticks; i++) {
      game.updateWorld();
    }
  }, ticks);
}

module.exports = {
  WAIT,
  boot,
  seedRandom,
  waitForState,
  currentState,
  startState,
  startLevel,
  waitForLevel,
  finishLevel,
  gameInfo,
  expectLoopRunning,
  hold,
  waitForHudIdle,
  freezeWorld,
  stepWorld
};
