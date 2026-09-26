"use strict";

PrinceJS.Enemy = function (game, level, location, direction, room, skill, color, key, id) {
  this.baseCharName = key;
  if (key === "guard") {
    key = "guard-" + color;
  }
  PrinceJS.Fighter.call(this, game, level, location, direction, room, key, key === "shadow" ? "shadow" : "fighter");

  this.id = id;
  this.charX += direction * 7;

  this.strikeProbability = PrinceJS.Enemy.STRIKE_PROBABILITY[skill];
  this.restrikeProbability = PrinceJS.Enemy.RESTRIKE_PROBABILITY[skill];
  this.blockProbability = PrinceJS.Enemy.BLOCK_PROBABILITY[skill];
  this.impairblockProbability = PrinceJS.Enemy.IMPAIRBLOCK_PROBABILITY[skill];
  this.advanceProbability = PrinceJS.Enemy.ADVANCE_PROBABILITY[skill];

  this.refracTimer = 0;
  this.blockTimer = 0;
  this.strikeTimer = 0;
  this.lookBelow = false;
  this.startFight = false;

  this.health = PrinceJS.Enemy.EXTRA_STRENGTH[skill] + PrinceJS.Enemy.STRENGTH[this.level.number];

  this.charSkill = skill;
  this.charColor = color;

  this.onDamageLife.add(this.resetRefracTimer, this);
  this.onStrikeBlocked.add(this.resetBlockTimer, this);
  this.onEnemyStrike.add(this.resetStrikeTimer, this);

  if (this.charColor > 0) {
    this.tintSplash(PrinceJS.Enemy.COLOR[this.charColor - 1]);
  }
};

PrinceJS.Enemy.STRIKE_PROBABILITY = [61, 100, 61, 61, 61, 40, 100, 150, 0, 48, 32, 48]; // 220 -> 150
PrinceJS.Enemy.RESTRIKE_PROBABILITY = [0, 0, 0, 5, 5, 175, 16, 8, 0, 255, 255, 150];
PrinceJS.Enemy.BLOCK_PROBABILITY = [0, 150, 150, 200, 200, 255, 200, 250, 0, 255, 255, 255];
PrinceJS.Enemy.IMPAIRBLOCK_PROBABILITY = [0, 61, 61, 100, 100, 145, 100, 250, 0, 145, 255, 175];
PrinceJS.Enemy.ADVANCE_PROBABILITY = [255, 200, 200, 200, 255, 255, 200, 0, 0, 255, 100, 100];
PrinceJS.Enemy.REFRAC_TIMER = [16, 16, 16, 16, 8, 8, 8, 8, 0, 8, 0, 0];
PrinceJS.Enemy.EXTRA_STRENGTH = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
PrinceJS.Enemy.STRENGTH = [4, 3, 3, 3, 3, 4, 5, 4, 4, 5, 5, 5, 4, 6, 10, 0];
PrinceJS.Enemy.COLOR = [0x4890fc, 0xa83000, 0xfc5000, 0x0c9000, 0x5a00fc, 0xc858fc, 0xfcfc00];

PrinceJS.Enemy.prototype = Object.create(PrinceJS.Fighter.prototype);
PrinceJS.Enemy.prototype.constructor = PrinceJS.Enemy;

PrinceJS.Enemy.prototype.updateActor = function () {
  this.updateSplash();
  this.updateBehaviour();
  this.processCommand();
  this.updateAcceleration();
  this.updateVelocity();
  this.checkFight();
  this.checkSpikes();
  this.checkChoppers();
  this.checkFloor();
  this.checkButton();
  this.checkRoomChange();
  this.updateCharPosition();
  this.updateSwordPosition();
};

PrinceJS.Enemy.prototype.CMD_TAP = function (data) {
  if (this.charName !== "shadow" || !this.visible) {
    return;
  }
  if (["softLand"].includes(this.action)) {
    return;
  }
  if (data.p1 === 1) {
    this.game.sound.play("Footsteps");
  } else if (data.p1 === 2) {
    this.game.sound.play("BumpIntoWallHard");
  }
};

PrinceJS.Enemy.prototype.updateBehaviour = function () {
  if (this.opponent == null || !this.alive) {
    return;
  }
  if (!this.opponent.alive) {
    return;
  }
  if (this.active && !this.startFight && this.opponentCloseRoom(this.opponent, this.room)) {
    PrinceJS.Utils.delayed(() => {
      if (this.active && !this.startFight && this.opponentCloseRoom(this.opponent, this.room)) {
        this.startFight = true;
      }
    }, 500);
  }

  if (this.refracTimer > 0) {
    this.refracTimer--;
  }
  if (this.blockTimer > 0) {
    this.blockTimer--;
  }
  if (this.strikeTimer > 0) {
    this.strikeTimer--;
  }

  if (
    this.action === "stabbed" ||
    this.action === "stabkill" ||
    this.action === "dropdead" ||
    this.action === "stepfall"
  ) {
    return;
  }

  let distance = this.opponentDistance();
  if (distance === -999) {
    return;
  }

  if (this.swordDrawn) {
    if (distance >= 35) {
      this.oppTooFar(distance);
    } else if (distance < -20) {
      this.turnengarde();
    } else if (distance < 12) {
      this.oppTooClose(distance);
    } else {
      this.oppInRange(distance);
    }
  } else {
    if (this.canReachOpponent(this.lookBelow) || this.canSeeOpponent(this.lookBelow)) {
      this.engarde();
    }
  }
};

PrinceJS.Enemy.prototype.enemyAdvance = function () {
  if (!this.startFight) {
    return;
  }

  if (!this.canReachOpponent(this.lookBelow) && !this.canSeeOpponent(this.lookBelow)) {
    this.swordDrawn = false;
    this.stand();
    return;
  }

  let tileF = this.level.getTileAt(this.charBlockX + this.charFace, this.charBlockY, this.room);

  if (tileF.isSafeWalkable()) {
    this.advance();
  } else {
    this.retreat();
  }
};

PrinceJS.Enemy.prototype.engarde = function () {
  if (!this.startFight) {
    return;
  }

  this.lookBelow = true;
  PrinceJS.Fighter.prototype.engarde.call(this);
};

PrinceJS.Enemy.prototype.retreat = function () {
  if (!this.canReachOpponent(this.lookBelow)) {
    return;
  }

  if (
    !this.action.includes("turn") &&
    !this.opponent.action.includes("turn") &&
    this.charFace === this.opponent.charFace
  ) {
    this.turnengarde();
    return;
  }

  let tileR = this.level.getTileAt(this.charBlockX - this.charFace, this.charBlockY, this.room);
  if (tileR.isSafeWalkable()) {
    PrinceJS.Fighter.prototype.retreat.call(this);
  }
};

PrinceJS.Enemy.prototype.advance = function () {
  if (!this.canReachOpponent(this.lookBelow)) {
    return;
  }

  let tileF = this.level.getTileAt(this.charBlockX + this.charFace, this.charBlockY, this.room);
  if (tileF.isSafeWalkable()) {
    PrinceJS.Fighter.prototype.advance.call(this);
  }
};

PrinceJS.Enemy.prototype.oppTooFar = function (distance) {
  if (this.refracTimer !== 0) {
    return;
  }
  if (this.opponent.action === "running" && distance < 40) {
    this.strike();
    return;
  }
  if (this.opponent.action === "runjump" && distance < 50) {
    this.strike();
    return;
  }

  this.enemyAdvance();
};

PrinceJS.Enemy.prototype.oppTooClose = function () {
  if (this.charFace === this.opponent.charFace) {
    this.retreat();
  } else {
    this.advance();
  }
};

PrinceJS.Enemy.prototype.oppInRange = function (distance) {
  if (!this.opponent.swordDrawn) {
    if (this.refracTimer === 0) {
      if (distance < 25) {
        this.strike();
      } else {
        this.advance();
      }
    }
  } else {
    this.oppInRangeArmed(distance);
  }
};

PrinceJS.Enemy.prototype.oppInRangeArmed = function (distance) {
  if (!this.opponentOnSameLevel()) {
    return;
  }
  if (distance < 10 || distance >= 29) {
    this.tryAdvance();
  } else {
    this.tryBlock();
    if (this.refracTimer === 0) {
      if (distance < 12) {
        this.tryAdvance();
      } else {
        this.tryStrike();
      }
    }
  }
};

PrinceJS.Enemy.prototype.tryAdvance = function () {
  if (this.charSkill === 0 || this.strikeTimer === 0) {
    if (this.advanceProbability > this.game.rnd.between(0, 254)) {
      this.advance();
    }
  }
};

PrinceJS.Enemy.prototype.tryBlock = function () {
  if (
    this.opponent.frameID(152, 153) ||
    this.opponent.frameID(162) ||
    this.opponent.frameID(2, 3) ||
    this.opponent.frameID(12)
  ) {
    if (this.blockTimer !== 0) {
      if (this.impairblockProbability > this.game.rnd.between(0, 254)) {
        this.block();
      }
    } else {
      if (this.blockProbability > this.game.rnd.between(0, 254)) {
        this.block();
      }
    }
  }
};

PrinceJS.Enemy.prototype.tryStrike = function () {
  if (
    this.opponent.frameID(169) ||
    this.opponent.frameID(151) ||
    this.opponent.frameID(19) ||
    this.opponent.frameID(1)
  ) {
    return;
  }
  if (this.frameID(150)) {
    if (this.restrikeProbability > this.game.rnd.between(0, 254)) {
      this.strike();
    }
  } else {
    if (this.strikeProbability > this.game.rnd.between(0, 254)) {
      this.strike();
    }
  }
};

PrinceJS.Enemy.prototype.resetRefracTimer = function () {
  this.refracTimer = PrinceJS.Enemy.REFRAC_TIMER[this.charSkill];
};

PrinceJS.Enemy.prototype.resetBlockTimer = function () {
  this.blockTimer = 4;
};

PrinceJS.Enemy.prototype.resetStrikeTimer = function () {
  this.strikeTimer = 15;
};

PrinceJS.Enemy.prototype.fastsheathe = function () {
  if (this.charName === "shadow") {
    this.setInactive();
    this.action = "fastsheathe";
    this.swordDrawn = false;
  }
};

PrinceJS.Enemy.prototype.setVisible = function () {
  this.visible = true;
  this.sword.visible = true;
};

PrinceJS.Enemy.prototype.setInvisible = function () {
  this.visible = false;
  this.sword.visible = false;
};

PrinceJS.Enemy.prototype.setActive = function () {
  this.setVisible();
  this.active = true;
  if (this.charName === "skeleton") {
    this.action = "arise";
  }
};

PrinceJS.Enemy.prototype.setInactive = function () {
  this.active = false;
  this.startFight = false;
  if (this.charName === "skeleton") {
    this.action = "laydown";
  }
};

PrinceJS.Enemy.prototype.appearOutOfMirror = function (mirror) {
  this.charX = PrinceJS.Utils.convertBlockXtoX(mirror.roomX) + 20;
  this.charY = PrinceJS.Utils.convertBlockYtoY(mirror.roomY) - 14;
  this.action = "runjumpdown";
  this.charFrame = 42;
  this.updateBlockXY();
  this.updateCharPosition();
  this.processCommand();
  this.setVisible();
};
