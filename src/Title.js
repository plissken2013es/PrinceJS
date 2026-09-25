import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.Title = class extends Phaser.Scene {
  constructor() {
    super("Title");
    this.tick = 0;
  }
};

Object.assign(PrinceJS.Title.prototype, {
  preload: function () {},

  create: function () {
    PrinceJS.Init();
    this.stopMusic();
    PrinceJS.Utils.setupCamera(this);

    this.tick = 0;

    this.back = this.add.image(0, 0, "title", "main_background").setOrigin(0, 0);
    this.back.alpha = 0;

    this.tween1 = this.tweens.add({
      targets: this.back,
      alpha: 1,
      duration: 2000,
      paused: true,
      onComplete: () => {
        this.game.sound.play("PrologueA");
      }
    });

    let centerX = PrinceJS.SCREEN_WIDTH * 0.5;
    let centerY = PrinceJS.SCREEN_HEIGHT * 0.5;

    this.presents = this.add.image(centerX, centerY + 29.5, "title", "presents");
    this.presents.setOrigin(0.5, 0.5);
    this.presents.visible = false;

    this.author = this.add.image(centerX - 3, centerY + 37, "title", "author");
    this.author.setOrigin(0.5, 0.5);
    this.author.visible = false;

    this.prince = this.add.image(0, 0, "title", "prince").setOrigin(0, 0);
    this.prince.visible = false;

    this.textBack = this.add.image(0, PrinceJS.SCREEN_HEIGHT, "title", "in_the_absence");
    PrinceJS.Utils.anchor(this.textBack, 0, 1);

    this.tween2 = PrinceJS.Utils.revealTween(this, this.textBack, 200);

    this.tween3 = this.tweens.add({
      targets: this.textBack,
      alpha: 0,
      duration: 2000,
      paused: true,
      onComplete: () => {
        PrinceJS.Utils.delayed(
          this,
          () => {
            this.cutscene();
          },
          3500
        );
      }
    });

    PrinceJS.Utils.onAnyKey(this, this.play.bind(this));
  },

  update: function () {
    switch (this.tick) {
      case 0:
        this.tween1.play();
        break;
      case 250:
        this.presents.visible = true;
        break;
      case 450:
        this.presents.visible = false;
        break;
      case 530:
        this.author.visible = true;
        break;
      case 730:
        this.author.visible = false;
        break;
      case 1030:
        this.prince.visible = true;
        break;
      case 1600:
        this.tween2.play();
        this.game.sound.play("PrologueB");
        break;
      case 2250:
        this.back.visible = false;
        this.prince.visible = false;
        this.tween3.play();
        break;
    }

    this.tick++;
  },

  play: function () {
    this.stopMusic();

    PrinceJS.Utils.onAnyKey(this, null);
    this.scene.start("Game");
  },

  cutscene: function () {
    this.stopMusic();

    PrinceJS.Utils.onAnyKey(this, null);
    this.scene.start("Cutscene");
  },

  stopMusic: function () {
    this.game.sound.stopAll();
  }
});
