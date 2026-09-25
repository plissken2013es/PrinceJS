import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Skeleton = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_SKELETON, modifier, type);
};

PrinceJS.Tile.Skeleton.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Skeleton.prototype.constructor = PrinceJS.Tile.Skeleton;

PrinceJS.Tile.Skeleton.prototype.update = function () {};

PrinceJS.Tile.Skeleton.prototype.removeObject = function () {
  this.element = PrinceJS.Level.TILE_FLOOR;
  this.modifier = 0;

  this.frontSprite.setFrame(this.key + "_" + this.element + "_fg");
  this.backSprite.setFrame(this.key + "_" + this.element);
  let tileChild = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_" + this.element + "_" + this.modifier);
  this.back.add(tileChild);
};
