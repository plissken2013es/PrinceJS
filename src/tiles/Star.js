import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Star = function (scene, x, y) {
  this.scene = scene;

  this.back = PrinceJS.Utils.image(this.scene, x, y, "cutscene", "star1");

  this.state = 1;

  this.update();
};

PrinceJS.Tile.Star.prototype.update = function () {
  let step = PrinceJS.Utils.between(1, 10);

  switch (step) {
    case 1:
      if (this.state > 0) {
        this.state--;
      }
      break;

    case 2:
      if (this.state < 2) {
        this.state++;
      }
      break;
  }

  this.back.setFrame("star" + this.state);
};

PrinceJS.Tile.Star.prototype.constructor = PrinceJS.Tile.Star;
