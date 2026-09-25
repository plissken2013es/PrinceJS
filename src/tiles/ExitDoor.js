import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.ExitDoor = function (scene, modifier, type, open = false) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_EXIT_RIGHT, modifier, type);

  this.tileChildBack = PrinceJS.Utils.image(this.scene, 10, 12, this.key, this.key + "_door");
  this.back.add(this.tileChildBack);
  if (this.type === PrinceJS.Level.TYPE_PALACE) {
    this.tileChildBack.x -= 3;
  }

  this.tileChildFront = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_door_fg");
  this.front.add(this.tileChildFront);
  this.tileChildFront.visible = false;

  this.step = 0;

  this.open = open;

  this.heightOpen = 8 + this.type;
  this.heightClose = PrinceJS.Utils.height(this.tileChildBack);
  this.heightCrop = this.heightClose - this.heightOpen;
  this.initCrop();
};

PrinceJS.Tile.ExitDoor.STATE_OPEN = 0;
PrinceJS.Tile.ExitDoor.STATE_RAISING = 1;
PrinceJS.Tile.ExitDoor.STATE_DROPPING = 2;
PrinceJS.Tile.ExitDoor.STATE_CLOSED = 3;

PrinceJS.Tile.ExitDoor.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.ExitDoor.prototype.constructor = PrinceJS.Tile.ExitDoor;

PrinceJS.Tile.ExitDoor.prototype.update = function () {
  let door = this.tileChildBack;

  switch (this.state) {
    case PrinceJS.Tile.ExitDoor.STATE_RAISING:
      if (PrinceJS.Utils.height(door) === this.heightOpen) {
        this.open = true;
      } else {
        this.step++;
        PrinceJS.Utils.crop(door, {
          x: 0,
          y: this.step,
          width: PrinceJS.Utils.width(door),
          height: PrinceJS.Utils.height(door)
        });
      }
      break;

    case PrinceJS.Tile.ExitDoor.STATE_DROPPING:
      if (PrinceJS.Utils.height(door) === this.heightClose) {
        this.open = false;
      } else {
        this.step += 15;
        PrinceJS.Utils.crop(door, {
          x: 0,
          y: this.heightCrop - this.step,
          width: PrinceJS.Utils.width(door),
          height: PrinceJS.Utils.height(door) + this.step
        });
      }
      break;
  }
};

PrinceJS.Tile.ExitDoor.prototype.initCrop = function () {
  if (this.open) {
    let door = this.tileChildBack;
    PrinceJS.Utils.crop(door, {
      x: 0,
      y: this.heightCrop,
      width: PrinceJS.Utils.width(door),
      height: PrinceJS.Utils.height(door)
    });
  }
};

PrinceJS.Tile.ExitDoor.prototype.raise = function () {
  if (this.state === PrinceJS.Tile.ExitDoor.STATE_CLOSED) {
    this.state = PrinceJS.Tile.ExitDoor.STATE_RAISING;
    this.scene.sound.play("ExitDoorOpening");
  }
};

PrinceJS.Tile.ExitDoor.prototype.drop = function () {
  if (this.state !== PrinceJS.Tile.ExitDoor.STATE_CLOSED) {
    this.state = PrinceJS.Tile.ExitDoor.STATE_DROPPING;
    this.scene.sound.play("EntranceDoorCloses");
  }
};

PrinceJS.Tile.ExitDoor.prototype.mask = function () {
  this.tileChildFront.visible = true;
};

Object.defineProperty(PrinceJS.Tile.ExitDoor.prototype, "open", {
  get: function () {
    return this.state === PrinceJS.Tile.ExitDoor.STATE_OPEN;
  },

  set: function (value) {
    this.state = value ? PrinceJS.Tile.ExitDoor.STATE_OPEN : PrinceJS.Tile.ExitDoor.STATE_CLOSED;
    this.step = 0;
  }
});
