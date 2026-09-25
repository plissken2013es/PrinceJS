import Phaser from "phaser";
import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Clock = function (scene, x, y, state) {
  this.scene = scene;

  this.sandStep = 0;
  this.clockStep = state;
  this.step = 0;

  this.backSprite = PrinceJS.Utils.image(this.scene, 0, 0, "cutscene", PrinceJS.Tile.Clock.clockFrames[this.clockStep]);
  this.tileChild = PrinceJS.Utils.image(this.scene, 8, 16, "cutscene", PrinceJS.Tile.Clock.sandFrames[this.sandStep]);
  this.tileChild.visible = false;
  this.back = new Phaser.GameObjects.Container(this.scene, x, y, [this.backSprite, this.tileChild]);

  this.active = false;
};

PrinceJS.Tile.Clock.sandFrames = PrinceJS.Utils.frameNames("clocksand0", 1, 3);
PrinceJS.Tile.Clock.clockFrames = PrinceJS.Utils.frameNames("clock0", 1, 7);

PrinceJS.Tile.Clock.prototype.update = function () {
  if (this.active) {
    this.sandStep = (this.sandStep + 1) % PrinceJS.Tile.Clock.sandFrames.length;
    this.tileChild.setFrame(PrinceJS.Tile.Clock.sandFrames[this.sandStep]);
    this.step++;

    if (this.step === 40) {
      this.clockStep = (this.clockStep + 1) % PrinceJS.Tile.Clock.clockFrames.length;
      this.backSprite.setFrame(PrinceJS.Tile.Clock.clockFrames[this.clockStep]);
      this.step = 0;
    }
  }
};

PrinceJS.Tile.Clock.prototype.activate = function () {
  this.active = true;
  this.tileChild.visible = true;
};

PrinceJS.Tile.Clock.prototype.constructor = PrinceJS.Tile.Clock;
