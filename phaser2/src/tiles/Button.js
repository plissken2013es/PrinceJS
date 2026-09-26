"use strict";

PrinceJS.Tile.Button = function (game, element, modifier, type) {
  PrinceJS.Tile.Base.call(this, game, element, modifier, type);

  this.stepMax = element === PrinceJS.Level.TILE_RAISE_BUTTON ? 3 : 5;
  this.step = 0;

  this.onPushed = new Phaser.Signal();

  this.active = false;
  this.mute = false;
};

PrinceJS.Tile.Button.prototype = Object.create(PrinceJS.Tile.Base.prototype);
PrinceJS.Tile.Button.prototype.constructor = PrinceJS.Tile.Button;

PrinceJS.Tile.Button.prototype.update = function () {
  if (this.active && this.element === PrinceJS.Level.TILE_RAISE_BUTTON) {
    this.trigger();
  }

  if (this.debris) {
    if (!this.active) {
      this.active = true;
      this.trigger();
      if (!this.mute) {
        this.game.sound.play("FloorButton");
      }
    }
    return;
  }

  if (this.active) {
    if (this.step === this.stepMax) {
      this.front.y = this.frontOriginalY;
      delete this.frontOriginalY;

      this.back.frameName = this.key + "_" + this.element;
      this.active = false;
    }
    this.step++;
  }
};

PrinceJS.Tile.Button.prototype.push = function () {
  if (!this.active) {
    this.active = true;
    this.frontOriginalY = this.front.y;
    this.front.y += 1;

    this.back.frameName += "_down";
    this.trigger();
    if (!this.mute) {
      this.game.sound.play("FloorButton");
    }
  }
  this.step = 0;
};

PrinceJS.Tile.Button.prototype.trigger = function () {
  this.onPushed.dispatch(this.modifier, this.element);
};
