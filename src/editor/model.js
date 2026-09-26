// Operations on a level in the game's JSON format (public/assets/maps/levelN.json).
//
// A level is a grid of size.width x size.height cells, stored row by row in "room".
// A cell holds a room ({ id, tile }) or nothing ({ id: -1 }). Room ids start at 1.
// A room has 30 tiles, 10 per row, each { element, modifier } (see PrinceJS.Level.TILE_*).
// The prince and the guards stand on a tile of a room: location is the tile index (0-29).
//
// Buttons are linked to gates and exit doors through "events": the modifier of a button
// is the index of its first event, and each event opens or closes the tile at its
// location (1-30) and continues with the next event while its "next" flag is set.
// Several buttons may share the same events.

import PrinceJS from "../PrinceJS.js";
import "../Level.js";

export const ROOM_COLUMNS = 10;
export const ROOM_ROWS = 3;
export const ROOM_TILES = ROOM_COLUMNS * ROOM_ROWS;

// The original game has at most 24 rooms per level
export const MAX_ROOMS = 24;

// Events fired by the game's own level scripts (Game.checkLevelLogic), by level number
const SCRIPTED_EVENTS = { 1: [8] };

const T = PrinceJS.Level;

export const BUTTONS = [T.TILE_DROP_BUTTON, T.TILE_RAISE_BUTTON];
export const TARGETS = [T.TILE_GATE, T.TILE_EXIT_LEFT, T.TILE_EXIT_RIGHT];

export function clone(level) {
  return JSON.parse(JSON.stringify(level));
}

export function newRoomTiles() {
  let tiles = [];
  for (let i = 0; i < ROOM_TILES; i++) {
    tiles.push({ element: T.TILE_FLOOR, modifier: 0 });
  }
  return tiles;
}

export function newLevel(type = T.TYPE_DUNGEON, number = 1) {
  return {
    number: number,
    name: "New level",
    size: { width: 1, height: 1 },
    type: type,
    room: [{ id: 1, tile: newRoomTiles() }],
    guards: [],
    events: [],
    prince: { location: 22, room: 1, direction: 1, turn: false }
  };
}

// ---- Rooms ----

export function rooms(level) {
  return level.room.filter((cell) => cell.id !== -1);
}

export function getRoom(level, id) {
  return level.room.find((cell) => cell.id === id && id !== -1) || null;
}

export function roomAt(level, x, y) {
  if (x < 0 || y < 0 || x >= level.size.width || y >= level.size.height) {
    return -1;
  }
  return level.room[y * level.size.width + x].id;
}

export function roomPosition(level, id) {
  let index = level.room.findIndex((cell) => cell.id === id && id !== -1);
  if (index === -1) {
    return null;
  }
  return { x: index % level.size.width, y: Math.floor(index / level.size.width) };
}

export function nextRoomId(level) {
  let id = 1;
  while (getRoom(level, id)) {
    id++;
  }
  return id;
}

// Adds a room at a cell of the grid, which grows if the cell is just outside it.
// Returns the id of the new room, or -1 if the cell is not free.
export function addRoom(level, x, y, tiles = newRoomTiles()) {
  let { width, height } = level.size;
  if (x < -1 || y < -1 || x > width || y > height) {
    return -1;
  }
  resizeGrid(level, x < 0 ? 1 : 0, y < 0 ? 1 : 0, x >= width ? 1 : 0, y >= height ? 1 : 0);
  x = Math.max(x, 0);
  y = Math.max(y, 0);
  if (roomAt(level, x, y) !== -1) {
    return -1;
  }
  let id = nextRoomId(level);
  level.room[y * level.size.width + x] = { id: id, tile: tiles };
  return id;
}

// Removes a room, the guards in it and the grid rows and columns left empty at the borders
export function removeRoom(level, id) {
  let position = roomPosition(level, id);
  if (!position) {
    return;
  }
  let cell = level.room[position.y * level.size.width + position.x];
  level.room[position.y * level.size.width + position.x] = { id: -1 };
  level.guards = level.guards.filter((guard) => guard.room !== id);
  // The events of its buttons, highest first so that removing one does not move the others
  let starts = cell.tile.filter(isButton).map((tile) => tile.modifier);
  for (let start of [...new Set(starts)].sort((a, b) => b - a)) {
    dropUnusedEvents(level, start);
  }
  trimGrid(level);
}

// Moves a room to a free cell of the grid (or just outside it)
export function moveRoom(level, id, x, y) {
  let room = getRoom(level, id);
  if (!room) {
    return false;
  }
  let { width, height } = level.size;
  if (x < -1 || y < -1 || x > width || y > height || roomAt(level, x, y) !== -1) {
    return false;
  }
  let position = roomPosition(level, id);
  level.room[position.y * width + position.x] = { id: -1 };
  resizeGrid(level, x < 0 ? 1 : 0, y < 0 ? 1 : 0, x >= width ? 1 : 0, y >= height ? 1 : 0);
  x = Math.max(x, 0);
  y = Math.max(y, 0);
  level.room[y * level.size.width + x] = room;
  trimGrid(level);
  return true;
}

// Adds empty cells around the grid
export function resizeGrid(level, left, top, right, bottom) {
  let { width, height } = level.size;
  let newWidth = width + left + right;
  let newHeight = height + top + bottom;
  let cells = [];
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      let oldX = x - left;
      let oldY = y - top;
      if (oldX >= 0 && oldY >= 0 && oldX < width && oldY < height) {
        cells.push(level.room[oldY * width + oldX]);
      } else {
        cells.push({ id: -1 });
      }
    }
  }
  level.room = cells;
  level.size = { width: newWidth, height: newHeight };
}

// Removes the empty rows and columns at the borders of the grid
export function trimGrid(level) {
  let used = rooms(level).map((cell) => roomPosition(level, cell.id));
  if (!used.length) {
    return;
  }
  let minX = Math.min(...used.map((p) => p.x));
  let minY = Math.min(...used.map((p) => p.y));
  let maxX = Math.max(...used.map((p) => p.x));
  let maxY = Math.max(...used.map((p) => p.y));
  resizeGrid(level, -minX, -minY, maxX + 1 - level.size.width, maxY + 1 - level.size.height);
}

// ---- Tiles ----

export function getTile(level, id, index) {
  let room = getRoom(level, id);
  return room ? room.tile[index] : null;
}

// The tile at a position relative to a room, following its neighbours like the game does
export function neighbourTile(level, id, x, y) {
  let position = roomPosition(level, id);
  if (!position) {
    return null;
  }
  let roomX = position.x + Math.floor(x / ROOM_COLUMNS);
  let roomY = position.y + Math.floor(y / ROOM_ROWS);
  let other = roomAt(level, roomX, roomY);
  if (other === -1) {
    return null;
  }
  x = ((x % ROOM_COLUMNS) + ROOM_COLUMNS) % ROOM_COLUMNS;
  y = ((y % ROOM_ROWS) + ROOM_ROWS) % ROOM_ROWS;
  return { room: other, index: y * ROOM_COLUMNS + x, tile: getTile(level, other, y * ROOM_COLUMNS + x) };
}

// Replaces a tile. Returns false if nothing changed.
export function setTile(level, id, index, element, modifier) {
  let room = getRoom(level, id);
  if (!room) {
    return false;
  }
  let tile = room.tile[index];
  if (tile.element === element && tile.modifier === modifier) {
    return false;
  }
  room.tile[index] = { element: element, modifier: modifier };
  if (tile.element === element && tile.mute !== undefined) {
    room.tile[index].mute = tile.mute;
  }
  if (isButton(tile)) {
    dropUnusedEvents(level, tile.modifier);
  }
  return true;
}

export function setModifier(level, id, index, modifier) {
  let tile = getTile(level, id, index);
  if (tile) {
    tile.modifier = modifier;
  }
}

// ---- Buttons and events ----

export function isButton(tile) {
  return !!tile && BUTTONS.includes(tile.element);
}

export function isTarget(tile) {
  return !!tile && TARGETS.includes(tile.element);
}

// All the buttons of the level: { room, index, tile }
export function buttons(level) {
  let list = [];
  for (let room of rooms(level)) {
    room.tile.forEach((tile, index) => {
      if (isButton(tile)) {
        list.push({ room: room.id, index: index, tile: tile });
      }
    });
  }
  return list;
}

// The events fired from an event index, in order: [{ event, room, index }]
export function chain(level, start) {
  let list = [];
  let i = start;
  while (i >= 0 && level.events[i]) {
    let event = level.events[i];
    list.push({ event: i, room: event.room, index: event.location - 1 });
    if (!event.next) {
      break;
    }
    i++;
  }
  return list;
}

// The tiles a button opens or closes: [{ room, index }]
export function buttonTargets(level, button) {
  return chain(level, button.modifier).map((step) => ({ room: step.room, index: step.index }));
}

// The buttons sharing the events of a button (including itself)
export function sharingButtons(level, button) {
  return buttons(level).filter((other) => other.tile.modifier === button.modifier && button.modifier >= 0);
}

// The buttons that open or close a tile
export function buttonsFor(level, id, index) {
  let targets = targetAliases(level, id, index);
  return buttons(level).filter((button) =>
    buttonTargets(level, button.tile).some((target) =>
      targets.some((alias) => alias.room === target.room && alias.index === target.index)
    )
  );
}

// The two halves of an exit door are the same target
function targetAliases(level, id, index) {
  let aliases = [{ room: id, index: index }];
  let tile = getTile(level, id, index);
  if (tile && tile.element === T.TILE_EXIT_RIGHT && index % ROOM_COLUMNS > 0) {
    let left = getTile(level, id, index - 1);
    if (left && left.element === T.TILE_EXIT_LEFT) {
      aliases.push({ room: id, index: index - 1 });
    }
  }
  if (tile && tile.element === T.TILE_EXIT_LEFT && index % ROOM_COLUMNS < ROOM_COLUMNS - 1) {
    aliases.push({ room: id, index: index + 1 });
  }
  return aliases;
}

// The tile an event should point to: the left half of an exit door, like the original levels
export function normalizeTarget(level, id, index) {
  let tile = getTile(level, id, index);
  if (tile && tile.element === T.TILE_EXIT_RIGHT && index % ROOM_COLUMNS > 0) {
    let left = getTile(level, id, index - 1);
    if (left && left.element === T.TILE_EXIT_LEFT) {
      return { room: id, index: index - 1 };
    }
  }
  return { room: id, index: index };
}

// Sets the tiles a button (and the buttons sharing its events) opens or closes.
// The events are written anew at the end of the list, so that the events of other
// buttons, which may overlap them, are never changed.
export function setButtonTargets(level, id, index, targets) {
  let tile = getTile(level, id, index);
  if (!isButton(tile)) {
    return;
  }
  let sharing = sharingButtons(level, tile);
  if (!sharing.length) {
    sharing = [{ room: id, index: index, tile: tile }];
  }
  removeEvents(level, tile.modifier);

  let start = -1;
  if (targets.length) {
    start = level.events.length;
    targets.forEach((target, i) => {
      level.events.push({
        number: start + i + 1,
        room: target.room,
        location: target.index + 1,
        next: i < targets.length - 1 ? 1 : 0
      });
    });
  }
  for (let button of sharing) {
    button.tile.modifier = start;
  }
  trimEvents(level);
}

// Removes the events fired from an event index, if nothing else fires them, and
// renumbers the ones after them
function removeEvents(level, start) {
  let events = chain(level, start).map((step) => step.event);
  if (!events.length) {
    return;
  }
  let scripted = SCRIPTED_EVENTS[level.number] || [];
  let others = new Set(scripted);
  for (let button of buttons(level)) {
    if (button.tile.modifier !== start) {
      chain(level, button.tile.modifier).forEach((step) => others.add(step.event));
    }
  }
  // Scripts fire events by index: the ones after the removed events would move
  let moved = scripted.some((event) => event >= start && event < level.events.length);
  if (events.some((event) => others.has(event)) || moved) {
    return;
  }
  level.events.splice(start, events.length);
  level.events.forEach((event, i) => {
    if (event) {
      event.number = i + 1;
    }
  });
  for (let button of buttons(level)) {
    if (button.tile.modifier > start) {
      button.tile.modifier -= events.length;
    }
  }
}

// Links a button to the events of another one
export function shareButtonTargets(level, id, index, other) {
  let tile = getTile(level, id, index);
  if (isButton(tile) && isButton(other)) {
    let old = tile.modifier;
    tile.modifier = other.modifier;
    dropUnusedEvents(level, old);
  }
}

// Removes the events of a button that is gone or linked elsewhere, if no button fires them
function dropUnusedEvents(level, start) {
  if (start >= 0 && !buttons(level).some((button) => button.tile.modifier === start)) {
    removeEvents(level, start);
  }
  trimEvents(level);
}

// Removes the events at the end of the list that nothing fires anymore
export function trimEvents(level) {
  let used = new Set(SCRIPTED_EVENTS[level.number] || []);
  for (let button of buttons(level)) {
    for (let step of chain(level, button.tile.modifier)) {
      used.add(step.event);
    }
  }
  while (level.events.length && !used.has(level.events.length - 1)) {
    level.events.pop();
  }
}

// ---- Characters ----

export const GUARD_TYPES = ["guard", "fatguard", "skeleton", "shadow", "jaffar"];

export function newGuard(room, location, direction = -1) {
  return { room: room, location: location, skill: 1, colors: 1, type: "guard", direction: direction };
}

// The direction the prince faces once the level has started (he turns around unless turn is false)
export function princeFacing(prince) {
  return prince.turn === false ? prince.direction : -prince.direction;
}

export function setPrinceFacing(prince, facing) {
  prince.direction = prince.turn === false ? facing : -facing;
}

export function setPrinceTurn(prince, turn) {
  let facing = princeFacing(prince);
  if (turn) {
    delete prince.turn;
  } else {
    prince.turn = false;
  }
  setPrinceFacing(prince, facing);
}

// The characters standing on a tile: "prince" and guard indexes
export function charactersAt(level, id, index) {
  let list = [];
  if (level.prince.room === id && level.prince.location === index) {
    list.push("prince");
  }
  level.guards.forEach((guard, i) => {
    if (guard.room === id && guard.location === index) {
      list.push(i);
    }
  });
  return list;
}

// ---- Checks ----

const WALKABLE_EXCLUDED = [
  T.TILE_SPACE,
  T.TILE_WALL,
  T.TILE_TOP_BIG_PILLAR,
  T.TILE_TAPESTRY_TOP,
  T.TILE_LATTICE_SUPPORT,
  T.TILE_SMALL_LATTICE,
  T.TILE_LATTICE_LEFT,
  T.TILE_LATTICE_RIGHT
];

// Problems that would make the level misbehave, and things worth knowing:
// [{ message, room, index, info }]
export function check(level) {
  let problems = [];
  let add = (message, room, index) => problems.push({ message, room, index, info: false });
  let info = (message, room, index) => problems.push({ message, room, index, info: true });

  let prince = level.prince;
  if (!getRoom(level, prince.room)) {
    add("The prince starts in a room that does not exist");
  } else {
    let tile = getTile(level, prince.room, prince.location);
    if (WALKABLE_EXCLUDED.includes(tile.element)) {
      info("The prince starts in the air: he falls as the level starts", prince.room, prince.location);
    }
  }
  if (prince.cameraRoom && !getRoom(level, prince.cameraRoom)) {
    add("The camera starts in a room that does not exist");
  }

  level.guards.forEach((guard, i) => {
    if (!getRoom(level, guard.room)) {
      add(`Guard ${i + 1} is in a room that does not exist`);
    }
    if (guard.type === "guard" && !(guard.colors >= 1 && guard.colors <= 7)) {
      add(`Guard ${i + 1} needs colors from 1 to 7`, guard.room, guard.location);
    }
  });

  let exits = 0;
  for (let room of rooms(level)) {
    room.tile.forEach((tile, index) => {
      if (isButton(tile)) {
        let targets = buttonTargets(level, tile);
        if (!targets.length) {
          add("A button is not linked to any gate or door", room.id, index);
        }
        for (let target of targets) {
          if (!isTarget(getTile(level, target.room, target.index))) {
            add("A button is linked to a tile that is not a gate or a door", room.id, index);
            break;
          }
        }
      }
      if (tile.element === T.TILE_EXIT_RIGHT) {
        exits++;
      }
      if (tile.element === T.TILE_EXIT_LEFT) {
        let right = index % ROOM_COLUMNS < ROOM_COLUMNS - 1 ? room.tile[index + 1] : null;
        if (!right || right.element !== T.TILE_EXIT_RIGHT) {
          add("The left half of an exit door needs the right half next to it", room.id, index);
        }
      }
    });
  }
  if (!exits) {
    info("The level has no exit door");
  }

  if (rooms(level).length > MAX_ROOMS) {
    info(`The level has more than ${MAX_ROOMS} rooms, the limit of the original game`);
  }
  return problems;
}
