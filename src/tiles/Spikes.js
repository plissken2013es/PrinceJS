import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Spikes = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_SPIKES, modifier, type);

  this.state = PrinceJS.Tile.Spikes.STATE_INACTIVE;
  this.step = 0;
  this.mortal = modifier < 5;

  if (modifier > 2 && modifier < 6) {
    modifier = 5;
  }
  if (modifier === 6) {
    modifier = 4;
  }
  if (modifier > 6) {
    modifier = 9 - modifier;
  }

  this.tileChildBack = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_" + this.element + "_" + modifier);
  this.back.add(this.tileChildBack);

  this.tileChildFront = PrinceJS.Utils.image(
    this.scene,
    0,
    0,
    this.key,
    this.key + "_" + this.element + "_" + modifier + "_fg"
  );
  this.front.add(this.tileChildFront);
};

PrinceJS.Tile.Spikes.STATE_INACTIVE = 0;
PrinceJS.Tile.Spikes.STATE_RAISING = 1;
PrinceJS.Tile.Spikes.STATE_FULL_OUT = 2;
PrinceJS.Tile.Spikes.STATE_DROPPING = 3;

PrinceJS.Tile.Spikes.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Spikes.prototype.constructor = PrinceJS.Tile.Spikes;

PrinceJS.Tile.Spikes.prototype.update = function () {
  switch (this.state) {
    case PrinceJS.Tile.Spikes.STATE_RAISING:
      this.step++;
      this.tileChildBack.setFrame(this.key + "_" + PrinceJS.Level.TILE_SPIKES + "_" + this.step);
      this.tileChildFront.setFrame(this.key + "_" + PrinceJS.Level.TILE_SPIKES + "_" + this.step + "_fg");
      if (this.step === 5) {
        this.state = PrinceJS.Tile.Spikes.STATE_FULL_OUT;
        this.step = 0;
      }
      break;

    case PrinceJS.Tile.Spikes.STATE_FULL_OUT:
      this.step++;
      if (this.step > 15) {
        this.state = PrinceJS.Tile.Spikes.STATE_DROPPING;
        this.step = 5;
      }
      break;

    case PrinceJS.Tile.Spikes.STATE_DROPPING:
      this.step--;
      if (this.step === 3) {
        this.step--;
      }
      this.tileChildBack.setFrame(this.key + "_" + PrinceJS.Level.TILE_SPIKES + "_" + this.step);
      this.tileChildFront.setFrame(this.key + "_" + PrinceJS.Level.TILE_SPIKES + "_" + this.step + "_fg");
      if (this.step === 0) {
        this.state = PrinceJS.Tile.Spikes.STATE_INACTIVE;
      }
      break;
  }
};

PrinceJS.Tile.Spikes.prototype.raise = function () {
  if (this.state === PrinceJS.Tile.Spikes.STATE_INACTIVE) {
    this.state = PrinceJS.Tile.Spikes.STATE_RAISING;
    this.scene.sound.play("ImpaledBySpikes");
  } else {
    if (this.state === PrinceJS.Tile.Spikes.STATE_FULL_OUT) {
      this.step = 0;
    }
  }
};
