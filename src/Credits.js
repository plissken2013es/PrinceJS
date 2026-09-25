import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.Credits = class extends Phaser.Scene {
  constructor() {
    super("Credits");
    this.tick = 0;
  }
};

Object.assign(PrinceJS.Credits.prototype, {
  preload: function () {},

  create: function () {
    this.tick = 0;
    PrinceJS.Utils.setupCamera(this);

    this.textBack = this.add.image(0, 0, "title", "marry_jaffar").setOrigin(0, 0);
    this.textBack.alpha = 0;

    this.tween1 = this.tweens.add({ targets: this.textBack, alpha: 1, duration: 2000, paused: true });

    this.back = this.add.image(0, PrinceJS.SCREEN_HEIGHT, "title", "prince");
    PrinceJS.Utils.anchor(this.back, 0, 1);

    this.tween2 = PrinceJS.Utils.revealTween(this, this.back, 200);

    this.credits = this.add.image(0, PrinceJS.SCREEN_HEIGHT, "title", "credits");
    PrinceJS.Utils.anchor(this.credits, 0, 1);

    this.tween3 = PrinceJS.Utils.revealTween(this, this.credits, 200);

    this.tween4 = this.tweens.add({
      targets: this.credits,
      alpha: 0,
      duration: 2000,
      paused: true,
      onComplete: this.play,
      callbackScope: this
    });

    PrinceJS.Utils.onAnyKey(this, this.play.bind(this));
  },

  update: function () {
    switch (this.tick) {
      case 0:
        this.tween1.play();
        break;
      case 1200:
        this.tween2.play();
        break;
      case 1400:
        this.tween3.play();
        break;
      case 1600:
        this.textBack.visible = this.back.visible = false;
        this.tween4.play();
    }

    this.tick++;
  },

  play: function () {
    PrinceJS.currentLevel = 1;
    PrinceJS.Utils.onAnyKey(this, null);
    this.scene.start("Game");
  }
});
