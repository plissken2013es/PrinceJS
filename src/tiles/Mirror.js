import Phaser from "phaser";
import PrinceJS from "../PrinceJS.js";

PrinceJS.Tile.Mirror = function (scene, modifier, type) {
  PrinceJS.Tile.Base.call(this, scene, PrinceJS.Level.TILE_FLOOR, modifier, type);

  this.mirrorBack = PrinceJS.Utils.image(this.scene, 3, -3, this.key, this.key + "_" + this.element + "_mirror");
  this.mirrorBack.visible = false;
  this.back.add(this.mirrorBack);
  this.mirrorFront = PrinceJS.Utils.image(this.scene, 3, -3, this.key, this.key + "_" + this.element + "_fg_mirror");
  this.mirrorFront.visible = false;
  this.front.add(this.mirrorFront);

  this.reflectionGroup = new Phaser.GameObjects.Container(this.scene, 0, 0);
  this.reflectionGroup.scaleX *= -1;
  this.reflection = PrinceJS.Utils.image(this.scene, 0, 0, "kid", "kid-1");
  PrinceJS.Utils.anchor(this.reflection, 0, 1);
  this.reflection.visible = false;
  this.reflectionGroup.add(this.reflection);
  this.back.add(this.reflectionGroup);

  this.reflectionCover = PrinceJS.Utils.image(
    this.scene,
    -105,
    -5,
    this.key,
    this.key + "_" + this.element + "_mirror_cover"
  );
  this.back.add(this.reflectionCover);
};

PrinceJS.Tile.Mirror.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Mirror.prototype.constructor = PrinceJS.Tile.Mirror;

PrinceJS.Tile.Mirror.prototype.update = function () {};

PrinceJS.Tile.Mirror.prototype.addObject = function () {
  if (this.element !== PrinceJS.Level.TILE_FLOOR) {
    return;
  }
  this.element = PrinceJS.Level.TILE_MIRROR;
  this.mirrorBack.visible = true;
  this.mirrorFront.visible = true;
};

PrinceJS.Tile.Mirror.prototype.toggleMask = function () {
  if (this.element === PrinceJS.Level.TILE_FLOOR) {
    PrinceJS.Tile.Base.prototype.toggleMask.call(this);
  }
};

PrinceJS.Tile.Mirror.prototype.syncFrame = function (actor) {
  if (this.reflection) {
    this.reflection.setFrame(actor.frame.name);
    this.reflection.x = actor.x - this.x - 55;
    this.reflection.x = Math.max(this.reflection.x, actor.faceL() ? -25 : -7);
    this.reflection.y = actor.y - this.y;
    this.reflection.visible = this.reflection.x > -40 && this.reflection.x < 20;
  }
};

PrinceJS.Tile.Mirror.prototype.syncFace = function (actor) {
  if (this.reflection) {
    this.reflection.charFace = actor.charFace;
    this.reflection.scaleX = actor.scaleX;
  }
};

PrinceJS.Tile.Mirror.prototype.hideReflection = function () {
  if (this.reflection) {
    this.reflection.visible = false;
    this.reflection = null;
  }
};
