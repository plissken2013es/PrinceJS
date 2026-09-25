import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.Cutscene = class extends Phaser.Scene {
  constructor() {
    super("Cutscene");
    this.room;
  }
};

PrinceJS.Cutscene.STATE_SETUP = 0;
PrinceJS.Cutscene.STATE_READY = 1;
PrinceJS.Cutscene.STATE_WAITING = 2;
PrinceJS.Cutscene.STATE_RUNNING = 3;

Object.assign(PrinceJS.Cutscene.prototype, {
  preload: function () {
    // Each cutscene is loaded under the same key
    this.cache.json.remove("cutscene");
    this.load.json("cutscene", "assets/cutscenes/scene" + PrinceJS.currentLevel + ".json");
  },

  create: function () {
    this.reset();

    PrinceJS.Utils.setupCamera(this);

    this.program = this.cache.json.get("cutscene").program;

    this.room = new PrinceJS.Scene(this);
    this.executeProgram();

    if (PrinceJS.currentLevel < 15) {
      PrinceJS.Utils.onAnyKey(this, this.play.bind(this));
    } else {
      PrinceJS.Utils.onAnyKey(this, this.next.bind(this));
    }
    this.time.addEvent({ delay: 120, loop: true, callback: this.updateScene, callbackScope: this });
  },

  executeProgram: function () {
    if (this.sceneState === PrinceJS.Cutscene.STATE_WAITING) {
      this.waitingTime--;
      if (this.waitingTime === 0) {
        this.sceneState = PrinceJS.Cutscene.STATE_READY;
      }
      return;
    }

    while (this.sceneState === PrinceJS.Cutscene.STATE_SETUP || this.sceneState === PrinceJS.Cutscene.STATE_RUNNING) {
      let opcode = this.program[this.pc];
      let actor;
      switch (opcode.i) {
        case "START":
          this.sceneState = PrinceJS.Cutscene.STATE_READY;
          if (opcode.p1 === 0) {
            this.fadeOut(1);
          } else {
            this.fadeIn();
          }
          break;

        case "END":
          this.endCutscene(opcode.p1 !== 0);
          this.sceneState = PrinceJS.Cutscene.STATE_WAITING;
          this.waitingTime = 1000;
          break;

        case "ACTION":
          actor = this.actors[opcode.p1];
          actor.action = opcode.p2;
          break;

        case "ADD_ACTOR":
          actor = new PrinceJS.Actor(this, opcode.p3, opcode.p4, opcode.p5, opcode.p2);
          this.actors[opcode.p1] = actor;
          break;

        case "REM_ACTOR":
          this.actors[opcode.p1].setVisible(false);
          break;

        case "ADD_OBJECT":
          this.objects[opcode.p1] = new PrinceJS.Tile.Clock(this, opcode.p3, opcode.p4, opcode.p2);
          this.room.addObject(this.objects[opcode.p1]);
          break;

        case "START_OBJECT":
          this.objects[opcode.p1].activate();
          break;

        case "EFFECT":
          this.room.effect();
          break;

        case "WAIT":
          this.sceneState = PrinceJS.Cutscene.STATE_WAITING;
          this.waitingTime = opcode.p1;
          break;

        case "MUSIC":
          this.stopMusic();
          this.game.sound.play(opcode.p2);
          break;

        case "SOUND":
          this.game.sound.play(opcode.p2);
          break;

        case "FADEIN":
          this.fadeIn(opcode.p1 * 120);
          break;

        case "FADEOUT":
          this.fadeOut(opcode.p1 * 120);
          break;
      }
      this.pc++;
    }
  },

  updateScene: function () {
    if (this.sceneState === PrinceJS.Cutscene.STATE_RUNNING) {
      return;
    } else if (this.sceneState === PrinceJS.Cutscene.STATE_READY) {
      this.sceneState = PrinceJS.Cutscene.STATE_RUNNING;
    }
    this.executeProgram();
    this.room.update();

    for (let i = 0; i < this.actors.length; i++) {
      this.actors[i].updateActor();
    }
  },

  play: function () {
    this.stopMusic();

    PrinceJS.Utils.onAnyKey(this, null);
    this.scene.start("Game");
  },

  endCutscene: function (fadeOut = true) {
    if (fadeOut) {
      this.fadeOut(2000, () => {
        this.next();
      });
    } else {
      this.next();
    }
  },

  next: function () {
    PrinceJS.Utils.onAnyKey(this, null);

    if (PrinceJS.currentLevel === 1) {
      this.scene.start("Credits");
    } else if (PrinceJS.currentLevel === 15) {
      PrinceJS.Init();
      this.scene.start("EndTitle");
    } else if (PrinceJS.currentLevel === 16) {
      PrinceJS.Init();
      this.scene.start("Title");
    } else {
      this.play();
    }
  },

  reset: function () {
    this.actors = [];
    this.objects = [];

    this.pc = 0;
    this.waitingTime = 0;
    this.sceneState = PrinceJS.Cutscene.STATE_SETUP;
  },

  stopMusic: function () {
    this.game.sound.stopAll();
  },

  fadeIn: function (duration = 2000, callback) {
    this.cameras.main.fadeFrom(duration, 0, 0, 0, false);
    PrinceJS.Utils.delayed(
      this,
      () => {
        if (callback) {
          callback();
        }
      },
      duration
    );
  },

  fadeOut: function (duration = 2000, callback) {
    this.cameras.main.fade(duration, 0, 0, 0, false);
    PrinceJS.Utils.delayed(
      this,
      () => {
        if (callback) {
          callback();
        }
      },
      duration
    );
  }
});
