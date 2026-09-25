import Phaser from "phaser";
import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Gate = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_GATE, modifier, type);

  this.posY = -modifier * 46;

  this.tileChildBack = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_gate");
  PrinceJS.Utils.crop(this.tileChildBack, {
    x: 0,
    y: -this.posY,
    width: PrinceJS.Utils.width(this.tileChildBack),
    height: PrinceJS.Utils.height(this.tileChildBack) + this.posY
  });
  this.back.add(this.tileChildBack);

  this.tileChildFront = PrinceJS.Utils.image(this.scene, 32, 16, this.key, this.key + "_gate_fg");
  PrinceJS.Utils.crop(this.tileChildFront, {
    x: 0,
    y: -this.posY,
    width: PrinceJS.Utils.width(this.tileChildFront),
    height: PrinceJS.Utils.height(this.tileChildFront) + this.posY
  });
  this.front.add(this.tileChildFront);

  this.state = modifier;
  this.step = 0;

  this.setCanMute(true);
};

PrinceJS.Tile.Gate.STATE_CLOSED = 0;
PrinceJS.Tile.Gate.STATE_OPEN = 1;
PrinceJS.Tile.Gate.STATE_RAISING = 2;
PrinceJS.Tile.Gate.STATE_DROPPING = 3;
PrinceJS.Tile.Gate.STATE_FAST_DROPPING = 4;
PrinceJS.Tile.Gate.STATE_WAITING = 5;

PrinceJS.Tile.Gate.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Gate.prototype.constructor = PrinceJS.Tile.Gate;

let syncSoundGatesRaise = new Set();
let syncSoundGatesDrop = new Set();

PrinceJS.Tile.Gate.reset = function () {
  syncSoundGatesRaise.clear();
  syncSoundGatesDrop.clear();
};

PrinceJS.Tile.Gate.prototype.update = function () {
  let gateBack = this.tileChildBack;
  let gateFront = this.tileChildFront;
  let closeSound;

  switch (this.state) {
    case PrinceJS.Tile.Gate.STATE_CLOSED:
    case PrinceJS.Tile.Gate.STATE_OPEN:
      syncSoundGatesRaise.delete(this);
      syncSoundGatesDrop.delete(this);
      break;

    case PrinceJS.Tile.Gate.STATE_RAISING:
      if (this.posY === -47) {
        this.state = PrinceJS.Tile.Gate.STATE_WAITING;
        this.step = 0;
        if (this.soundActive) {
          this.scene.sound.play("GateStopsAtTop");
        }
      } else {
        this.posY -= 1;
        PrinceJS.Utils.crop(gateBack, {
          x: 0,
          y: -this.posY,
          width: PrinceJS.Utils.width(gateBack),
          height: PrinceJS.Utils.height(gateBack)
        });
        PrinceJS.Utils.crop(gateFront, {
          x: 0,
          y: -this.posY,
          width: PrinceJS.Utils.width(gateFront),
          height: PrinceJS.Utils.height(gateFront)
        });
        if (this.posY % 2 === 0) {
          if (
            this.soundActive &&
            (syncSoundGatesRaise.size === 0 || syncSoundGatesRaise.values().next().value === this)
          ) {
            this.scene.sound.play("GateRising");
            syncSoundGatesRaise.add(this);
          }
        }
      }
      break;

    case PrinceJS.Tile.Gate.STATE_WAITING:
      syncSoundGatesRaise.delete(this);
      syncSoundGatesDrop.delete(this);
      this.step++;
      if (this.step === 50) {
        this.state = PrinceJS.Tile.Gate.STATE_DROPPING;
        this.step = 0;
      }
      break;

    case PrinceJS.Tile.Gate.STATE_DROPPING:
      if (!this.step) {
        this.posY += 1;
        PrinceJS.Utils.crop(gateBack, {
          x: 0,
          y: -this.posY,
          width: PrinceJS.Utils.width(gateBack),
          height: PrinceJS.Utils.height(gateBack) + 1
        });
        PrinceJS.Utils.crop(gateFront, {
          x: 0,
          y: -this.posY,
          width: PrinceJS.Utils.width(gateFront),
          height: PrinceJS.Utils.height(gateFront) + 1
        });
        if (this.posY >= 0) {
          this.posY = 0;
          PrinceJS.Utils.crop(gateBack, null);
          PrinceJS.Utils.crop(gateFront, null);
          this.state = PrinceJS.Tile.Gate.STATE_CLOSED;
          if (this.soundActive) {
            this.scene.sound.play("GateStopsAtTop");
          }
        } else {
          if (
            this.soundActive &&
            (syncSoundGatesDrop.size === 0 || syncSoundGatesDrop.values().next().value === this)
          ) {
            this.scene.sound.play("GateComingDownSlow");
            syncSoundGatesDrop.add(this);
          }
        }
        this.step++;
      } else {
        this.step = (this.step + 1) % 4;
      }
      break;

    case PrinceJS.Tile.Gate.STATE_FAST_DROPPING:
      closeSound = this.posY < -1;
      this.posY += 10;
      PrinceJS.Utils.crop(gateBack, {
        x: 0,
        y: -this.posY,
        width: PrinceJS.Utils.width(gateBack),
        height: PrinceJS.Utils.height(gateBack) + 10
      });
      PrinceJS.Utils.crop(gateFront, {
        x: 0,
        y: -this.posY,
        width: PrinceJS.Utils.width(gateFront),
        height: PrinceJS.Utils.height(gateFront) + 10
      });
      if (this.posY >= 0) {
        this.posY = 0;
        PrinceJS.Utils.crop(gateBack, null);
        PrinceJS.Utils.crop(gateBack, null);
        PrinceJS.Utils.crop(gateFront, null);
        this.state = PrinceJS.Tile.Gate.STATE_CLOSED;
        if (closeSound) {
          this.scene.sound.play("GateReachesBottomClang");
        }
      }
      break;
  }
};

PrinceJS.Tile.Gate.prototype.raise = function () {
  this.step = 0;
  if (
    this.state !== PrinceJS.Tile.Gate.STATE_WAITING &&
    this.state !== PrinceJS.Tile.Gate.STATE_FAST_DROPPING &&
    this.state !== PrinceJS.Tile.Gate.STATE_RAISING
  ) {
    this.state = PrinceJS.Tile.Gate.STATE_RAISING;
  }
};

PrinceJS.Tile.Gate.prototype.drop = function () {
  if (this.state !== PrinceJS.Tile.Gate.STATE_FAST_DROPPING) {
    this.state = PrinceJS.Tile.Gate.STATE_FAST_DROPPING;
  }
};

PrinceJS.Tile.Gate.prototype.getBounds = function () {
  let bounds = new Phaser.Geom.Rectangle(0, 0, 0, 0);

  bounds.height = 63 - 10 + this.posY - 4;
  bounds.width = 4;
  bounds.x = this.roomX * 32 + 40;
  bounds.y = this.roomY * 63;

  return bounds;
};

PrinceJS.Tile.Gate.prototype.getBoundsAbs = function () {
  return new Phaser.Geom.Rectangle(this.x, this.y, this.width, 63 + this.posY);
};

PrinceJS.Tile.Gate.prototype.canCross = function (height) {
  return Math.abs(this.posY) > height;
};

PrinceJS.Tile.Gate.prototype.isVisible = function (visible) {
  if (this.canMute && this.soundActive !== visible) {
    this.soundActive = visible;
    if (!this.soundActive) {
      syncSoundGatesRaise.delete(this);
      syncSoundGatesDrop.delete(this);
    }
  }
};

PrinceJS.Tile.Gate.prototype.setCanMute = function (canMute) {
  this.canMute = canMute;
  this.soundActive = !this.canMute;
};
