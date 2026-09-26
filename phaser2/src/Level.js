"use strict";

PrinceJS.Level = function (game, number, name, type) {
  this.game = game;

  this.number = number;
  this.name = name;

  this.type = type;

  this.rooms = [];

  this.back = this.game.add.group();
  this.back.z = 10;

  this.front = this.game.add.group();
  this.front.z = 30;

  this.trobs = [];

  this.maskedTile = null;

  this.dummyWall = new PrinceJS.Tile.Base(this.game, PrinceJS.Level.TILE_WALL, 0, this.type);
};

PrinceJS.Level.TYPE_DUNGEON = 0;
PrinceJS.Level.TYPE_PALACE = 1;

PrinceJS.Level.TILE_SPACE = 0;
PrinceJS.Level.TILE_FLOOR = 1;
PrinceJS.Level.TILE_SPIKES = 2;
PrinceJS.Level.TILE_PILLAR = 3;
PrinceJS.Level.TILE_GATE = 4;
PrinceJS.Level.TILE_STUCK_BUTTON = 5;
PrinceJS.Level.TILE_DROP_BUTTON = 6;
PrinceJS.Level.TILE_TAPESTRY = 7;
PrinceJS.Level.TILE_BOTTOM_BIG_PILLAR = 8;
PrinceJS.Level.TILE_TOP_BIG_PILLAR = 9;
PrinceJS.Level.TILE_POTION = 10;
PrinceJS.Level.TILE_LOOSE_BOARD = 11;
PrinceJS.Level.TILE_TAPESTRY_TOP = 12;
PrinceJS.Level.TILE_MIRROR = 13;
PrinceJS.Level.TILE_DEBRIS = 14;
PrinceJS.Level.TILE_RAISE_BUTTON = 15;
PrinceJS.Level.TILE_EXIT_LEFT = 16;
PrinceJS.Level.TILE_EXIT_RIGHT = 17;
PrinceJS.Level.TILE_CHOPPER = 18;
PrinceJS.Level.TILE_TORCH = 19;
PrinceJS.Level.TILE_WALL = 20;
PrinceJS.Level.TILE_SKELETON = 21;
PrinceJS.Level.TILE_SWORD = 22;
PrinceJS.Level.TILE_BALCONY_LEFT = 23;
PrinceJS.Level.TILE_BALCONY_RIGHT = 24;
PrinceJS.Level.TILE_LATTICE_PILLAR = 25;
PrinceJS.Level.TILE_LATTICE_SUPPORT = 26;
PrinceJS.Level.TILE_SMALL_LATTICE = 27;
PrinceJS.Level.TILE_LATTICE_LEFT = 28;
PrinceJS.Level.TILE_LATTICE_RIGHT = 29;
PrinceJS.Level.TILE_TORCH_WITH_DEBRIS = 30;
PrinceJS.Level.TILE_DEBRIS_ONLY = 31;
PrinceJS.Level.TILE_NULL = 32;

PrinceJS.Level.POTION_RECOVER = 1;
PrinceJS.Level.POTION_ADD = 2;
PrinceJS.Level.POTION_BUFFER = 3;
PrinceJS.Level.POTION_FLIP = 4;
PrinceJS.Level.POTION_DAMAGE = 5;

PrinceJS.Level.FLASH_RED = 0xff0000;
PrinceJS.Level.FLASH_GREEN = 0x00ff00;
PrinceJS.Level.FLASH_YELLOW = 0xffff00;
PrinceJS.Level.FLASH_WHITE = 0xffffff;

PrinceJS.Level.prototype = {
  addTile: function (x, y, room, tile) {
    if (x >= 0 && y >= 0) {
      this.rooms[room].tiles[y * 10 + x] = tile;
      tile.roomX = x;
      tile.roomY = y;
      tile.room = room;
    }

    tile.x = this.rooms[room].x * PrinceJS.ROOM_WIDTH + x * PrinceJS.BLOCK_WIDTH;
    tile.y = this.rooms[room].y * PrinceJS.ROOM_HEIGHT + y * PrinceJS.BLOCK_HEIGHT - 13;

    this.back.add(tile.back);
    this.front.add(tile.front);

    this.exitDoorOpen = false;
  },

  addTrob: function (trob) {
    this.trobs.push(trob);
  },

  update: function () {
    let i = this.trobs.length;

    while (i--) {
      this.trobs[i].update();
    }
  },

  removeObject: function (x, y, room) {
    let tile = this.getTileAt(x, y, room);
    if (tile && tile.removeObject) {
      tile.removeObject();

      let idx = this.trobs.indexOf(tile);
      if (idx > -1) {
        this.trobs.splice(idx, 1);
      }
    }
  },

  getTileAt: function (x, y, room) {
    if (!this.rooms[room]) {
      return this.dummyWall;
    }

    let newRoom = room;

    if (x < 0) {
      newRoom = this.rooms[room].links.left;
      x += 10;
    }
    if (x > 9) {
      newRoom = this.rooms[room].links.right;
      x -= 10;
    }
    if (y < 0) {
      newRoom = this.rooms[room].links.up;
      y += 3;
    }
    if (y > 2) {
      newRoom = this.rooms[room].links.down;
      y -= 3;
    }

    if (newRoom === -1) {
      return this.dummyWall;
    }

    return this.rooms[newRoom].tiles[x + y * 10];
  },

  shakeFloor: function (y, room) {
    for (let x = 0; x < 10; x++) {
      let tile = this.getTileAt(x, y, room);

      if (tile.element === PrinceJS.Level.TILE_LOOSE_BOARD) {
        tile.shake(false);
      }
    }
  },

  unMaskTile: function () {
    if (this.maskedTile != null) {
      this.maskedTile.toggleMask();
      this.maskedTile = null;
    }
  },

  maskTile: function (x, y, room) {
    let tile = this.getTileAt(x, y, room);

    if (this.maskedTile === tile) {
      return;
    }
    if (this.maskedTile != null) {
      this.unMaskTile();
    }

    if (tile.isWalkable()) {
      this.maskedTile = tile;
      tile.toggleMask();
    }
  },

  floorStartFall: function (tile) {
    let space = new PrinceJS.Tile.Base(this.game, PrinceJS.Level.TILE_SPACE, 0, tile.type);
    if (tile.type === PrinceJS.Level.TYPE_PALACE) {
      space.back.frameName = tile.key + "_0_1";
    }
    this.addTile(tile.roomX, tile.roomY, tile.room, space);

    while (this.getTileAt(tile.roomX, tile.roomY, tile.room).element === PrinceJS.Level.TILE_SPACE) {
      tile.roomY++;
      if (tile.roomY === 3) {
        tile.roomY = 0;
        tile.room = this.rooms[tile.room].links.down;
      }

      tile.yTo += PrinceJS.BLOCK_HEIGHT;
    }
  },

  floorStopFall: function (tile) {
    let floor = this.getTileAt(tile.roomX, tile.roomY, tile.room);
    if (floor.element !== PrinceJS.Level.TILE_SPACE) {
      tile.destroy();
      floor.addDebris();
    } else {
      tile.sweep();
    }
  },

  fireEvent: function (event, type) {
    let room = this.events[event].room;
    let x = (this.events[event].location - 1) % 10;
    let y = Math.floor((this.events[event].location - 1) / 10);

    let tile = this.getTileAt(x, y, room);

    if (tile.element === PrinceJS.Level.TILE_EXIT_LEFT) {
      tile = this.getTileAt(x + 1, y, room);
    }

    if (type === PrinceJS.Level.TILE_RAISE_BUTTON) {
      tile.raise();
      if ([PrinceJS.Level.TILE_EXIT_LEFT, PrinceJS.Level.TILE_EXIT_RIGHT].includes(tile.element)) {
        this.exitDoorOpen = true;
      }
    } else {
      tile.drop();
    }

    if (this.events[event].next) {
      this.fireEvent(event + 1, type);
    }
  },

  activateChopper: function (x, y, room) {
    let tile;

    do {
      tile = this.getTileAt(++x, y, room);
    } while (x < 9 && tile.element !== PrinceJS.Level.TILE_CHOPPER);

    if (tile.element === PrinceJS.Level.TILE_CHOPPER) {
      tile.chop();
    }
  },

  checkGates: function (room, prevRoom) {
    let gates = this.getGatesAll(room, prevRoom);
    let prevGates = this.getGatesAll(prevRoom);
    prevGates.forEach((gate) => {
      if (!gates.includes(gate)) {
        gate.isVisible(false);
      }
    });
    gates.forEach((gate) => {
      gate.isVisible(true);
    });
  },

  getGatesAll: function (room, prevRoom) {
    let gates = [...this.getGates(room), ...this.getGatesLeft(room), ...this.getGatesRight(room)];
    if (prevRoom) {
      if (room && this.rooms[room]) {
        if (this.rooms[room].links.up === prevRoom) {
          gates.push(...this.getGatesUp(room));
        }
        if (this.rooms[room].links.down === prevRoom) {
          gates.push(...this.getGatesDown(room));
        }
      }
    } else {
      gates.push(...this.getGatesUp(room), ...this.getGatesDown(room));
    }
    return gates;
  },

  getGates: function (room, edge = false) {
    let gates = [];
    if (room && this.rooms[room]) {
      this.rooms[room].tiles.forEach((tile) => {
        if (tile.element === PrinceJS.Level.TILE_GATE) {
          if (!edge || tile.roomX === 9) {
            gates.push(tile);
          }
        }
      });
    }
    return gates;
  },

  getGatesLeft: function (room) {
    let gates = [];
    if (room && this.rooms[room]) {
      let roomLeft = this.rooms[room].links.left;
      if (roomLeft > 0) {
        gates.push(...this.getGates(roomLeft));
        let roomLeftLeft = this.rooms[roomLeft].links.left;
        if (roomLeftLeft > 0) {
          gates.push(...this.getGates(roomLeftLeft, true));
        }
      }
    }
    return gates;
  },

  getGatesRight: function (room) {
    let gates = [];
    if (room && this.rooms[room]) {
      let roomRight = this.rooms[room].links.right;
      if (roomRight > 0) {
        gates.push(...this.getGates(roomRight));
      }
    }
    return gates;
  },

  getGatesUp: function (room) {
    let gates = [];
    if (room && this.rooms[room]) {
      let roomUp = this.rooms[room].links.up;
      if (roomUp > 0) {
        gates.push(...this.getGates(roomUp));
        let roomUpLeft = this.rooms[roomUp].links.left;
        if (roomUpLeft > 0) {
          gates.push(...this.getGates(roomUpLeft, true));
        }
      }
    }
    return gates;
  },

  getGatesDown: function (room) {
    let gates = [];
    if (room && this.rooms[room]) {
      let roomDown = this.rooms[room].links.down;
      if (roomDown > 0) {
        gates.push(...this.getGates(roomDown));
        let roomDownLeft = this.rooms[roomDown].links.left;
        if (roomDownLeft > 0) {
          gates.push(...this.getGates(roomDownLeft, true));
        }
      }
    }
    return gates;
  }
};

PrinceJS.Level.prototype.constructor = PrinceJS.Level;
