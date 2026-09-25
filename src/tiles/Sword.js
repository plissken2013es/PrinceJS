import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Sword = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_SWORD, modifier, type);

  this.tick = PrinceJS.Utils.between(40, 167);
  this.step = 0;
};

PrinceJS.Tile.Sword.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Sword.prototype.constructor = PrinceJS.Tile.Sword;

PrinceJS.Tile.Sword.prototype.update = function () {
  if (this.step === -1) {
    this.backSprite.setFrame(this.key + "_" + this.element);
    this.tick = PrinceJS.Utils.between(40, 167);
  }

  this.step++;

  if (this.step === this.tick) {
    this.backSprite.setFrame(this.backSprite.frame.name + "_bright");
    this.step = -1;
  }
};

PrinceJS.Tile.Sword.prototype.removeObject = function () {
  this.element = PrinceJS.Level.TILE_FLOOR;
  this.modifier = 0;

  this.frontSprite.setFrame(this.key + "_" + this.element + "_fg");
  this.backSprite.setFrame(this.key + "_" + this.element);
  let tileChild = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_" + this.element + "_" + this.modifier);
  this.back.add(tileChild);
};
