// The level view of the editor: the level drawn by the game's own LevelBuilder, with the
// prince and the guards, plus overlays (grid, selection, button links) and mouse editing.

import Phaser from "phaser";
import PrinceJS from "../PrinceJS.js";
import * as model from "./model.js";

const TILE_WIDTH = PrinceJS.BLOCK_WIDTH;
const TILE_HEIGHT = PrinceJS.BLOCK_HEIGHT;
const ROOM_WIDTH = PrinceJS.ROOM_WIDTH;
const ROOM_HEIGHT = PrinceJS.ROOM_HEIGHT;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

const COLOR_ROOM = 0x5a5a6e;
const COLOR_GRID = 0x3a3a48;
const COLOR_HOVER = 0xffffff;
const COLOR_SELECTION = 0xffd23f;
const COLOR_OPEN = 0x4cd964;
const COLOR_CLOSE = 0xff5a4f;
const COLOR_PICK = 0x4fc3ff;
const COLOR_EMPTY = 0x2a2a36;

// Loads what the view needs: the game graphics and animations, but no sound
export class EditorBoot extends Phaser.Scene {
  constructor() {
    super("EditorBoot");
  }

  preload() {
    this.load.bitmapFont("font", "assets/font/prince_0.png", "assets/font/prince.fnt");
    PrinceJS.Preloader.loadGraphics(this);
  }

  create() {
    PrinceJS.Preloader.fixPivots(this);
    this.scene.start("Editor");
  }
}

export class EditorScene extends Phaser.Scene {
  constructor() {
    super("Editor");
  }

  create() {
    this.state = this.registry.get("state");
    this.options = this.registry.get("options");

    this.level = null;
    this.actors = [];
    this.labels = [];
    this.animated = [];

    // Tiles call back into the game while being built: nothing to do in the editor
    this.delegate = { fireEvent() {}, floorStartFall() {}, floorStopFall() {} };

    this.overlay = this.add.graphics().setDepth(50);
    this.labelLayer = this.add.layer().setDepth(60);

    this.cameras.main.setBackgroundColor(0x101018);
    this.input.mouse.disableContextMenu();

    this.state.on("level", this.scheduleRebuild, this);
    this.state.on("selection", this.drawOverlay, this);
    this.state.on("tool", this.drawOverlay, this);
    this.state.on("hover", this.drawOverlay, this);
    this.events.once("shutdown", () => {
      this.state.off("level", this.scheduleRebuild, this);
      this.state.off("selection", this.drawOverlay, this);
      this.state.off("tool", this.drawOverlay, this);
      this.state.off("hover", this.drawOverlay, this);
    });

    // Torches, potions and swords are animated like in the game
    this.time.addEvent({ delay: 80, loop: true, callback: this.animate, callbackScope: this });

    this.setupInput();
    this.scale.on("resize", this.drawOverlay, this);

    this.rebuild();
    this.fit();

    this.game.events.emit("editor-ready", this);
  }

  // ---- Drawing the level ----

  scheduleRebuild() {
    if (!this.rebuildPending) {
      this.rebuildPending = true;
      // At most one rebuild per frame while painting
      this.time.delayedCall(0, () => {
        this.rebuildPending = false;
        this.rebuild();
      });
    }
  }

  rebuild() {
    if (this.level) {
      this.level.back.destroy();
      this.level.front.destroy();
    }
    this.actors.forEach((actor) => actor.destroy());
    this.actors = [];

    let json = model.clone(this.state.level);
    // The entrance door is shown open, as the level starts
    this.level = new PrinceJS.LevelBuilder(this, this.delegate).buildFromJSON(json);

    this.animated = [];
    for (let trob of this.level.trobs) {
      if (trob instanceof PrinceJS.Tile.Mirror) {
        trob.addObject();
      }
      if (
        trob instanceof PrinceJS.Tile.Torch ||
        trob instanceof PrinceJS.Tile.Potion ||
        trob instanceof PrinceJS.Tile.Sword
      ) {
        this.animated.push(trob);
      }
    }

    this.buildActors();
    this.drawLabels();
    this.drawOverlay();
  }

  buildActors() {
    let level = this.state.level;
    let prince = level.prince;
    let kid = this.addActor(
      "kid",
      "kid",
      prince.room,
      prince.location,
      model.princeFacing(prince),
      prince.offset || 0,
      1
    );
    if (kid) {
      kid.character = "prince";
      this.actors.push(kid);
    }
    level.guards.forEach((guard, i) => {
      let key = guard.type;
      if (key === "guard") {
        key = "guard-" + guard.colors;
      }
      let animKey = key === "shadow" ? "shadow" : "fighter";
      let hidden = guard.visible === false;
      let actor = this.addActor(
        key,
        animKey,
        guard.room,
        guard.location,
        guard.direction,
        guard.direction * 7,
        hidden ? 0.4 : 1
      );
      if (actor) {
        actor.character = i;
        this.actors.push(actor);
      }
    });
  }

  // A character standing still on a tile, placed like Fighter does it
  addActor(key, animKey, room, location, face, dx, alpha) {
    let position = model.roomPosition(this.state.level, room);
    if (!position || !this.textures.exists(key)) {
      return null;
    }
    let charX = PrinceJS.Utils.convertBlockXtoX(location % 10) + dx;
    let charY = PrinceJS.Utils.convertBlockYtoY(Math.floor(location / 10));
    let actor = new PrinceJS.Actor(this, charX, charY, face, key, animKey);
    actor.baseX = position.x * ROOM_WIDTH;
    actor.baseY = position.y * ROOM_HEIGHT + 3;
    actor.updateActor();
    actor.setAlpha(alpha);
    return actor;
  }

  animate() {
    if (this.options.animate) {
      this.animated.forEach((trob) => trob.update());
    }
  }

  drawLabels() {
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    if (!this.options.roomNumbers) {
      return;
    }
    for (let room of model.rooms(this.state.level)) {
      let position = model.roomPosition(this.state.level, room.id);
      let label = this.add
        .bitmapText(position.x * ROOM_WIDTH + 3, position.y * ROOM_HEIGHT + 3, "font", String(room.id), 8)
        .setTint(0xffd23f);
      let back = this.add
        .rectangle(label.x - 2, label.y - 2, label.width + 4, label.height + 3, 0x000000, 0.7)
        .setOrigin(0, 0);
      this.labelLayer.add([back, label]);
      this.labels.push(back, label);
    }
  }

  // ---- Overlays ----

  drawOverlay() {
    let g = this.overlay;
    let level = this.state.level;
    let state = this.state;
    let line = 1 / this.cameras.main.zoom;
    g.clear();

    // The grid cells, and the ones around it where rooms can be added
    if (state.tool === "rooms") {
      for (let y = -1; y <= level.size.height; y++) {
        for (let x = -1; x <= level.size.width; x++) {
          if (model.roomAt(level, x, y) === -1) {
            this.drawEmptyCell(x, y, line);
          }
        }
      }
    }

    for (let room of model.rooms(level)) {
      let position = model.roomPosition(level, room.id);
      let rx = position.x * ROOM_WIDTH;
      let ry = position.y * ROOM_HEIGHT;
      if (this.options.grid) {
        g.lineStyle(line, COLOR_GRID, 0.9);
        for (let i = 1; i < model.ROOM_COLUMNS; i++) {
          g.lineBetween(rx + i * TILE_WIDTH, ry, rx + i * TILE_WIDTH, ry + ROOM_HEIGHT);
        }
        for (let j = 1; j < model.ROOM_ROWS; j++) {
          g.lineBetween(rx, ry + j * TILE_HEIGHT, rx + ROOM_WIDTH, ry + j * TILE_HEIGHT);
        }
      }
      g.lineStyle(line, COLOR_ROOM, 1);
      g.strokeRect(rx, ry, ROOM_WIDTH, ROOM_HEIGHT);
    }

    // Where a pending pick can land
    if (state.pick && state.pick.kind === "target") {
      for (let room of model.rooms(level)) {
        room.tile.forEach((tile, index) => {
          if (model.isTarget(tile)) {
            this.strokeTile(room.id, index, COLOR_PICK, 2 * line, 0.15);
          }
        });
      }
    }

    // Links between buttons and the gates and doors they open or close
    if (this.options.allLinks) {
      for (let button of model.buttons(level)) {
        this.drawLinks(button.room, button.index, 0.35, line);
      }
    }
    let selection = state.selection;
    if (selection && selection.kind === "tile") {
      let tile = model.getTile(level, selection.room, selection.index);
      if (model.isButton(tile)) {
        this.drawLinks(selection.room, selection.index, 1, 2 * line);
      } else if (model.isTarget(tile)) {
        for (let button of model.buttonsFor(level, selection.room, selection.index)) {
          this.drawLinks(button.room, button.index, 1, 2 * line);
        }
      }
    }

    if (state.hover && state.hover.room !== -1) {
      if (state.tool === "rooms" && !state.pick) {
        this.strokeRoom(state.hover.room, COLOR_HOVER, line);
      } else {
        this.strokeTile(state.hover.room, state.hover.index, COLOR_HOVER, line);
      }
    }
    if (state.hover && state.hover.room === -1 && state.tool === "rooms") {
      g.lineStyle(line, COLOR_HOVER, 1);
      g.strokeRect(state.hover.gx * ROOM_WIDTH, state.hover.gy * ROOM_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT);
    }

    if (selection) {
      if (selection.kind === "tile") {
        this.strokeTile(selection.room, selection.index, COLOR_SELECTION, 2 * line);
      } else if (selection.kind === "room") {
        this.strokeRoom(selection.room, COLOR_SELECTION, 2 * line);
      } else if (selection.kind === "prince") {
        this.strokeTile(level.prince.room, level.prince.location, COLOR_SELECTION, 2 * line);
      } else if (selection.kind === "guard" && level.guards[selection.guard]) {
        let guard = level.guards[selection.guard];
        this.strokeTile(guard.room, guard.location, COLOR_SELECTION, 2 * line);
      }
    }

    // A character or room being dragged
    if (this.drag && this.drag.moved && state.hover) {
      if (this.drag.kind === "room") {
        g.lineStyle(2 * line, COLOR_PICK, 1);
        g.strokeRect(state.hover.gx * ROOM_WIDTH, state.hover.gy * ROOM_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT);
      } else if (state.hover.room !== -1) {
        this.strokeTile(state.hover.room, state.hover.index, COLOR_PICK, 2 * line, 0.25);
      }
    }
  }

  drawEmptyCell(x, y, line) {
    let g = this.overlay;
    let cx = x * ROOM_WIDTH;
    let cy = y * ROOM_HEIGHT;
    g.fillStyle(COLOR_EMPTY, 0.5);
    g.fillRect(cx + 4, cy + 4, ROOM_WIDTH - 8, ROOM_HEIGHT - 8);
    g.lineStyle(line * 2, COLOR_ROOM, 1);
    g.lineBetween(cx + ROOM_WIDTH / 2 - 12, cy + ROOM_HEIGHT / 2, cx + ROOM_WIDTH / 2 + 12, cy + ROOM_HEIGHT / 2);
    g.lineBetween(cx + ROOM_WIDTH / 2, cy + ROOM_HEIGHT / 2 - 12, cx + ROOM_WIDTH / 2, cy + ROOM_HEIGHT / 2 + 12);
  }

  tileRect(room, index) {
    let position = model.roomPosition(this.state.level, room);
    if (!position) {
      return null;
    }
    return new Phaser.Geom.Rectangle(
      position.x * ROOM_WIDTH + (index % 10) * TILE_WIDTH,
      position.y * ROOM_HEIGHT + Math.floor(index / 10) * TILE_HEIGHT,
      TILE_WIDTH,
      TILE_HEIGHT
    );
  }

  strokeTile(room, index, color, width, fill = 0) {
    let rect = this.tileRect(room, index);
    if (!rect) {
      return;
    }
    if (fill) {
      this.overlay.fillStyle(color, fill);
      this.overlay.fillRectShape(rect);
    }
    this.overlay.lineStyle(width, color, 1);
    this.overlay.strokeRectShape(rect);
  }

  strokeRoom(room, color, width) {
    let position = model.roomPosition(this.state.level, room);
    if (position) {
      this.overlay.lineStyle(width, color, 1);
      this.overlay.strokeRect(position.x * ROOM_WIDTH, position.y * ROOM_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT);
    }
  }

  drawLinks(room, index, alpha, width) {
    let level = this.state.level;
    let tile = model.getTile(level, room, index);
    let from = this.tileRect(room, index);
    if (!from || !model.isButton(tile)) {
      return;
    }
    let color = tile.element === PrinceJS.Level.TILE_RAISE_BUTTON ? COLOR_OPEN : COLOR_CLOSE;
    let g = this.overlay;
    for (let target of model.buttonTargets(level, tile)) {
      let to = this.tileRect(target.room, target.index);
      if (!to) {
        continue;
      }
      g.lineStyle(width, color, alpha);
      g.lineBetween(from.centerX, from.centerY + 20, to.centerX, to.centerY);
      g.fillStyle(color, alpha);
      g.fillCircle(to.centerX, to.centerY, 3 * width);
      g.strokeRectShape(to);
    }
    g.fillStyle(color, alpha);
    g.fillCircle(from.centerX, from.centerY + 20, 2 * width);
  }

  // ---- Camera ----

  toWorld(screenX, screenY) {
    let camera = this.cameras.main;
    return {
      x: camera.scrollX + camera.width / 2 + (screenX - camera.width / 2) / camera.zoom,
      y: camera.scrollY + camera.height / 2 + (screenY - camera.height / 2) / camera.zoom
    };
  }

  // Zooms keeping the world point under the screen point in place
  zoomAt(zoom, screenX, screenY) {
    let camera = this.cameras.main;
    zoom = Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    let world = this.toWorld(screenX, screenY);
    camera.setZoom(zoom);
    camera.scrollX = world.x - camera.width / 2 - (screenX - camera.width / 2) / zoom;
    camera.scrollY = world.y - camera.height / 2 - (screenY - camera.height / 2) / zoom;
    this.drawOverlay();
    this.game.events.emit("editor-zoom", zoom);
  }

  zoomBy(factor) {
    let camera = this.cameras.main;
    this.zoomAt(camera.zoom * factor, camera.width / 2, camera.height / 2);
  }

  // Shows the whole level
  fit() {
    let camera = this.cameras.main;
    let size = this.state.level.size;
    let width = size.width * ROOM_WIDTH + 64;
    let height = size.height * ROOM_HEIGHT + 64;
    let zoom = Math.min(camera.width / width, camera.height / height);
    // Whole zoom levels keep the pixels square
    zoom = zoom >= 1 ? Math.floor(zoom) : zoom;
    camera.setZoom(Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM));
    camera.centerOn((size.width * ROOM_WIDTH) / 2, (size.height * ROOM_HEIGHT) / 2);
    this.drawOverlay();
    this.game.events.emit("editor-zoom", camera.zoom);
  }

  // Shows a room as the game does, at twice its size if it fits
  focusRoom(room) {
    let position = model.roomPosition(this.state.level, room);
    if (!position) {
      return;
    }
    let camera = this.cameras.main;
    let zoom = Math.min(camera.width / (ROOM_WIDTH + 32), camera.height / (ROOM_HEIGHT + 32));
    camera.setZoom(Phaser.Math.Clamp(zoom >= 1 ? Math.floor(zoom) : zoom, MIN_ZOOM, MAX_ZOOM));
    camera.centerOn(position.x * ROOM_WIDTH + ROOM_WIDTH / 2, position.y * ROOM_HEIGHT + ROOM_HEIGHT / 2);
    this.drawOverlay();
    this.game.events.emit("editor-zoom", camera.zoom);
  }

  // ---- Mouse ----

  // The cell of the grid and the tile under a world point
  cellAt(world) {
    let level = this.state.level;
    let gx = Math.floor(world.x / ROOM_WIDTH);
    let gy = Math.floor(world.y / ROOM_HEIGHT);
    let x = Math.floor((world.x - gx * ROOM_WIDTH) / TILE_WIDTH);
    let y = Math.floor((world.y - gy * ROOM_HEIGHT) / TILE_HEIGHT);
    return { gx, gy, room: model.roomAt(level, gx, gy), index: y * 10 + x };
  }

  setupInput() {
    this.spaceDown = false;
    let onKey = (event) => {
      if (event.code === "Space" && !isTyping(event)) {
        this.spaceDown = event.type === "keydown";
        this.input.setDefaultCursor(this.spaceDown ? "grab" : "default");
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    });

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.input.on("pointerupoutside", this.onPointerUp, this);
    this.input.on("gameout", () => this.state.setHover(null));
    this.input.on("wheel", (pointer, objects, dx, dy) => {
      this.zoomAt(this.cameras.main.zoom * (dy < 0 ? 1.25 : 0.8), pointer.x, pointer.y);
    });
  }

  onPointerDown(pointer) {
    let cell = this.cellAt(this.toWorld(pointer.x, pointer.y));
    let state = this.state;

    // Panning: middle button, right button drag, or space and left button
    if (pointer.middleButtonDown() || pointer.rightButtonDown() || this.spaceDown) {
      this.pan = { x: pointer.x, y: pointer.y, moved: false, right: pointer.rightButtonDown(), cell };
      return;
    }
    if (pointer.event.detail === 2 && state.tool === "rooms" && cell.room !== -1) {
      this.focusRoom(cell.room);
      return;
    }

    if (state.pick) {
      if (cell.room !== -1) {
        state.pick.fn(cell.room, cell.index);
      }
      return;
    }

    switch (state.tool) {
      case "select":
        if (cell.room === -1) {
          state.select(null);
          return;
        }
        this.selectAt(cell, this.toWorld(pointer.x, pointer.y));
        break;

      case "paint":
        if (cell.room !== -1) {
          state.beginStroke();
          this.painting = true;
          this.paint(cell);
        }
        break;

      case "rooms":
        if (cell.room === -1) {
          state.change((level) => {
            let id = model.addRoom(level, cell.gx, cell.gy);
            if (id === -1) {
              return false;
            }
            state.selection = { kind: "room", room: id };
          });
          state.emit("selection");
        } else {
          state.select({ kind: "room", room: cell.room });
          this.drag = { kind: "room", room: cell.room, from: cell, moved: false };
        }
        break;

      case "guard":
        if (cell.room !== -1) {
          state.change((level) => {
            level.guards.push(model.newGuard(cell.room, cell.index));
            state.selection = { kind: "guard", guard: level.guards.length - 1 };
          });
          state.emit("selection");
        }
        break;
    }
  }

  // Selects the character on a tile (the next one on each click), or the tile
  // Selects what is under the pointer. Characters come first: each click selects the
  // next one there, then the tile. A selected character is dragged instead.
  selectAt(cell, world) {
    let state = this.state;
    let characters = this.charactersAt(cell, world);
    let selection = state.selection;
    let selected = selection && (selection.kind === "prince" ? "prince" : selection.guard);
    if (selection && (selection.kind === "prince" || selection.kind === "guard") && characters.includes(selected)) {
      this.drag = { kind: "character", character: selected, from: cell, moved: false, click: world };
      return;
    }
    this.selectNext(cell, world);
  }

  // The characters drawn under the pointer, the one in front first, then the ones
  // standing on the tile
  charactersAt(cell, world) {
    let state = this.state;
    let characters = [];
    for (let i = this.actors.length - 1; i >= 0; i--) {
      if (this.actors[i].getBounds().contains(world.x, world.y)) {
        characters.push(this.actors[i].character);
      }
    }
    for (let character of model.charactersAt(state.level, cell.room, cell.index)) {
      if (!characters.includes(character)) {
        characters.push(character);
      }
    }
    return characters;
  }

  selectNext(cell, world) {
    let state = this.state;
    let characters = this.charactersAt(cell, world);
    let selection = state.selection;
    let current = -1;
    if (selection && selection.kind === "prince") {
      current = characters.indexOf("prince");
    } else if (selection && selection.kind === "guard") {
      current = characters.indexOf(selection.guard);
    }
    let sameTile =
      selection && selection.kind === "tile" && selection.room === cell.room && selection.index === cell.index;
    let next = current + 1;
    if (characters.length && !sameTile && next < characters.length) {
      let character = characters[next];
      state.select(character === "prince" ? { kind: "prince" } : { kind: "guard", guard: character });
      this.drag = { kind: "character", character, from: cell, moved: false };
    } else {
      state.select({ kind: "tile", room: cell.room, index: cell.index });
    }
  }

  paint(cell) {
    let brush = this.state.brush;
    this.state.strokeChange((level) => model.setTile(level, cell.room, cell.index, brush.element, brush.modifier));
  }

  onPointerMove(pointer) {
    let cell = this.cellAt(this.toWorld(pointer.x, pointer.y));

    if (this.pan) {
      let camera = this.cameras.main;
      let dx = pointer.x - this.pan.x;
      let dy = pointer.y - this.pan.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        this.pan.moved = true;
      }
      camera.scrollX -= dx / camera.zoom;
      camera.scrollY -= dy / camera.zoom;
      this.pan.x = pointer.x;
      this.pan.y = pointer.y;
    }

    this.state.setHover(cell.room === -1 && this.state.tool !== "rooms" ? null : cell);

    if (this.painting && pointer.leftButtonDown() && cell.room !== -1) {
      this.paint(cell);
    }
    if (
      this.drag &&
      (cell.gx !== this.drag.from.gx || cell.gy !== this.drag.from.gy || cell.index !== this.drag.from.index)
    ) {
      this.drag.moved = true;
      this.drawOverlay();
    }
  }

  onPointerUp(pointer) {
    let cell = this.cellAt(this.toWorld(pointer.x, pointer.y));
    let state = this.state;

    if (this.pan) {
      // A right click without dragging picks the tile under the pointer as the brush
      if (this.pan.right && !this.pan.moved && this.pan.cell.room !== -1) {
        let tile = model.getTile(state.level, this.pan.cell.room, this.pan.cell.index);
        state.setBrush(tile.element, tile.modifier);
      }
      this.pan = null;
    }

    if (this.painting) {
      this.painting = false;
      state.endStroke();
    }

    let drag = this.drag;
    this.drag = null;
    // A click on the selected character selects the next thing there
    if (drag && !drag.moved && drag.click) {
      this.selectNext(drag.from, drag.click);
    }
    if (drag && drag.moved) {
      if (drag.kind === "character" && cell.room !== -1) {
        state.change((level) => {
          let character = drag.character === "prince" ? level.prince : level.guards[drag.character];
          character.room = cell.room;
          character.location = cell.index;
        });
      } else if (drag.kind === "room") {
        state.change((level) => model.moveRoom(level, drag.room, cell.gx, cell.gy));
      }
      this.drawOverlay();
    }
  }
}

function isTyping(event) {
  let target = event.target;
  return target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA");
}

// Renders a picture of each palette entry with the game's tiles: { "element:modifier": dataURL }
export function renderThumbnails(scene, type, entries) {
  const WIDTH = 56;
  const HEIGHT = 79;
  let key = "editor-thumbnails";
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  let texture = scene.textures.addDynamicTexture(key, WIDTH * entries.length, HEIGHT);

  // A room of empty tiles to build each tile in, like LevelBuilder does
  let builder = new PrinceJS.LevelBuilder(scene, { fireEvent() {}, floorStartFall() {}, floorStopFall() {} });
  builder.type = type;
  builder.width = 1;
  builder.height = 1;
  builder.layout = [[1]];
  builder.generateWallPattern(1);

  let objects = [];
  entries.forEach((entry, i) => {
    let tiles = model.newRoomTiles().map(() => ({ element: PrinceJS.Level.TILE_SPACE, modifier: 0 }));
    tiles[11] = { element: entry.element, modifier: entry.modifier };
    builder.level = { rooms: { 1: { x: 0, y: 0, tiles: tiles } }, addTrob() {}, activateChopper() {} };
    let tile = builder.buildTile(1, 1, 1, 0);
    if (tile instanceof PrinceJS.Tile.Mirror) {
      tile.addObject();
    }
    texture.draw(tile.back, i * WIDTH, 0);
    texture.draw(tile.front, i * WIDTH, 0);
    objects.push(tile);
  });
  texture.render();

  return new Promise((resolve) => {
    texture.snapshot((image) => {
      let result = {};
      entries.forEach((entry, i) => {
        let canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        canvas.getContext("2d").drawImage(image, i * WIDTH, 0, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT);
        result[entry.element + ":" + entry.modifier] = canvas.toDataURL();
      });
      objects.forEach((tile) => tile.destroy());
      resolve(result);
    });
  });
}
