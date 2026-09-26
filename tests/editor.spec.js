"use strict";

// The level editor (editor.html): it must show every original level without problems,
// keep the levels intact, edit them, and play them in the game.

const { test, expect } = require("@playwright/test");

const LEVELS = Array.from({ length: 14 }, (_, i) => i + 1);

test.use({ viewport: { width: 1400, height: 860 } });

// Like watchPage in helpers.js: exceptions, console errors, failed requests and missing frames
function watchPage(page) {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || text.includes("has no frame")) {
      problems.push(`console.${message.type()}: ${text}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.push(`http ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
}

async function openEditor(page) {
  const problems = watchPage(page);
  // Start from the first level, not from a level left by another test
  await page.addInitScript(() => localStorage.removeItem("princejs-editor-level"));
  await page.goto("/editor.html");
  await page.waitForFunction(
    () => window.editor && window.editor.ui.scene && document.querySelectorAll("#palette img").length > 0,
    null,
    { timeout: 20000 }
  );
  return problems;
}

async function openLevel(page, value) {
  await page.selectOption("#level-select", value);
  await page.waitForFunction((v) => {
    const level = window.editor.state.level;
    return v.startsWith("new") ? level.name === "New level" : level.number === Number(v.split(":")[1]);
  }, value);
}

// The point of the page showing a point of the level
function pagePoint(page, x, y) {
  return page.evaluate(
    ([x, y]) => {
      const scene = window.editor.ui.scene;
      const camera = scene.cameras.main;
      const canvas = scene.game.canvas.getBoundingClientRect();
      return {
        x: canvas.left + (x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2,
        y: canvas.top + (y - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2
      };
    },
    [x, y]
  );
}

async function tilePoint(page, room, index) {
  const rect = await page.evaluate(([room, index]) => window.editor.ui.scene.tileRect(room, index), [room, index]);
  return pagePoint(page, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

// Clicks a tile of the level view
async function clickTile(page, room, index) {
  const point = await tilePoint(page, room, index);
  await page.mouse.click(point.x, point.y);
}

function tileOf(page, room, index) {
  return page.evaluate(([room, index]) => window.editor.model.getTile(window.editor.state.level, room, index), [
    room,
    index
  ]);
}

test("shows every original level as it is", async ({ page }) => {
  const problems = await openEditor(page);
  for (const level of LEVELS) {
    await openLevel(page, "level:" + level);
    // The level is kept as it is in the file
    const [edited, original] = await page.evaluate(async (level) => {
      const response = await fetch(`assets/maps/level${level}.json`);
      return [window.editor.state.level, await response.json()];
    }, level);
    expect(edited).toEqual(original);
    // The view shows all its rooms, the prince and the guards
    const view = await page.evaluate(() => {
      const scene = window.editor.ui.scene;
      return { rooms: Object.keys(scene.level.rooms).length, actors: scene.actors.length };
    });
    expect(view.rooms).toBe(original.room.filter((room) => room.id !== -1).length);
    expect(view.actors).toBe(1 + original.guards.length);
    // Only the problems of the original levels themselves
    const errors = await page.evaluate(() =>
      window.editor.model.check(window.editor.state.level).filter((problem) => !problem.info)
    );
    expect(errors, `level ${level}`).toEqual([]);
  }
  expect(problems).toEqual([]);
});

test("saves a level in the format of the game", async ({ page }) => {
  await openEditor(page);
  await openLevel(page, "level:2");
  const download = page.waitForEvent("download");
  await page.click("#export");
  const file = await download;
  expect(file.suggestedFilename()).toBe("level2.json");
  const saved = JSON.parse(require("fs").readFileSync(await file.path(), "utf8"));
  expect(saved).toEqual(require("../public/assets/maps/level2.json"));
});

test("builds a level with the mouse", async ({ page }) => {
  const problems = await openEditor(page);
  await openLevel(page, "new:0");

  // A second room on the right
  await page.keyboard.press("r");
  await page.evaluate(() => window.editor.ui.scene.zoomAt(1, 0, 0));
  await page.keyboard.press("f");
  await page.evaluate(() => window.editor.ui.scene.zoomBy(0.5));
  const point = await pagePoint(page, 480, 94);
  await page.mouse.click(point.x, point.y);
  expect(await page.evaluate(() => window.editor.state.level.size)).toEqual({ width: 2, height: 1 });
  await page.keyboard.press("f");

  // Tiles
  await page.click('#palette button[title="Gate (closed)"]');
  await clickTile(page, 2, 23);
  await page.click('#palette button[title="Opener button"]');
  await clickTile(page, 1, 25);
  await page.click('#palette button[title="Exit door (left)"]');
  await clickTile(page, 2, 7);
  await page.click('#palette button[title="Exit door (right)"]');
  await clickTile(page, 2, 8);
  expect(await tileOf(page, 2, 23)).toEqual({ element: 4, modifier: 0 });
  expect(await tileOf(page, 1, 25)).toEqual({ element: 15, modifier: -1 });

  // Undo and redo
  await page.keyboard.press("Control+z");
  expect((await tileOf(page, 2, 8)).element).toBe(1);
  await page.keyboard.press("Control+y");
  expect((await tileOf(page, 2, 8)).element).toBe(17);

  // The button opens the gate and the exit door
  await page.keyboard.press("v");
  await clickTile(page, 1, 25);
  await page.click("text=Link a gate or door…");
  await clickTile(page, 2, 23);
  await page.click("text=Link a gate or door…");
  await clickTile(page, 2, 8);
  const level = await page.evaluate(() => window.editor.state.level);
  expect(level.room[0].tile[25].modifier).toBe(0);
  expect(level.events).toEqual([
    { number: 1, room: 2, location: 24, next: 1 },
    // The left half of the door, like the original levels
    { number: 2, room: 2, location: 8, next: 0 }
  ]);

  // A guard, moved by dragging it
  await page.keyboard.press("g");
  await clickTile(page, 2, 21);
  await page.keyboard.press("v");
  expect(await page.evaluate(() => window.editor.state.selection)).toEqual({ kind: "guard", guard: 0 });
  const from = await tilePoint(page, 2, 21);
  const to = await tilePoint(page, 2, 24);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.editor.state.level.guards[0])).toMatchObject({ room: 2, location: 24 });

  expect(await page.locator("#problems").innerText()).toContain("No problems found");
  expect(problems).toEqual([]);
});

test("keeps the links of the other buttons when relinking one", async ({ page }) => {
  await openEditor(page);
  for (const number of LEVELS) {
    await openLevel(page, "level:" + number);
    const result = await page.evaluate(() => {
      const model = window.editor.model;
      const level = model.clone(window.editor.state.level);
      const buttons = model.buttons(level);
      const targets = (l) =>
        model
          .buttons(l)
          .map((button) => JSON.stringify(model.buttonTargets(l, model.getTile(l, button.room, button.index))));
      const results = [];
      for (const button of buttons) {
        const copy = model.clone(level);
        const before = targets(copy);
        // Link the button to the first gate of the level instead
        const gate = findGate(copy);
        if (!gate) {
          continue;
        }
        model.setButtonTargets(copy, button.room, button.index, [gate]);
        const after = targets(copy);
        const sharing = model
          .buttons(level)
          .map((other) => other.tile.modifier === button.tile.modifier && button.tile.modifier >= 0);
        results.push(
          before.every((value, i) => (sharing[i] ? after[i] === JSON.stringify([gate]) : after[i] === value))
        );
      }
      return results;

      function findGate(l) {
        for (const room of model.rooms(l)) {
          const index = room.tile.findIndex((tile) => tile.element === 4);
          if (index > -1) {
            return { room: room.id, index };
          }
        }
        return null;
      }
    });
    expect(result.every(Boolean), `level ${number}`).toBe(true);
  }
});

test("plays the level in the game and comes back", async ({ page }) => {
  const problems = await openEditor(page);
  await openLevel(page, "level:3");
  await page.evaluate(() => window.editor.state.change((level) => (level.name = "Edited")));

  await page.click("#play");
  const frame = page.frameLocator("#play-frame");
  await expect(frame.locator("canvas")).toBeVisible();
  const game = await page.waitForFunction(
    () => {
      const w = document.querySelector("#play-frame").contentWindow;
      const scene = w.PrinceJS && w.PrinceJS.game && w.PrinceJS.game.scene.getScene("Game");
      return scene && scene.sys.isActive() && scene.level && scene.level.name;
    },
    null,
    { timeout: 30000 }
  );
  expect(await game.jsonValue()).toBe("Edited");
  expect(await page.evaluate(() => document.querySelector("#play-frame").contentWindow.PrinceJS.currentLevel)).toBe(3);

  // Finishing the level brings the editor back
  await page.evaluate(() =>
    document.querySelector("#play-frame").contentWindow.PrinceJS.game.scene.getScene("Game").nextLevel()
  );
  await expect(page.locator("#play-overlay")).toBeHidden();
  await expect(page.locator("#toast")).toHaveText("Level completed!");

  // Escape too
  await page.click("#play");
  await page.waitForFunction(() => {
    const w = document.querySelector("#play-frame").contentWindow;
    return w.PrinceJS && w.PrinceJS.game && w.PrinceJS.game.scene.isActive("Game");
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#play-overlay")).toBeHidden();
  expect(problems).toEqual([]);
});
