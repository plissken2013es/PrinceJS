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
    if (message.type() === "error" || message.text().includes("has no frame")) {
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

// Replaces Math.random with a seedable generator, see resetRandom().
async function seedRandom(page) {
  await page.addInitScript(() => {
    // Two independent generators, so that engine internals calling Math.random
    // do not shift the values the game gets from the engine's generator
    const generator = () => {
      let seed = 1;
      const next = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      next.seed = (value) => {
        seed = value;
      };
      return next;
    };
    Math.random = generator();
    window.seededRandom = generator();
  });
}

// Makes the game's randomness repeatable from this point on. The engine's own
// generator is replaced by a seeded one, so that every Phaser version produces
// the same sequence (their generators are seeded differently).
async function resetRandom(page) {
  await page.evaluate(() => {
    Math.random.seed(1234567);
    window.seededRandom.seed(7654321);
    Phaser.Math.RND.between = (min, max) => min + Math.floor(window.seededRandom() * (max - min + 1));
  });
}

// Loads the page and waits until all assets are loaded ("Click to Start").
async function boot(page) {
  const problems = watchPage(page);
  await page.goto("/");
  await waitForState(page, "Preloader");
  await page.waitForFunction(
    () => PrinceJS.game.scene.getScene("Preloader").text.text === "Click to Start",
    null,
    WAIT
  );
  return problems;
}

// Waits until the given scene is running, i.e. its create() has run.
async function waitForState(page, name) {
  await page.waitForFunction(
    (name) => {
      if (typeof PrinceJS === "undefined" || !PrinceJS.game || !PrinceJS.game.scene.isActive(name)) {
        return false;
      }
      // Restarting the level keeps the scene running until the new level is created
      return name !== "Game" || PrinceJS.game.scene.getScene("Game").leavingState === false;
    },
    name,
    WAIT
  );
}

async function currentState(page) {
  return page.evaluate(() => PrinceJS.game.scene.getScenes(true)[0].sys.settings.key);
}

// Starts a scene directly, bypassing the normal flow.
async function startState(page, name, level = 1) {
  await page.evaluate(
    ({ name, level }) => {
      PrinceJS.currentLevel = level;
      const current = PrinceJS.game.scene.getScenes(true)[0];
      if (current.sys.settings.key === "Game") {
        current.leaveTo(name);
      } else {
        current.scene.start(name);
      }
    },
    { name, level }
  );
  await waitForState(page, name);
}

// Loads a level without its cutscene, the same way the game restarts a level.
async function startLevel(page, level) {
  await startState(page, "Game", level);
  await waitForLevel(page, level);
}

async function waitForLevel(page, level) {
  await waitForState(page, "Game");
  await page.waitForFunction((level) => PrinceJS.currentLevel === level, level, WAIT);
}

// Waits for the game to move on to the given level, possibly through its cutscene first.
async function waitForCutsceneOrLevel(page, level) {
  await page.waitForFunction(
    (level) => {
      const scenes = PrinceJS.game.scene;
      if (scenes.isActive("Cutscene")) {
        return true;
      }
      return (
        scenes.isActive("Game") && scenes.getScene("Game").leavingState === false && PrinceJS.currentLevel === level
      );
    },
    level,
    WAIT
  );
}

// Finishes the current level from outside of the game loop, with a delay that
// lets callers probe different phases of the 80ms world tick.
async function finishLevel(page, delay) {
  await page.evaluate((delay) => {
    const game = PrinceJS.game.scene.getScene("Game");
    setTimeout(() => game.kid.onNextLevel.dispatch(PrinceJS.currentLevel), delay);
  }, delay);
}

async function gameInfo(page) {
  return page.evaluate(() => {
    const game = PrinceJS.game.scene.getScene("Game");
    return {
      level: PrinceJS.currentLevel,
      enemies: game.enemies.length,
      guards: game.cache.json.get("level").guards.length,
      room: game.kid.room,
      action: game.kid.action
    };
  });
}

// Fails if the game loop stopped running.
async function expectLoopRunning(page) {
  const before = await page.evaluate(() => PrinceJS.game.loop.frame);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => PrinceJS.game.loop.frame);
  expect(after, "game loop stopped").toBeGreaterThan(before);
}

async function hold(page, key, millis) {
  await page.keyboard.down(key);
  await page.waitForTimeout(millis);
  await page.keyboard.up(key);
}

// The HUD shows "LEVEL n" and then the remaining minutes, both on timers
// (Interface.js). Waits until that sequence is over and the text is gone.
async function waitForHudIdle(page) {
  await page.waitForTimeout(2500);
  await page.waitForFunction(
    () => {
      const ui = PrinceJS.game.scene.getScene("Game").ui;
      return ui.text.text === "" && ui.showTextType === null;
    },
    null,
    WAIT
  );
}

// Stops the world tick so the level only changes when stepWorld() is called.
// Must be called before the level is created: the tick captures updateWorld then.
async function freezeWorld(page) {
  await page.evaluate(() => {
    PrinceJS.game.scene.getScene("Game").updateWorld = () => {};
  });
}

async function stepWorld(page, ticks) {
  await page.evaluate((ticks) => {
    const game = PrinceJS.game.scene.getScene("Game");
    for (let i = 0; i < ticks; i++) {
      PrinceJS.Game.prototype.updateWorld.call(game);
    }
  }, ticks);
}

module.exports = {
  WAIT,
  boot,
  seedRandom,
  resetRandom,
  waitForState,
  currentState,
  startState,
  startLevel,
  waitForLevel,
  waitForCutsceneOrLevel,
  finishLevel,
  gameInfo,
  expectLoopRunning,
  hold,
  waitForHudIdle,
  freezeWorld,
  stepWorld
};
