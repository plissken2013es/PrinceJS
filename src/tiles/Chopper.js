import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Chopper = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_CHOPPER, modifier, type);

  this.tileChildBack = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_chopper_5");
  this.back.add(this.tileChildBack);

  this.tileChildFront = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_chopper_5_fg");
  this.front.add(this.tileChildFront);

  this.blood = PrinceJS.Utils.image(this.scene, 12, 41, "general", "chopper-blood_4");
  this.blood.visible = false;
  this.front.add(this.blood);

  this.step = 0;

  this.onChopped = new PrinceJS.Signal();

  this.active = false;
};

PrinceJS.Tile.Chopper.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Chopper.prototype.constructor = PrinceJS.Tile.Chopper;

PrinceJS.Tile.Chopper.prototype.update = function () {
  if (this.active) {
    this.step++;
    if (this.step > 14) {
      this.step = 0;
      this.active = false;
    } else {
      if (this.step < 6) {
        this.tileChildBack.setFrame(this.key + "_chopper_" + this.step);
        this.tileChildFront.setFrame(this.key + "_chopper_" + this.step + "_fg");
        this.blood.setFrame("chopper-blood_" + this.step);

        if (this.step === 3) {
          this.onChopped.dispatch(this.roomX, this.roomY, this.room);
          this.scene.sound.play("SlicerBladesClash");
        }
      }
    }
  }
};

PrinceJS.Tile.Chopper.prototype.chop = function () {
  this.active = true;
};

PrinceJS.Tile.Chopper.prototype.showBlood = function () {
  this.blood.visible = true;
};
