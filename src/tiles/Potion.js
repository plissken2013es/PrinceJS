import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Potion = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_POTION, modifier, type);

  let yy = 53;
  if (modifier > 1 && modifier < 5) {
    yy -= 4;
  }

  this.tileChild = PrinceJS.Utils.image(this.scene, 25, yy, "general");
  this.frontSprite.setFrame(this.frontSprite.frame.name + "_" + modifier);
  this.front.add(this.tileChild);

  this.step = PrinceJS.Utils.between(0, 6);

  this.color = PrinceJS.Tile.Potion.bubbleColors[modifier - 1];
};

PrinceJS.Tile.Potion.frames = PrinceJS.Utils.frameNames("bubble_", 1, 7);
PrinceJS.Tile.Potion.bubbleColors = ["red", "red", "green", "green", "blue"];

PrinceJS.Tile.Potion.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Potion.prototype.constructor = PrinceJS.Tile.Potion;

PrinceJS.Tile.Potion.prototype.update = function () {
  this.tileChild.setFrame(PrinceJS.Tile.Potion.frames[this.step] + "_" + this.color);
  this.step = (this.step + 1) % PrinceJS.Tile.Potion.frames.length;
};

PrinceJS.Tile.Potion.prototype.removeObject = function () {
  this.tileChild.destroy();
  this.element = PrinceJS.Level.TILE_FLOOR;
  this.modifier = 0;

  this.frontSprite.setFrame(this.key + "_" + this.element + "_fg");
  this.backSprite.setFrame(this.key + "_" + this.element);
  let tileChild = PrinceJS.Utils.image(this.scene, 0, 0, this.key, this.key + "_" + this.element + "_" + this.modifier);
  this.back.add(tileChild);
};
