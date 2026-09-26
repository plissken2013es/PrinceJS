import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.LevelBuilder = function (scene, delegate) {
  this.scene = scene;
  this.delegate = delegate;

  this.height;
  this.width;
  this.type;

  this.layout = [];

  this.wallColor = ["#D8A858", "#E0A45C", "#E0A860", "#D8A054", "#E0A45C", "#D8A458", "#E0A858", "#D8A860"];
  this.wallPattern = [];

  this.seed;

  this.level;
};

PrinceJS.LevelBuilder.prototype = {
  buildFromJSON: function (json) {
    this.width = json.size.width;
    this.height = json.size.height;
    this.type = json.type;

    this.level = new PrinceJS.Level(this.scene, json.number, json.name, this.type);
    this.startRoomId = json.prince.room;

    let y, x, id, tile;
    for (y = 0; y < this.height; y++) {
      this.layout[y] = [];

      for (x = 0; x < this.width; x++) {
        let index = y * this.width + x;
        id = json.room[index].id;

        this.layout[y][x] = id;

        if (id !== -1) {
          if (this.type === PrinceJS.Level.TYPE_PALACE) {
            this.generateWallPattern(id);
          }

          this.level.rooms[id] = {};
          this.level.rooms[id].x = x;
          this.level.rooms[id].y = y;
          this.level.rooms[id].links = {};
          this.level.rooms[id].tiles = json.room[index].tile;
        }
      }
    }

    for (y = this.height - 1; y >= 0; y--) {
      for (x = 0; x < this.width; x++) {
        id = this.layout[y][x];

        if (id === -1) {
          continue;
        }

        this.level.rooms[id].links.left = this.getRoomId(x - 1, y);
        this.level.rooms[id].links.right = this.getRoomId(x + 1, y);
        this.level.rooms[id].links.up = this.getRoomId(x, y - 1);
        this.level.rooms[id].links.down = this.getRoomId(x, y + 1);

        if (this.level.rooms[id].links.left === -1) {
          for (let jj = 2; jj >= 0; jj--) {
            tile = new PrinceJS.Tile.Base(this.scene, PrinceJS.Level.TILE_WALL, 0, this.type);
            tile.backSprite.setFrame(tile.key + "_wall_0");
            this.level.addTile(-1, jj, id, tile);
          }
        }

        this.buildRoom(id, this.startRoomId);

        if (this.level.rooms[id].links.up === -1) {
          for (let ii = 0; ii < 10; ii++) {
            tile = new PrinceJS.Tile.Base(this.scene, PrinceJS.Level.TILE_FLOOR, 0, this.type);
            this.level.addTile(ii, -1, id, tile);
          }
        }
      }
    }

    this.level.events = json.events;

    return this.level;
  },

  buildRoom: function (id, startId) {
    for (let y = 2; y >= 0; y--) {
      for (let x = 0; x < 10; x++) {
        let tile = this.buildTile(x, y, id, startId);
        this.level.addTile(x, y, id, tile);
      }
    }
  },

  buildTile: function (x, y, id, startId) {
    let tileNumber = y * 10 + x;
    let t = this.level.rooms[id].tiles[tileNumber];

    let tile, tileChild, tileSeed, wallType, open;
    switch (t.element) {
      case PrinceJS.Level.TILE_WALL:
        tile = new PrinceJS.Tile.Base(this.scene, t.element, t.modifier, this.type);

        tileSeed = tileNumber + id;
        wallType = "";

        if (this.getTileAt(x - 1, y, id) === PrinceJS.Level.TILE_WALL) {
          wallType = "W";
        } else {
          wallType = "S";
        }

        wallType += "W";

        if (this.getTileAt(x + 1, y, id) === PrinceJS.Level.TILE_WALL) {
          wallType += "W";
        } else {
          wallType += "S";
        }

        if (this.type === PrinceJS.Level.TYPE_DUNGEON) {
          tile.frontSprite.setFrame(this.wallFrame(tile.key, wallType, tileSeed));
        } else {
          // Palace walls: colored bricks drawn instead of the wall sprite, then the wall pattern on top
          let bricks = new Phaser.GameObjects.Graphics(this.scene);
          let brick = (bx, by, width, height, index) => {
            let color = Phaser.Display.Color.HexStringToColor(this.wallColor[this.wallPattern[id][index]]);
            bricks.fillStyle(color.color);
            bricks.fillRect(bx, by, width, height);
          };
          brick(0, 16, 32, 20, y * 44 + x);
          brick(0, 36, 16, 21, y * 44 + 11 + x);
          brick(16, 36, 16, 21, y * 44 + 11 + x + 1);
          brick(0, 57, 8, 19, y * 44 + 2 * 11 + x);
          brick(8, 57, 24, 19, y * 44 + 2 * 11 + x + 1);
          brick(0, 76, 32, 3, y * 44 + 3 * 11 + x);
          tile.frontSprite.visible = false;
          tile.front.add(bricks);

          tileChild = PrinceJS.Utils.image(this.scene, 0, 16, tile.key, this.wallFrame(tile.key, "W", tileSeed));
          tile.front.add(tileChild);
        }

        if (wallType.charAt(2) === "S") {
          tile.backSprite.setFrame(tile.key + "_wall_" + t.modifier);
        }
        break;

      case PrinceJS.Level.TILE_SPACE:
      case PrinceJS.Level.TILE_FLOOR:
        tile = new PrinceJS.Tile.Base(this.scene, t.element, t.modifier, this.type);
        tileChild = PrinceJS.Utils.image(this.scene, 0, 0, tile.key, tile.key + "_" + t.element + "_" + t.modifier);
        tile.back.add(tileChild);
        break;

      case PrinceJS.Level.TILE_RAISE_BUTTON:
      case PrinceJS.Level.TILE_DROP_BUTTON:
        tile = new PrinceJS.Tile.Button(this.scene, t.element, t.modifier, this.type);
        tile.onPushed.add(this.delegate.fireEvent, this.delegate);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_TORCH:
      case PrinceJS.Level.TILE_TORCH_WITH_DEBRIS:
        tile = new PrinceJS.Tile.Torch(this.scene, t.element, t.modifier, this.type);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_POTION:
        tile = new PrinceJS.Tile.Potion(this.scene, t.modifier, this.type);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_SWORD:
        tile = new PrinceJS.Tile.Sword(this.scene, t.modifier, this.type);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_EXIT_RIGHT:
        open = id === startId;
        tile = new PrinceJS.Tile.ExitDoor(this.scene, t.modifier, this.type, open);
        this.level.addTrob(tile);
        if (open) {
          tile.drop();
        }
        break;

      case PrinceJS.Level.TILE_CHOPPER:
        tile = new PrinceJS.Tile.Chopper(this.scene, t.modifier, this.type);
        tile.onChopped.add(this.level.activateChopper, this.level);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_SPIKES:
        tile = new PrinceJS.Tile.Spikes(this.scene, t.modifier, this.type);
        if (t.modifier === 0) {
          this.level.addTrob(tile);
        }
        break;

      case PrinceJS.Level.TILE_LOOSE_BOARD:
        tile = new PrinceJS.Tile.Loose(this.scene, t.modifier, this.type);
        tile.onStartFalling.add(this.delegate.floorStartFall, this.delegate);
        tile.onStopFalling.add(this.delegate.floorStopFall, this.delegate);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_SKELETON:
        tile = new PrinceJS.Tile.Skeleton(this.scene, t.modifier, this.type);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_MIRROR:
        tile = new PrinceJS.Tile.Mirror(this.scene, t.modifier, this.type);
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_GATE:
        tile = new PrinceJS.Tile.Gate(this.scene, t.modifier, this.type);
        if (t.mute === false) {
          tile.setCanMute(false);
        }
        this.level.addTrob(tile);
        break;

      case PrinceJS.Level.TILE_TAPESTRY:
        tile = new PrinceJS.Tile.Base(this.scene, t.element, t.modifier, this.type);
        if (this.type === PrinceJS.Level.TYPE_PALACE && t.modifier > 0) {
          tile.backSprite.setFrame(tile.key + "_" + t.element + "_" + t.modifier);
          tile.frontSprite.setFrame(tile.backSprite.frame.name + "_fg");
        }
        break;

      case PrinceJS.Level.TILE_TAPESTRY_TOP:
        tile = new PrinceJS.Tile.Base(this.scene, t.element, t.modifier, this.type);
        if (this.type === PrinceJS.Level.TYPE_PALACE && t.modifier > 0) {
          tile.backSprite.setFrame(tile.key + "_" + t.element + "_" + t.modifier);
          tile.frontSprite.setFrame(tile.backSprite.frame.name + "_fg");

          if (this.getTileAt(x - 1, y, id) === PrinceJS.Level.TILE_LATTICE_SUPPORT) {
            tileChild = PrinceJS.Utils.image(
              this.scene,
              0,
              0,
              tile.key,
              tile.key + "_" + PrinceJS.Level.TILE_SMALL_LATTICE + "_fg"
            );
            tile.back.add(tileChild);
          }
        }
        break;

      case PrinceJS.Level.TILE_BALCONY_RIGHT:
        tile = new PrinceJS.Tile.Base(this.scene, t.element, t.modifier, this.type);
        tileChild = PrinceJS.Utils.image(this.scene, 0, -4, tile.key, tile.key + "_balcony");
        tile.back.add(tileChild);
        break;

      default:
        tile = new PrinceJS.Tile.Base(this.scene, t.element, t.modifier, this.type);
        break;
    }

    return tile;
  },

  // The atlases only have the wall patterns of the walls in the original levels:
  // a wall elsewhere (in an edited level) gets the next pattern there is
  wallFrame: function (key, prefix, seed) {
    let texture = this.scene.textures.get(key);
    for (let i = 0; i < 64; i++) {
      let name = prefix + "_" + (((seed + i - 1) % 64) + 1);
      if (texture.has(name)) {
        return name;
      }
    }
    return prefix + "_" + seed;
  },

  getTileAt: function (x, y, id) {
    let room = this.level.rooms[id];

    if (x < 0) {
      id = this.getRoomId(room.x - 1, room.y);
      x += 10;
    }
    if (x > 9) {
      id = this.getRoomId(room.x + 1, room.y);
      x -= 10;
    }
    if (y < 0) {
      room = this.getRoomId(room.x, room.y - 1);
      y += 3;
    }
    if (y > 2) {
      room = this.getRoomId(room.x, room.y + 1);
      y -= 3;
    }

    if (id === -1) {
      return PrinceJS.Level.TILE_WALL;
    }

    return this.level.rooms[id].tiles[x + y * 10].element;
  },

  getRoomId: function (x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1;
    }

    return this.layout[y][x];
  },

  generateWallPattern: function (room) {
    this.wallPattern[room] = [];
    this.seed = room;

    this.prandom(1);

    let color;

    for (let row = 0; row < 3; row++) {
      for (let subrow = 0; subrow < 4; subrow++) {
        let colorBase = subrow % 2 ? 0 : 4;
        let prevColor = -1;

        for (let col = 0; col <= 10; ++col) {
          do {
            color = colorBase + this.prandom(3);
          } while (color === prevColor);

          this.wallPattern[room][44 * row + 11 * subrow + col] = color;
          prevColor = color;
        }
      }
    }
  },

  prandom: function (max) {
    this.seed = ((this.seed * 214013 + 2531011) & 0xffffffff) >>> 0;
    return (this.seed >>> 16) % (max + 1);
  }
};

PrinceJS.LevelBuilder.prototype.constructor = PrinceJS.LevelBuilder;
