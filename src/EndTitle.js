import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.EndTitle = class extends Phaser.Scene {
  constructor() {
    super("EndTitle");
    this.tick = 0;
  }
};

Object.assign(PrinceJS.EndTitle.prototype, {
  preload: function () {},

  create: function () {
    this.stopMusic();
    PrinceJS.Utils.setupCamera(this);

    this.tick = 0;
    this.logicTime = 0;

    this.game.sound.play("Epilogue");

    this.back = this.add.image(0, 0, "title", "the_tyrant").setOrigin(0, 0);
    this.back.alpha = 0;

    this.tween1 = this.tweens.add({ targets: this.back, alpha: 1, duration: 2000, paused: true });

    this.textBack = this.add.image(0, PrinceJS.SCREEN_HEIGHT, "title", "main_background");
    PrinceJS.Utils.anchor(this.textBack, 0, 1);

    this.tween2 = PrinceJS.Utils.revealTween(this, this.textBack, 200);

    this.tween3 = this.tweens.add({
      targets: this.textBack,
      alpha: 0,
      duration: 2000,
      paused: true,
      onComplete: this.next,
      callbackScope: this
    });

    PrinceJS.Utils.onAnyKey(this, this.next.bind(this));
  },

  update: function (time, delta) {
    if (!PrinceJS.Utils.logicFrame(this, delta)) {
      return;
    }

    switch (this.tick) {
      case 100:
        this.tween1.play();
        break;
      case 1250:
        this.tween2.play();
        break;
      case 7250:
        this.back.visible = false;
        this.tween3.play();
        break;
    }

    this.tick++;
  },

  next: function () {
    PrinceJS.Utils.onAnyKey(this, null);
    this.scene.start("Title");
  },

  stopMusic: function () {
    this.game.sound.stopAll();
  }
});
