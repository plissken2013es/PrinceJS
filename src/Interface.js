import PrinceJS from "./PrinceJS.js";

// The status bar at the bottom of the screen, fixed to the camera
PrinceJS.Interface = function (scene, delegate) {
  this.scene = scene;
  this.delegate = delegate;

  this.text;

  this.layer = this.scene.add.layer();
  this.layer.setDepth(40);
  this.top = PrinceJS.SCREEN_HEIGHT - PrinceJS.UI_HEIGHT;

  this.addToLayer(this.scene.add.rectangle(0, 0, PrinceJS.SCREEN_WIDTH, PrinceJS.UI_HEIGHT, 0x000000).setOrigin(0, 0));

  this.text = this.scene.add.bitmapText(PrinceJS.SCREEN_WIDTH * 0.5, (PrinceJS.UI_HEIGHT - 1) * 0.5, "font", "", 16);
  this.text.setOrigin(0.5, 0.5);
  this.showTextType = null;
  this.showLevel();

  this.addToLayer(this.text);

  this.player = null;
  this.playerHPs = [];
  this.playerHPActive = 0;

  this.opp = null;
  this.oppHPs = [];
  this.oppHPActive = 0;

  this.pressButtonToContinueStep = -1;
};

PrinceJS.Interface.prototype = {
  // Positions are relative to the top left corner of the status bar
  addToLayer: function (object) {
    object.y += this.top;
    object.setScrollFactor(0);
    this.layer.add(object);
    return object;
  },

  setPlayerLive: function (actor) {
    this.player = actor;
    this.playerHPActive = this.player.health;
    for (let i = 0; i < this.playerHPActive; i++) {
      this.playerHPs[i] = this.addToLayer(PrinceJS.Utils.image(this.scene, i * 7, 2, "general", "kid-live"));
    }
    this.player.onDamageLife.add(this.damagePlayerLive, this);
    this.player.onRecoverLive.add(this.recoverPlayerLive, this);
    this.player.onAddLive.add(this.addPlayerLive, this);
  },

  damagePlayerLive: function (num) {
    let n = Math.min(this.playerHPActive, num);
    for (let i = 0; i < n; i++) {
      this.playerHPActive--;
      this.playerHPs[this.playerHPActive].setFrame("kid-emptylive");
    }
  },

  recoverPlayerLive: function () {
    this.playerHPs[0].setFrame("kid-live");
    this.playerHPs[this.playerHPActive].setFrame("kid-live");
    this.playerHPActive++;
  },

  addPlayerLive: function () {
    this.playerHPActive = this.playerHPs.length;
    if (this.playerHPs.length < 10) {
      let hp = this.addToLayer(PrinceJS.Utils.image(this.scene, this.playerHPActive * 7, 2, "general", "kid-live"));
      this.playerHPs[this.playerHPActive] = hp;
      this.playerHPActive++;
    }

    for (let i = 0; i < this.playerHPActive; i++) {
      this.playerHPs[i].setFrame("kid-live");
    }
  },

  setOpponentLive: function (actor) {
    if (this.opp === actor) {
      return;
    }
    this.resetOpponentLive();
    this.opp = actor;

    if (!actor || !actor.active || actor.charName === "skeleton") {
      return;
    }

    this.oppHPs = [];
    this.oppHPActive = actor.health;

    for (let i = actor.health; i > 0; i--) {
      this.oppHPs[i - 1] = this.addToLayer(
        PrinceJS.Utils.image(this.scene, PrinceJS.SCREEN_WIDTH - i * 7 + 1, 2, "general", actor.baseCharName + "-live")
      );
      if (actor.charColor > 0) {
        this.oppHPs[i - 1].tint = PrinceJS.Enemy.COLOR[actor.charColor - 1];
      }
    }

    actor.onDamageLife.add(this.damageOpponentLive, this);
    actor.onDead.add(this.resetOpponentLive, this);
  },

  resetOpponentLive: function () {
    if (!this.opp) {
      return;
    }

    for (let i = 0; i < this.oppHPs.length; i++) {
      this.oppHPs[i].destroy();
    }
    this.opp.onDamageLife.removeAll();
    this.opp.onDead.removeAll();
    this.opp = null;
    this.oppHPs = [];
    this.oppHPActive = 0;
  },

  damageOpponentLive: function () {
    if (!this.opp || this.opp.charName === "skeleton") {
      return;
    }

    this.oppHPActive--;
    this.oppHPs[this.oppHPActive].visible = false;
  },

  updateUI: function () {
    this.showRegularRemainingTime();

    if (this.playerHPActive === 1) {
      if (this.playerHPs[0].frame.name === "kid-live") {
        this.playerHPs[0].setFrame("kid-emptylive");
      } else {
        this.playerHPs[0].setFrame("kid-live");
      }
    }

    if (this.oppHPActive === 1) {
      this.oppHPs[0].visible = !this.oppHPs[0].visible;
    }

    if (this.pressButtonToContinueStep > -1) {
      this.pressButtonToContinueStep--;
      if (this.pressButtonToContinueStep < 70) {
        if (this.pressButtonToContinueStep % 7 === 0) {
          this.text.visible = !this.text.visible;
          if (this.text.visible) {
            this.scene.sound.play("Beep");
          }
        }
      }
    }
  },

  setRemainingMinutesTo15() {
    let date = new Date();
    date.setMinutes(date.getMinutes() - (60 - 15));
    PrinceJS.startTime = date;
  },

  getDeltaTime: function () {
    if (!PrinceJS.startTime) {
      return {
        minutes: -1,
        seconds: -1
      };
    }
    let diff = (PrinceJS.endTime || new Date()).getTime() - PrinceJS.startTime.getTime();
    let minutes = Math.floor(diff / 60000);
    let seconds = Math.floor(diff / 1000) % 60;
    return { minutes, seconds };
  },

  getRemainingMinutes: function () {
    let deltaTime = this.getDeltaTime();
    return Math.max(0, 60 - deltaTime.minutes);
  },

  getRemainingSeconds: function () {
    let deltaTime = this.getDeltaTime();
    return Math.max(0, 60 - deltaTime.seconds);
  },

  showLevel: function () {
    if (PrinceJS.endTime) {
      return;
    }
    this.showText("LEVEL " + PrinceJS.currentLevel, "level");
    PrinceJS.Utils.delayed(
      this.scene,
      () => {
        this.hideText();
        this.showRegularRemainingTime(true);
      },
      2000
    );
  },

  showRegularRemainingTime: function (force) {
    if (PrinceJS.endTime) {
      return;
    }
    if (this.getRemainingMinutes() === 0) {
      this.delegate.timeUp();
      PrinceJS.startTime = null;
    } else if (this.getRemainingMinutes() === 1) {
      this.showRemainingSeconds();
    } else if (
      force ||
      (this.getRemainingMinutes() < 60 && this.getRemainingMinutes() % 5 === 0 && this.getDeltaTime().seconds === 0)
    ) {
      this.showRemainingMinutes();
    }
  },

  showRemainingMinutes: function () {
    if (this.showTextType) {
      return;
    }
    let minutes = this.getRemainingMinutes();
    this.showText(minutes + (minutes === 1 ? " MINUTE " : " MINUTES ") + "LEFT", "minutes");
    PrinceJS.Utils.delayed(
      this.scene,
      () => {
        this.hideText();
      },
      3000
    );
  },

  showRemainingSeconds: function () {
    if (["level", "continue"].includes(this.showTextType)) {
      return;
    }
    let seconds = this.getRemainingSeconds();
    this.showText(seconds + (seconds === 1 ? " SECOND " : " SECONDS ") + "LEFT", "seconds");
  },

  showPressButtonToContinue: function () {
    PrinceJS.Utils.delayed(
      this.scene,
      () => {
        this.showText("Press Button to Continue", "continue");
        this.pressButtonToContinueStep = 200;
      },
      4000
    );
  },

  showText: function (text, type) {
    this.text.setText(text);
    this.showTextType = type;
  },

  hideText: function () {
    this.text.setText("");
    this.showTextType = null;
  }
};
