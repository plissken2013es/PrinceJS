import Phaser from "phaser";
import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile = {};

// A tile is drawn in two parts: "back" behind the actors and "front" in front of them.
// Each part is a container holding the tile sprite plus any decoration added on top.
PrinceJS.Tile.Base = function (scene, element, modifier, type) {
  this.scene = scene;

  this.element = element;
  this.modifier = modifier;

  this.type = type;

  this.key = type === PrinceJS.Level.TYPE_DUNGEON ? "dungeon" : "palace";

  this.backSprite = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_" + element);
  this.back = new Phaser.GameObjects.Container(this.scene, 0, 0, [this.backSprite]);
  this.frontSprite = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_" + element + "_fg");
  this.front = new Phaser.GameObjects.Container(this.scene, 0, 0, [this.frontSprite]);

  this.room;
  this.roomX;
  this.roomY;

  this.frame = null;
  this.debris = false;
};

PrinceJS.Tile.Base.prototype = {
  toggleMask: function () {
    if (this.frame != null) {
      PrinceJS.Utils.crop(this.frontSprite, null);
      this.frontSprite.setFrame(this.frame);
      this.frame = null;
    } else {
      this.frame = this.frontSprite.frame.name;
      this.frontSprite.setFrame(this.backSprite.frame.name);
      PrinceJS.Utils.crop(this.frontSprite, { x: 0, y: 0, width: 33, height: this.frontSprite.height });
    }
  },

  isWalkable: function () {
    return (
      this.element !== PrinceJS.Level.TILE_WALL &&
      this.element !== PrinceJS.Level.TILE_SPACE &&
      this.element !== PrinceJS.Level.TILE_TOP_BIG_PILLAR &&
      this.element !== PrinceJS.Level.TILE_TAPESTRY_TOP &&
      this.element !== PrinceJS.Level.TILE_LATTICE_SUPPORT &&
      this.element !== PrinceJS.Level.TILE_SMALL_LATTICE &&
      this.element !== PrinceJS.Level.TILE_LATTICE_LEFT &&
      this.element !== PrinceJS.Level.TILE_LATTICE_RIGHT
    );
  },

  isSafeWalkable: function () {
    return this.isWalkable() && !this.isDangerousWalkable();
  },

  isDangerousWalkable: function () {
    return (
      this.element === PrinceJS.Level.TILE_LOOSE_BOARD ||
      this.element === PrinceJS.Level.TILE_SPIKES ||
      this.element === PrinceJS.Level.TILE_CHOPPER
    );
  },

  isSpace: function () {
    return (
      this.element === PrinceJS.Level.TILE_SPACE ||
      this.element === PrinceJS.Level.TILE_TOP_BIG_PILLAR ||
      this.element === PrinceJS.Level.TILE_TAPESTRY_TOP ||
      this.element === PrinceJS.Level.TILE_LATTICE_SUPPORT ||
      this.element === PrinceJS.Level.TILE_SMALL_LATTICE ||
      this.element === PrinceJS.Level.TILE_LATTICE_LEFT ||
      this.element === PrinceJS.Level.TILE_LATTICE_RIGHT
    );
  },

  isBarrier: function () {
    return (
      this.element === PrinceJS.Level.TILE_WALL ||
      this.element === PrinceJS.Level.TILE_GATE ||
      this.element === PrinceJS.Level.TILE_MIRROR ||
      this.element === PrinceJS.Level.TILE_TAPESTRY ||
      this.element === PrinceJS.Level.TILE_TAPESTRY_TOP
    );
  },

  isBarrierLeft: function () {
    return this.element === PrinceJS.Level.TILE_WALL || this.element === PrinceJS.Level.TILE_MIRROR;
  },

  isBarrierRight: function () {
    return (
      this.element === PrinceJS.Level.TILE_GATE ||
      this.element === PrinceJS.Level.TILE_TAPESTRY ||
      this.element === PrinceJS.Level.TILE_TAPESTRY_TOP
    );
  },

  isExitDoor: function () {
    return this.element === PrinceJS.Level.TILE_EXIT_LEFT || this.element === PrinceJS.Level.TILE_EXIT_RIGHT;
  },

  destroy: function () {
    this.back.destroy();
    this.front.destroy();
  },

  getBounds: function () {
    let bounds = new Phaser.Geom.Rectangle(0, 0, 0, 0);

    bounds.height = 63;
    bounds.width = 4;
    bounds.x = this.roomX * 32 + 40;
    bounds.y = this.roomY * 63;

    return bounds;
  },

  getBoundsAbs: function () {
    return new Phaser.Geom.Rectangle(this.x, this.y, this.width, 63);
  },

  intersects: function (bounds) {
    return PrinceJS.Utils.intersects(this.getBounds(), bounds);
  },

  intersectsAbs: function (boundsAbs) {
    return PrinceJS.Utils.intersects(this.getBoundsAbs(), boundsAbs);
  },

  addDebris: function () {
    this.scene.sound.play("LooseFloorLands");

    if (this.debris) {
      return;
    }
    this.debris = true;

    if (this.element === PrinceJS.Level.TILE_LOOSE_BOARD) {
      this.sweep();
      return;
    }

    if (this.element === PrinceJS.Level.TILE_TORCH) {
      this.debrisElement = PrinceJS.Level.TILE_TORCH_WITH_DEBRIS;
    } else if (this.element === PrinceJS.Level.TILE_FLOOR) {
      this.debrisElement = PrinceJS.Level.TILE_DEBRIS;
    } else {
      this.debrisElement = PrinceJS.Level.TILE_DEBRIS_ONLY;
    }

    this.debrisBack = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_" + this.debrisElement);
    this.back.add(this.debrisBack);
    this.debrisFront = PrinceJS.Utils.image(
      this.scene,
      0,
      0,
      this.key,
      this.key + "_" + PrinceJS.Level.TILE_DEBRIS + "_fg"
    );
    this.front.add(this.debrisFront);
  },

  revalidate: function () {
    this.backSprite.setFrame(this.key + "_" + this.element);
    this.frontSprite.setFrame(this.key + "_" + this.element + "_fg");
  }
};

PrinceJS.Tile.Base.prototype.constructor = PrinceJS.Tile.Base;

Object.defineProperty(PrinceJS.Tile.Base.prototype, "x", {
  get: function () {
    return this.back.x;
  },

  set: function (value) {
    this.back.x = value;
    this.front.x = value;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "y", {
  get: function () {
    return this.back.y;
  },

  set: function (value) {
    this.back.y = value;
    this.front.y = value;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "centerX", {
  get: function () {
    return this.back.x + this.backSprite.width * 0.5;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "centerY", {
  get: function () {
    return this.back.y + this.backSprite.height * 0.5;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "width", {
  get: function () {
    return this.backSprite.width;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "height", {
  get: function () {
    return this.backSprite.height;
  }
});
