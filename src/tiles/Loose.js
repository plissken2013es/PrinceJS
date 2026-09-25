import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Loose = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_LOOSE_BOARD, modifier, type);

  this.onStartFalling = new PrinceJS.Signal();
  this.onStopFalling = new PrinceJS.Signal();

  this.step = 0;

  this.state = PrinceJS.Tile.Loose.STATE_INACTIVE;

  this.vacc = 0;
  this.yTo = 0;
};

PrinceJS.Tile.Loose.STATE_INACTIVE = 0;
PrinceJS.Tile.Loose.STATE_SHAKING = 1;
PrinceJS.Tile.Loose.STATE_FALLING = 2;

PrinceJS.Tile.Loose.FALL_VELOCITY = 3;

PrinceJS.Tile.Loose.frames = PrinceJS.Utils.frameNames("_loose_", 1, 8);

PrinceJS.Tile.Loose.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Loose.prototype.constructor = PrinceJS.Tile.Loose;

PrinceJS.Tile.Loose.prototype.update = function () {
  let value;
  switch (this.state) {
    case PrinceJS.Tile.Loose.STATE_SHAKING:
      if (this.step === PrinceJS.Tile.Loose.frames.length) {
        this.state = PrinceJS.Tile.Loose.STATE_FALLING;
        this.step = 0;
        this.backSprite.setFrame(this.key + "_falling");
        this.onStartFalling.dispatch(this);
        this.scene.sound.play("LooseFloorShakes");
      } else {
        if (this.step === 3 && !this.fall) {
          this.front.visible = true;
          this.backSprite.setFrame(this.key + "_" + PrinceJS.Level.TILE_LOOSE_BOARD);
          this.state = PrinceJS.Tile.Loose.STATE_INACTIVE;
        } else {
          this.backSprite.setFrame(this.key + PrinceJS.Tile.Loose.frames[this.step]);
          if (this.step % 3 === 1) {
            this.scene.sound.play("LooseFloorShakes");
          } else if (this.step % 2 === 0) {
            if (PrinceJS.Utils.random(2) === 0) {
              this.scene.sound.play("LooseFloorShakes2");
            } else {
              this.scene.sound.play("LooseFloorShakes3");
            }
          }
          this.step++;
        }
      }
      break;

    case PrinceJS.Tile.Loose.STATE_FALLING:
      value = PrinceJS.Tile.Loose.FALL_VELOCITY * this.step;
      this.y += value;
      this.step++;
      this.vacc += value;

      if (this.vacc > this.yTo) {
        this.state = PrinceJS.Tile.Loose.STATE_INACTIVE;
        this.onStopFalling.dispatch(this);
      }
      break;
  }
};

PrinceJS.Tile.Loose.prototype.shake = function (fall) {
  if (this.state === PrinceJS.Tile.Loose.STATE_INACTIVE) {
    this.state = PrinceJS.Tile.Loose.STATE_SHAKING;
    this.step = 0;
    this.front.visible = false;
  }
  this.fall = fall;
};

PrinceJS.Tile.Loose.prototype.sweep = function () {
  this.state = PrinceJS.Tile.Loose.STATE_FALLING;
  this.step = 0;
  this.backSprite.setFrame(this.key + "_falling");
  this.onStartFalling.dispatch(this);
  this.scene.sound.play("LooseFloorShakes");
};

PrinceJS.Tile.Loose.prototype.fallStarted = function () {
  return this.state === PrinceJS.Tile.Loose.STATE_SHAKING && this.step === PrinceJS.Tile.Loose.frames.length;
};
