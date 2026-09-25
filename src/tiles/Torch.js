import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Torch = function (scene, element, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, element, modifier, type);

  this.tileChild = PrinceJS.Utils.image(this.scene, 40, 18, "general");
  this.back.add(this.tileChild);

  this.step = PrinceJS.Utils.between(0, 8);
};

PrinceJS.Tile.Torch.frames = PrinceJS.Utils.frameNames("fire_", 1, 9);

PrinceJS.Tile.Torch.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Torch.prototype.constructor = PrinceJS.Tile.Torch;

PrinceJS.Tile.Torch.prototype.update = function () {
  this.tileChild.setFrame(PrinceJS.Tile.Torch.frames[this.step]);
  this.step = (this.step + 1) % PrinceJS.Tile.Torch.frames.length;
};
