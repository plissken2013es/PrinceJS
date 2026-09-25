"use strict";

// Replays a fixed sequence of key presses in every level and checks that the game
// behaves exactly like the original Phaser 2 version: the game state after every
// step must match the recorded trace, and the screen must match at checkpoints.
//
// The replay is deterministic: randomness is seeded, the world only advances when
// stepped, and a fake clock drives the timed actions (HUD messages, potion effects,
// cutscene delays...). Keys are fed directly to the kid instead of through events.
//
// Traces and screenshots are recorded from the Phaser 2 build: npm run test:baseline

const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { boot, seedRandom, resetRandom, freezeWorld } = require("./helpers");

const LEVELS = Array.from({ length: 14 }, (_, i) => i + 1);
const STEPS = 60;
const TICKS_PER_STEP = 4;
// Clock time between steps. Timed actions use multiples of 100ms, so this keeps them
// away from step boundaries, where the two engines could fire them a frame apart.
const STEP_MILLIS = 350;
const SCREENSHOT_EVERY = 30;

const TRACES = path.join(__dirname, "replay.spec.js-traces");
const INPUTS = [
  [],
  ["right"],
  ["left"],
  ["up"],
  ["down"],
  ["shift"],
  ["right", "shift"],
  ["left", "shift"],
  ["right", "up"],
  ["left", "up"],
  ["down", "right"]
];

// Seeded key sequence: an input is held for a random number of steps
function keySequence(level) {
  let seed = level * 7919;
  const random = (n) => {
    seed = (seed * 48271) % 2147483647;
    return seed % n;
  };
  let keys = [];
  return Array.from({ length: STEPS }, () => {
    if (random(3) === 0) {
      keys = INPUTS[random(INPUTS.length)];
    }
    return keys;
  });
}

// Everything that describes the game at a given moment, compact and engine neutral
function snapshot() {
  const engine = window.engine;
  const game = engine.scene("Game");
  const fighter = (a) => a instanceof PrinceJS.Fighter;
  const actor = (a) =>
    a && [
      a.room,
      a.charX,
      a.charY,
      a.charFace,
      a.action,
      a.charFrame,
      engine.frameName(a),
      a.x,
      a.y,
      a.visible,
      // Only fighters define these; for other actors they would be engine sprite properties
      fighter(a) ? a.active : null,
      fighter(a) ? a.alive : null,
      fighter(a) ? a.health : null,
      a.swordDrawn,
      a.sword ? a.sword.visible : null,
      a.splash ? a.splash.visible : null,
      a.opponent ? a.opponent.charName + (a.opponent.id === undefined ? "" : a.opponent.id) : null
    ];
  // Animated decorations (torches, potions, swords) only matter for how they look
  const decorations = [
    PrinceJS.Level.TILE_TORCH,
    PrinceJS.Level.TILE_TORCH_WITH_DEBRIS,
    PrinceJS.Level.TILE_POTION,
    PrinceJS.Level.TILE_SWORD
  ];
  const tile = (t) =>
    decorations.includes(t.element)
      ? [t.room, t.roomX, t.roomY, t.element]
      : [t.room, t.roomX, t.roomY, t.element, t.state, t.step, t.posY, t.y, t.active];
  return {
    level: PrinceJS.currentLevel,
    room: game.currentRoom,
    kid: actor(game.kid),
    enemies: game.enemies.map(actor),
    mouse: actor(game.mouse),
    tiles: game.level.trobs.map(tile),
    ui: [game.ui.playerHPActive, game.ui.oppHPActive, game.ui.text.text, game.ui.text.visible],
    timers: [game.continueTimer, game.pressButtonToContinueTimer, game.leavingState]
  };
}

// Pauses the fake clock, then starts the level and advances the clock in small
// steps until it is created, so that timed actions start from a known point.
async function startLevelPaused(page, level) {
  // Far enough ahead that the clock, still running, has not passed it yet
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.evaluate((level) => {
    PrinceJS.currentLevel = level;
    window.engine.start("Game");
  }, level);
  for (let i = 0; i < 500; i++) {
    await page.clock.runFor(16);
    const created = await page.evaluate(
      () => window.engine.running("Game") && window.engine.scene("Game").leavingState === false
    );
    if (created) {
      return;
    }
  }
  throw new Error(`level ${level} was not created`);
}

// Optionally moves the kid, then holds the given keys and advances the world,
// returning the resulting state
async function step(page, { keys, teleport, run }, ticks) {
  return page.evaluate(
    ({ keys, teleport, run, ticks, snapshotSource }) => {
      const game = window.engine.scene("Game");
      const kid = game.kid;
      if (run) {
        new Function("game", run)(game);
      }
      if (teleport) {
        kid.room = teleport.room;
        kid.charBlockX = teleport.location % 10;
        kid.charBlockY = Math.floor(teleport.location / 10);
        kid.charX = PrinceJS.Utils.convertBlockXtoX(kid.charBlockX);
        kid.charY = PrinceJS.Utils.convertBlockYtoY(kid.charBlockY);
        if (kid.charFace !== teleport.direction) {
          kid.changeFace();
        }
        kid.hasSword = kid.hasSword || !!teleport.sword;
        kid.action = "stand";
        kid.updateBase();
        game.changeRoom(kid.room);
      }
      kid.cursors.left.isDown = keys.includes("left");
      kid.cursors.right.isDown = keys.includes("right");
      kid.cursors.up.isDown = keys.includes("up");
      kid.cursors.down.isDown = keys.includes("down");
      kid.shiftKey.isDown = keys.includes("shift");
      for (let i = 0; i < ticks && !game.leavingState; i++) {
        PrinceJS.Game.prototype.updateWorld.call(game);
      }
      return new Function(`return (${snapshotSource})()`)();
    },
    { keys, teleport, run, ticks, snapshotSource: snapshot.toString() }
  );
}

// Values that did not change since the previous step are stored as "=", also inside
// lists (enemies, tiles), to keep the traces small
function unchanged(value, previous) {
  if (JSON.stringify(value) === JSON.stringify(previous)) {
    return "=";
  }
  if (Array.isArray(value) && Array.isArray(previous) && Array.isArray(value[0])) {
    return value.map((item, i) => unchanged(item, previous[i]));
  }
  return value;
}

function compress(trace) {
  return trace.map((state, i) => {
    const compressed = {};
    for (const key of Object.keys(state)) {
      compressed[key] = i > 0 ? unchanged(state[key], trace[i - 1][key]) : state[key];
    }
    return compressed;
  });
}

// Describes the first difference between two traces
function firstDifference(expected, actual) {
  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    const a = JSON.stringify(expected[i]);
    const b = JSON.stringify(actual[i]);
    if (a !== b) {
      const keys = Object.keys(expected[i] || actual[i] || {});
      const fields = keys.filter(
        (key) => JSON.stringify((expected[i] || {})[key]) !== JSON.stringify((actual[i] || {})[key])
      );
      const detail = fields.map(
        (key) =>
          `${key}:\n  expected ${JSON.stringify((expected[i] || {})[key])}\n  actual   ${JSON.stringify(
            (actual[i] || {})[key]
          )}`
      );
      return `step ${i}\n${detail.join("\n")}`;
    }
  }
  return null;
}

// settle lets the timed actions of the level start (e.g. the kid turning around)
// happen before the first step, so that they do not undo a teleport
async function replay(page, name, level, steps, settle = false) {
  await seedRandom(page);
  await page.clock.install();
  const problems = await boot(page);
  await freezeWorld(page);
  await resetRandom(page);
  await startLevelPaused(page, level);
  if (settle) {
    await page.clock.runFor(STEP_MILLIS);
  }

  const trace = [];
  for (let i = 0; i < steps.length; i++) {
    const state = await step(page, steps[i], TICKS_PER_STEP);
    trace.push({ keys: steps[i].keys.join("+"), ...state });
    await page.clock.runFor(STEP_MILLIS);
    // Stop once the level is being left, e.g. through the exit door: what follows belongs
    // to another scene, which the engines may reach a frame apart
    const inLevel = await page.evaluate(
      () => window.engine.running("Game") && !window.engine.scene("Game").leavingState
    );
    if (!inLevel) {
      break;
    }
    if ((i + 1) % SCREENSHOT_EVERY === 0 || i === steps.length - 1) {
      const screenshot = await page.screenshot({ clip: await page.locator("canvas").boundingBox() });
      expect(screenshot).toMatchSnapshot(`${name}-step-${i + 1}.png`);
    }
  }

  const file = path.join(TRACES, `${name}.json`);
  const actual = compress(trace);
  if (process.env.UPDATE_TRACES) {
    fs.mkdirSync(TRACES, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(actual) + "\n");
  } else {
    const expected = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(firstDifference(expected, actual), "replay differs from the original game").toBeNull();
  }
  expect(problems).toEqual([]);
}

// Rendering every frame with a software renderer makes replays slow
test.describe.configure({ timeout: 5 * 60 * 1000 });

for (const level of LEVELS) {
  test(`level ${level} replay matches the original game`, async ({ page }) => {
    const steps = keySequence(level).map((keys) => ({ keys }));
    await replay(page, `level-${String(level).padStart(2, "0")}`, level, steps);
  });
}

// Scenarios that take the kid to specific mechanics, which random keys rarely reach.
// After a teleport the kid settles one block back when facing right, so objects are
// reached by teleporting onto their own location.
const hold = (keys, count = 1) => Array.from({ length: count }, () => ({ keys }));
const teleport = (room, location, direction, sword = false) => ({
  keys: [],
  teleport: { room, location, direction, sword }
});
// Runs game code before the step, e.g. to set up a level condition
const run = (code) => ({ keys: [], run: code });
// Several special events only happen once the level's exit door is open
const openExit = run("game.level.exitDoorOpen = true;");
// Engages the opponent and trades blows and blocks
const fight = (rounds, forward) =>
  Array.from({ length: rounds }, () => [
    ...hold(["shift"]),
    ...hold([]),
    ...hold(["up"]),
    ...hold([], 2),
    ...hold([forward]),
    ...hold(["shift"]),
    ...hold([])
  ]).flat();

const SCENARIOS = [
  { name: "loose-floor", level: 1, steps: [teleport(1, 25, 1), ...hold(["right"], 3), ...hold([], 20)] },
  { name: "spikes", level: 1, steps: [teleport(6, 25, -1), ...hold(["left"], 8), ...hold([], 12)] },
  { name: "sword-pickup", level: 1, steps: [teleport(15, 22, 1), ...hold(["shift"], 3), ...hold([], 10)] },
  {
    // Jumping in place on the button raises the exit door, then the kid climbs the stairs
    name: "exit-door",
    level: 1,
    steps: [teleport(9, 1, 1), ...hold(["up"]), ...hold([], 14), teleport(9, 15, 1), ...hold(["up"]), ...hold([], 70)]
  },
  { name: "guard-fight", level: 1, steps: [teleport(21, 3, 1, true), ...hold(["right"], 2), ...fight(8, "right")] },
  { name: "potion-heal", level: 2, steps: [teleport(12, 26, 1), ...hold(["shift"], 3), ...hold([], 10)] },
  { name: "potion-damage", level: 2, steps: [teleport(13, 13, 1), ...hold(["shift"], 3), ...hold([], 10)] },
  { name: "potion-life", level: 2, steps: [teleport(20, 12, 1), ...hold(["shift"], 3), ...hold([], 10)] },
  { name: "chopper", level: 3, steps: [teleport(16, 21, 1), ...hold(["right"], 10), ...hold([], 10)] },
  { name: "fat-guard-fight", level: 6, steps: [teleport(6, 15, -1, true), ...hold(["left"], 2), ...fight(8, "left")] },
  { name: "potion-float", level: 7, steps: [teleport(1, 28, 1), ...hold(["shift"], 3), ...hold([], 20)] },
  { name: "potion-flip", level: 9, steps: [teleport(7, 17, 1), ...hold(["shift"], 3), ...hold([], 10)] },
  {
    name: "skeleton",
    level: 3,
    steps: [openExit, teleport(1, 13, 1, true), ...hold([], 4), ...fight(6, "right")]
  },
  {
    // The mirror appears when the kid passes above it, and running through it frees the shadow
    name: "mirror",
    level: 4,
    steps: [
      openExit,
      teleport(11, 2, -1),
      ...hold([], 2),
      teleport(4, 9, -1),
      ...hold(["left"], 2),
      ...hold(["left", "up"], 2),
      ...hold([], 20)
    ]
  },
  { name: "mouse", level: 8, steps: [openExit, teleport(16, 2, -1), ...hold([], 50)] },
  {
    name: "shadow",
    level: 12,
    steps: [teleport(15, 7, -1), ...hold(["left"], 2), ...hold([], 8), ...hold(["left"], 4), ...hold([], 30)]
  },
  { name: "jaffar-fight", level: 13, steps: [teleport(1, 4, 1, true), ...hold(["right"], 2), ...fight(8, "right")] }
];

for (const scenario of SCENARIOS) {
  test(`${scenario.name} replay matches the original game`, async ({ page }) => {
    await replay(page, scenario.name, scenario.level, scenario.steps, true);
  });
}
