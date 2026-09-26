"use strict";

PrinceJS.Interface = function (game, delegate) {
  this.game = game;
  this.delegate = delegate;

  this.text;

  let bmd = this.game.make.bitmapData(PrinceJS.SCREEN_WIDTH, PrinceJS.UI_HEIGHT);
  bmd.fill(0, 0, 0);

  this.layer = this.game.add.sprite(0, (PrinceJS.SCREEN_HEIGHT - PrinceJS.UI_HEIGHT) * PrinceJS.SCALE_FACTOR, bmd);
  this.layer.fixedToCamera = true;

  this.text = this.game.make.bitmapText(PrinceJS.SCREEN_WIDTH * 0.5, (PrinceJS.UI_HEIGHT - 1) * 0.5, "font", "", 16);
  this.text.anchor.setTo(0.5, 0.5);
  this.showTextType = null;
  this.showLevel();

  this.layer.addChild(this.text);

  this.player = null;
  this.playerHPs = [];
  this.playerHPActive = 0;

  this.opp = null;
  this.oppHPs = [];
  this.oppHPActive = 0;

  this.pressButtonToContinueStep = -1;
};

PrinceJS.Interface.prototype = {
  setPlayerLive: function (actor) {
    this.player = actor;
    this.playerHPActive = this.player.health;
    for (let i = 0; i < this.playerHPActive; i++) {
      this.playerHPs[i] = this.game.add.sprite(i * 7, 2, "general", "kid-live");
      this.layer.addChild(this.playerHPs[i]);
    }
    this.player.onDamageLife.add(this.damagePlayerLive, this);
    this.player.onRecoverLive.add(this.recoverPlayerLive, this);
    this.player.onAddLive.add(this.addPlayerLive, this);
  },

  damagePlayerLive: function (num) {
    let n = Math.min(this.playerHPActive, num);
    for (let i = 0; i < n; i++) {
      this.playerHPActive--;
      this.playerHPs[this.playerHPActive].frameName = "kid-emptylive";
    }
  },

  recoverPlayerLive: function () {
    this.playerHPs[0].frameName = "kid-live";
    this.playerHPs[this.playerHPActive].frameName = "kid-live";
    this.playerHPActive++;
  },

  addPlayerLive: function () {
    this.playerHPActive = this.playerHPs.length;
    if (this.playerHPs.length < 10) {
      let hp = this.game.add.sprite(this.playerHPActive * 7, 2, "general", "kid-live");
      this.playerHPs[this.playerHPActive] = hp;
      this.layer.addChild(hp);
      this.playerHPActive++;
    }

    for (let i = 0; i < this.playerHPActive; i++) {
      this.playerHPs[i].frameName = "kid-live";
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
      this.oppHPs[i - 1] = this.game.add.sprite(
        PrinceJS.SCREEN_WIDTH - i * 7 + 1,
        2,
        "general",
        actor.baseCharName + "-live"
      );
      if (actor.charColor > 0) {
        this.oppHPs[i - 1].tint = PrinceJS.Enemy.COLOR[actor.charColor - 1];
      }
      this.layer.addChild(this.oppHPs[i - 1]);
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
      if (this.playerHPs[0].frameName === "kid-live") {
        this.playerHPs[0].frameName = "kid-emptylive";
      } else {
        this.playerHPs[0].frameName = "kid-live";
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
            this.game.sound.play("Beep");
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
    PrinceJS.Utils.delayed(() => {
      this.hideText();
      this.showRegularRemainingTime(true);
    }, 2000);
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
    PrinceJS.Utils.delayed(() => {
      this.hideText();
    }, 3000);
  },

  showRemainingSeconds: function () {
    if (["level", "continue"].includes(this.showTextType)) {
      return;
    }
    let seconds = this.getRemainingSeconds();
    this.showText(seconds + (seconds === 1 ? " SECOND " : " SECONDS ") + "LEFT", "seconds");
  },

  showPressButtonToContinue: function () {
    PrinceJS.Utils.delayed(() => {
      this.showText("Press Button to Continue", "continue");
      this.pressButtonToContinueStep = 200;
    }, 4000);
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
