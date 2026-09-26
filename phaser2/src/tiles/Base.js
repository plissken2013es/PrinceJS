"use strict";

PrinceJS.Tile = {};

PrinceJS.Tile.Base = function (game, element, modifier, type) {
  this.game = game;

  this.element = element;
  this.modifier = modifier;

  this.type = type;

  this.key = type === PrinceJS.Level.TYPE_DUNGEON ? "dungeon" : "palace";

  this.back = this.game.make.sprite(0, 0, this.key, this.key + "_" + element);
  this.front = this.game.make.sprite(0, 0, this.key, this.key + "_" + element + "_fg");

  this.room;
  this.roomX;
  this.roomY;

  this.frame = null;
  this.debris = false;
};

PrinceJS.Tile.Base.prototype = {
  toggleMask: function () {
    if (this.frame != null) {
      this.front.frameName = this.frame;
      this.front.crop(null);
      this.frame = null;
    } else {
      this.frame = this.front.frameName;
      this.front.frameName = this.back.frameName;
      this.front.crop(new Phaser.Rectangle(0, 0, 33, this.front.height));
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
    let bounds = new Phaser.Rectangle(0, 0, 0, 0);

    bounds.height = 63;
    bounds.width = 4;
    bounds.x = this.roomX * 32 + 40;
    bounds.y = this.roomY * 63;

    return bounds;
  },

  getBoundsAbs: function () {
    return new Phaser.Rectangle(this.x, this.y, this.width, 63);
  },

  intersects: function (bounds) {
    return this.getBounds().intersects(bounds);
  },

  intersectsAbs: function (boundsAbs) {
    return this.getBoundsAbs().intersects(boundsAbs);
  },

  addDebris: function () {
    this.game.sound.play("LooseFloorLands");

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

    this.debrisBack = this.game.make.sprite(0, 0, this.key, this.key + "_" + this.debrisElement);
    this.back.addChild(this.debrisBack);
    this.debrisFront = this.game.make.sprite(0, 0, this.key, this.key + "_" + PrinceJS.Level.TILE_DEBRIS + "_fg");
    this.front.addChild(this.debrisFront);
  },

  revalidate: function () {
    this.back.frameName = this.key + "_" + this.element;
    this.front.frameName = this.key + "_" + this.element + "_fg";
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
    return this.back.centerX;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "centerY", {
  get: function () {
    return this.back.centerY;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "width", {
  get: function () {
    return this.back.width;
  }
});

Object.defineProperty(PrinceJS.Tile.Base.prototype, "height", {
  get: function () {
    return this.back.height;
  }
});
