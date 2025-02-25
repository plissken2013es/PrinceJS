"use strict";

PrinceJS.Kid = function (game, level, location, direction, room) {
  PrinceJS.Fighter.call(this, game, level, location, direction, room, "kid");

  this.onNextLevel = new Phaser.Signal();
  this.onRecoverLive = new Phaser.Signal();
  this.onAddLive = new Phaser.Signal();

  this.pickupSword = false;
  this.pickupPotion = false;

  this.allowCrawl = true;
  this.charRepeat = false;
  this.recoverCrop = false;
  this.checkFloorStepFall = false;
  this.backwardsFall = 1;

  this.cursors = this.game.input.keyboard.createCursorKeys();
  this.shiftKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);

  this.registerCommand(0xfd, this.CMD_UP); // 253
  this.registerCommand(0xfc, this.CMD_DOWN); // 252
  this.registerCommand(0xf7, this.CMD_IFWTLESS); // 247
  this.registerCommand(0xf5, this.CMD_JARU); // 245
  this.registerCommand(0xf4, this.CMD_JARD); // 244
  this.registerCommand(0xf3, this.CMD_EFFECT); // 243
  this.registerCommand(0xf1, this.CMD_NEXTLEVEL); // 241

  this.maxHealth = PrinceJS.maxHealth;
  this.health = this.maxHealth;

  this.hasSword = PrinceJS.currentLevel > 1;
  this.blockEngarde = false;
  this.bumpTimer = 0;
  this.shadowFlashTimer = 0;
  this.opponentSync = false;
};

PrinceJS.Kid.prototype = Object.create(PrinceJS.Fighter.prototype);
PrinceJS.Kid.prototype.constructor = PrinceJS.Kid;

PrinceJS.Kid.prototype.CMD_UP = function (data) {
  if (this.charBlockY === 0) {
    this.charY += 189;
    this.baseY -= 189;
    this.charBlockY = 2;
    if (this.level.rooms[this.room]) {
      this.room = this.level.rooms[this.room].links.up;
      this.onChangeRoom.dispatch(this.room);
    }
  }
};

PrinceJS.Kid.prototype.CMD_DOWN = function (data) {
  if (this.charBlockY === 2 && this.charY > 189) {
    this.charY -= 189;
    this.baseY += 189;
    this.charBlockY = 0;
    if (this.level.rooms[this.room]) {
      this.room = this.level.rooms[this.room].links.down;
      this.onChangeRoom.dispatch(this.room);
    }
  }
};

PrinceJS.Kid.prototype.CMD_IFWTLESS = function (data) {
  if (this.inFloat) {
    if (this.action === "stepfall") {
      this.action = "stepfloat";
    }
    if (this.action === "bumpfall") {
      this.action = "bumpfloat";
    }
    if (this.action === "highjump") {
      this.action = "superhighjump";
    }
  }
};

PrinceJS.Kid.prototype.CMD_EFFECT = function (data) {};

PrinceJS.Kid.prototype.CMD_TAP = function (data) {
  if (["softLand"].includes(this.action)) {
    return;
  }
  if (data.p1 === 1) {
    this.game.sound.play("Footsteps");
  } else if (data.p1 === 2) {
    this.game.sound.play("BumpIntoWallHard");
  }
};

PrinceJS.Kid.prototype.CMD_JARU = function (data) {
  this.level.shakeFloor(this.charBlockY - 1, this.room);
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY - 1, this.room);
  if (tile.element === PrinceJS.Level.TILE_LOOSE_BOARD) {
    tile.shake(true);
  }
  let tileR = this.level.getTileAt(this.charBlockX + 1, this.charBlockY - 1, this.room);
  if (tileR.element === PrinceJS.Level.TILE_LOOSE_BOARD) {
    tileR.shake(true);
  }
};

PrinceJS.Kid.prototype.CMD_JARD = function (data) {
  this.level.shakeFloor(this.charBlockY, this.room);
};

PrinceJS.Kid.prototype.CMD_NEXTLEVEL = function (data) {
  PrinceJS.maxHealth = this.maxHealth;
  let waitTime = 0;
  if (PrinceJS.currentLevel === 4) {
    this.game.sound.play("TheShadow");
    waitTime = 9000;
  } else if (PrinceJS.currentLevel < 13) {
    this.game.sound.play("Prince");
    waitTime = 13000;
  }
  PrinceJS.Utils.delayed(() => {
    this.onNextLevel.dispatch(PrinceJS.currentLevel);
  }, waitTime);
};

PrinceJS.Kid.prototype.showShadowOverlay = function () {
  this.shadowOverlay = this.game.make.sprite(0, 0, "shadow", "shadow-15");
  this.shadowOverlay.anchor.setTo(0, 1);
  this.addChild(this.shadowOverlay);
  this.delegate = {
    syncFrame: (actor) => {
      this.shadowOverlay.frameName = "shadow-" + actor.frameName.split("-")[1];
    },
    syncFace: (actor) => {
      this.shadowOverlay.charFace = actor.charFace;
    }
  };
};

PrinceJS.Kid.prototype.hideShadowOverlay = function () {
  this.shadowOverlay.visible = false;
  this.delegate = null;
};

PrinceJS.Kid.prototype.updateActor = function () {
  this.updateTimer();
  this.updateSplash();
  this.updateBehaviour();
  this.processCommand();
  this.updateAcceleration();
  this.updateVelocity();
  this.checkFight();
  this.checkSpikes();
  this.checkChoppers();
  this.checkBarrier();
  this.checkButton();
  this.checkFloor();
  this.checkRoomChange();
  this.updateCharPosition();
  this.updateSwordPosition();
  this.maskAndCrop();
};

PrinceJS.Kid.prototype.drinkPotion = function () {
  let tile = this.level.getTileAt(this.charBlockX + this.charFace, this.charBlockY, this.room);
  if (tile.element !== PrinceJS.Level.TILE_POTION) {
    tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  }
  this.game.sound.play("DrinkPotionGlugGlug");
  this.action = "drinkpotion";
  this.pickupPotion = false;
  this.allowCrawl = true;
  let potionType = tile.modifier;
  this.level.removeObject(tile.roomX, tile.roomY, tile.room);
  PrinceJS.Utils.delayed(() => {
    switch (potionType) {
      case PrinceJS.Level.POTION_RECOVER:
        PrinceJS.Utils.flashRedPotion(this.game);
        this.game.sound.play("Potion1");
        this.recoverLife();
        break;
      case PrinceJS.Level.POTION_ADD:
        PrinceJS.Utils.flashRedPotion(this.game);
        this.game.sound.play("Potion2");
        this.addLife();
        break;
      case PrinceJS.Level.POTION_BUFFER:
        PrinceJS.Utils.flashGreenPotion(this.game);
        this.floatFall();
        break;
      case PrinceJS.Level.POTION_FLIP:
        this.flipScreen();
        break;
      case PrinceJS.Level.POTION_DAMAGE:
        PrinceJS.Utils.flashRedPotion(this.game);
        this.game.sound.play("StabbedByOpponent");
        this.damageLife();
        break;
    }
  }, 1000);
};

PrinceJS.Kid.prototype.gotSword = function () {
  this.action = "pickupsword";
  PrinceJS.Utils.flashYellowSword(this.game);
  this.game.sound.play("Victory");
  this.pickupSword = false;
  this.allowCrawl = true;
  this.level.removeObject(this.charBlockX + this.charFace, this.charBlockY, this.room);
  this.hasSword = true;
};

PrinceJS.Kid.prototype.updateTimer = function () {
  if (this.bumpTimer > 0) {
    this.bumpTimer--;
  }
  if (this.shadowFlashTimer === 1) {
    this.hideShadowOverlay();
    this.shadowFlashTimer--;
  }
  if (this.shadowFlashTimer > 1) {
    this.shadowOverlay.visible = this.shadowFlashTimer % 2 === 0;
    this.shadowFlashTimer--;
  }
};

PrinceJS.Kid.prototype.updateBehaviour = function () {
  if (this.firstLand) {
    return;
  }

  if (!this.keyL() && this.faceL()) {
    this.allowCrawl = this.allowAdvance = true;
  }
  if (!this.keyR() && this.faceR()) {
    this.allowCrawl = this.allowAdvance = true;
  }
  if (!this.keyL() && this.faceR()) {
    this.allowRetreat = true;
  }
  if (!this.keyR() && this.faceL()) {
    this.allowRetreat = true;
  }
  if (!this.keyU()) {
    this.allowBlock = true;
  }
  if (!this.keyS()) {
    this.allowStrike = true;
  }

  let tile, tileT;
  switch (this.action) {
    case "stand":
      if (!this.flee && this.canReachOpponent() && this.facingOpponent() && this.hasSword) {
        if (this.tryEngarde()) {
          return;
        }
      }
      if (this.flee && this.keyS() && this.canReachOpponent() && this.facingOpponent() && this.hasSword) {
        if (this.tryEngarde()) {
          return;
        }
      }
      if (this.keyL() && this.faceR()) {
        return this.turn();
      }
      if (this.keyR() && this.faceL()) {
        return this.turn();
      }
      if (this.keyL() && this.keyU() && this.faceL()) {
        return this.standjump();
      }
      if (this.keyR() && this.keyU() && this.faceR()) {
        return this.standjump();
      }
      if (this.keyL() && this.keyS() && this.faceL()) {
        return this.step();
      }
      if (this.keyR() && this.keyS() && this.faceR()) {
        return this.step();
      }
      if (this.keyL() && this.faceL()) {
        return this.startrun();
      }
      if (this.keyR() && this.faceR()) {
        return this.startrun();
      }
      if (this.keyU()) {
        return this.jump();
      }
      if (this.keyD()) {
        return this.stoop();
      }
      if (this.keyS()) {
        return this.tryPickup();
      }
      break;

    case "startrun":
      this.blockEngarde = false;
      this.charRepeat = false;
      if (this.frameID(1, 3)) {
        if (this.keyU()) {
          return this.standjump();
        }
        if (this.keyU()) {
          return this.standjump();
        }
        if (this.keyU()) {
          return this.standjump();
        }
      } else {
        if (this.keyU()) {
          return this.runjump();
        }
      }
      break;

    case "running":
      this.charRepeat = false;
      if (this.keyL() && this.faceR()) {
        return this.runturn();
      }
      if (this.keyR() && this.faceL()) {
        return this.runturn();
      }
      if (!this.keyL() && this.faceL()) {
        return this.runstop();
      }
      if (!this.keyR() && this.faceR()) {
        return this.runstop();
      }
      if (this.keyU()) {
        return this.runjump();
      }
      if (this.keyD()) {
        return this.rdiveroll();
      }
      break;

    case "turn":
      this.charRepeat = false;
      if (this.keyL() && this.faceL() && this.frameID(48)) {
        return this.turnrun();
      }
      if (this.keyR() && this.faceR() && this.frameID(48)) {
        return this.turnrun();
      }
      break;

    case "stoop":
      this.charRepeat = false;
      if (this.pickupSword && this.frameID(109)) {
        return this.gotSword();
      }
      if (this.pickupPotion && this.frameID(109)) {
        return this.drinkPotion();
      }
      if (!this.keyD() && this.frameID(109)) {
        return this.standup();
      }
      if (this.keyL() && this.faceL() && this.allowCrawl) {
        return this.crawl();
      }
      if (this.keyR() && this.faceR() && this.allowCrawl) {
        return this.crawl();
      }
      break;

    case "hang":
      this.charRepeat = false;
      tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
      if (tile.isBarrier()) {
        this.action = "hangstraight";
      }
      tileT = this.level.getTileAt(this.charBlockX, this.charBlockY - 1, this.room);
      if (tileT.element === PrinceJS.Level.TILE_LOOSE_BOARD) {
        tileT.shake(true);
        if (tileT.fallStarted()) {
          this.startFall();
        }
      }
      if (this.keyU()) {
        return this.climbup();
      }
      if (!this.keyS()) {
        return this.startFall();
      }
      break;

    case "hangstraight":
      this.charRepeat = false;
      if (this.keyU()) {
        return this.climbup();
      }
      if (!this.keyS()) {
        return this.startFall();
      }
      break;

    case "jumpfall":
    case "rjumpfall":
    case "bumpfall":
    case "stepfall":
    case "freefall":
      this.charRepeat = false;
      if (this.keyS()) {
        return this.tryGrabEdge();
      }
      break;

    case "engarde":
      this.charRepeat = false;
      if (this.keyL() && this.faceL() && this.allowAdvance) {
        return this.advance();
      }
      if (this.keyR() && this.faceR() && this.allowAdvance) {
        return this.advance();
      }
      if (this.keyL() && this.faceR() && this.allowRetreat) {
        return this.retreat();
      }
      if (this.keyR() && this.faceL() && this.allowRetreat) {
        return this.retreat();
      }
      if (this.keyU() && this.allowBlock) {
        return this.block();
      }
      if (this.keyS() && this.allowStrike) {
        return this.strike();
      }
      if (this.keyD()) {
        return this.fastsheathe();
      }
      break;

    case "advance":
    case "blockedstrike":
      this.charRepeat = false;
      if (this.keyU() && this.allowBlock) {
        return this.block();
      }
      break;

    case "retreat":
    case "strike":
    case "block":
      this.charRepeat = false;
      if (this.keyS() && this.allowStrike) {
        return this.strike();
      }
      break;

    case "climbup":
    case "climbdown":
      this.charRepeat = false;
      tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
      if (tile.element === PrinceJS.Level.TILE_LOOSE_BOARD && tile.fallStarted()) {
        this.startFall();
      } else if (this.frameID(142) && tile.element === PrinceJS.Level.TILE_SPACE) {
        this.startFall();
      }
      break;
  }
};

PrinceJS.Kid.prototype.tryEngarde = function () {
  if (this.blockEngarde) {
    return false;
  }

  if (this.opponent && this.opponent.alive && this.opponentDistance() < 100) {
    this.engarde();
    return true;
  }
  return false;
};

PrinceJS.Kid.prototype.inFallDistance = function (tile) {
  if (
    [PrinceJS.Level.TILE_SPACE, PrinceJS.Level.TILE_TOP_BIG_PILLAR, PrinceJS.Level.TILE_TAPESTRY_TOP].includes(
      tile.element
    )
  ) {
    return true;
  }
  if (this.x === 0 || !["runstop", "runturn", "runjump", "standjump"].includes(this.action)) {
    return true;
  }
  let offsetX = this.faceL() ? 10 : -14;
  return Math.abs(tile.centerX - this.centerX + offsetX) >= 25;
};

PrinceJS.Kid.prototype.checkLooseFloor = function (tile) {
  if (this.standsOnTile(tile) && this.inLooseFloorDistance(tile)) {
    this.damageStruck();
  }
};

PrinceJS.Kid.prototype.inGrabDistance = function (tile) {
  let offsetX = this.faceL() ? 2 : -5;
  return Math.abs(tile.centerX - this.centerX + offsetX) <= 30;
};

PrinceJS.Kid.prototype.tryGrabEdge = function () {
  let tileT = this.level.getTileAt(this.charBlockX, this.charBlockY - 1, this.room);
  let tileTF = this.level.getTileAt(this.charBlockX + this.charFace, this.charBlockY - 1, this.room);
  let tileTR = this.level.getTileAt(this.charBlockX - this.charFace, this.charBlockY - 1, this.room);

  let isInDistance =
    this.distanceToEdge() <= 10 + (["stepfall"].includes(this.action) ? 3 : 0) &&
    (this.distanceToTopFloor() >= -50 ||
      (["jumpfall", "freefall"].includes(this.action) && this.distanceToFloor() >= -3));

  if (
    tileTF.isWalkable() &&
    [PrinceJS.Level.TILE_SPACE, PrinceJS.Level.TILE_TOP_BIG_PILLAR, PrinceJS.Level.TILE_TAPESTRY_TOP].includes(
      tileT.element
    ) &&
    isInDistance &&
    this.inGrabDistance(tileTF)
  ) {
    return this.grab(this.charBlockX);
  } else {
    if (
      tileT.isWalkable() &&
      [PrinceJS.Level.TILE_SPACE, PrinceJS.Level.TILE_TOP_BIG_PILLAR, PrinceJS.Level.TILE_TAPESTRY_TOP].includes(
        tileTR.element
      ) &&
      isInDistance &&
      this.inGrabDistance(tileT)
    ) {
      return this.grab(this.charBlockX - this.charFace);
    }
  }
};

PrinceJS.Kid.prototype.grab = function (x) {
  this.updateBlockXY();
  if (this.faceL()) {
    this.charX = PrinceJS.Utils.convertBlockXtoX(x) - 3;
  } else {
    this.charX = PrinceJS.Utils.convertBlockXtoX(x + 1) + 1;
  }
  this.charY = PrinceJS.Utils.convertBlockYtoY(this.charBlockY);
  this.charXVel = 0;
  this.charYVel = 0;
  this.stopFall();
  this.updateBlockXY();
  this.action = "hang";
  this.processCommand();

  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY - 1, this.room);
  if (tile.element === PrinceJS.Level.TILE_LOOSE_BOARD) {
    tile.shake(true);
  }
};

PrinceJS.Kid.prototype.checkBarrier = function () {
  if (!this.alive) {
    return;
  }
  if (
    ["jumpup", "highjump", "jumphanglong", "climbup", "climbdown", "climbfail", "stand", "standup", "turn"].includes(
      this.action
    )
  ) {
    return;
  }
  if (this.action.substring(0, 4) === "step" || this.action.substring(0, 4) === "hang") {
    return;
  }

  let tileT = this.level.getTileAt(this.charBlockX, this.charBlockY - 1, this.room);

  if (this.action === "freefall" && tileT.isBarrier()) {
    if (this.moveL()) {
      this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX + 1) - 1;
    } else if (this.moveR()) {
      this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX);
    }
    this.updateBlockXY();
    this.bump();
    return;
  }

  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);

  if (this.moveR() && tile.isBarrier()) {
    if (tile.element === PrinceJS.Level.TILE_MIRROR) {
      return;
    }
    if (tile.intersects(this.getCharBounds()) || tile.intersectsAbs(this.getCharBoundsAbs())) {
      this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 10;
      this.updateBlockXY();
      this.bump();
    }
  } else {
    let offsetX = this.swordDrawn ? 12 * this.charFace : 0;
    let blockX = PrinceJS.Utils.convertXtoBlockX(this.charX + this.charFdx * this.charFace - offsetX);
    let tileNext = this.level.getTileAt(blockX, this.charBlockY, this.room);

    if (tileNext.isBarrier()) {
      switch (tileNext.element) {
        case PrinceJS.Level.TILE_WALL:
          if (!this.swordDrawn) {
            if (this.moveL()) {
              this.charX = PrinceJS.Utils.convertBlockXtoX(blockX + 1) - 1;
            } else if (this.moveR()) {
              this.charX = PrinceJS.Utils.convertBlockXtoX(blockX);
            }
            this.updateBlockXY();
          }
          this.bump();
          break;

        case PrinceJS.Level.TILE_GATE:
        case PrinceJS.Level.TILE_TAPESTRY:
        case PrinceJS.Level.TILE_TAPESTRY_TOP:
          if (
            this.moveL() &&
            (tileNext.intersects(this.getCharBounds()) || tileNext.intersectsAbs(this.getCharBoundsAbs()))
          ) {
            if (this.action === "stand" && tile.element === PrinceJS.Level.TILE_GATE) {
              this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 3;
              this.updateBlockXY();
            } else {
              if (this.centerX - 5 > tileNext.centerX) {
                this.charX = PrinceJS.Utils.convertBlockXtoX(blockX + 1) - 1;
                this.updateBlockXY();
                this.bump();
              }
            }
          }
          break;
      }
    }

    tileNext = this.level.getTileAt(blockX - this.charFace, this.charBlockY, this.room);
    if (tileNext && tileNext.isBarrier()) {
      switch (tileNext.element) {
        case PrinceJS.Level.TILE_MIRROR:
          if (this.moveL() && this.action !== "runjump") {
            this.charX += 5;
            this.bump();
          }
          break;
      }
    }
  }
};

PrinceJS.Kid.prototype.getCharBoundsAbs = function () {
  return new Phaser.Rectangle(this.x, this.y - this.height, this.width, this.height);
};

PrinceJS.Kid.prototype.getCharBounds = function () {
  let f = this.game.cache.getFrameData("kid").getFrameByName("kid-" + this.charFrame);

  let x = PrinceJS.Utils.convertX(this.charX + this.charFdx * this.charFace);
  let y = this.charY + this.charFdy - f.height;

  if (this.faceR()) {
    x -= f.width - 5;
  }

  if ((this.charFood && this.faceL()) || (!this.charFood && this.faceR())) {
    x += 1;
  }

  return new Phaser.Rectangle(x, y, f.width, f.height);
};

PrinceJS.Kid.prototype.bump = function () {
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);

  if (tile.isSpace()) {
    this.charX -= 2 * this.charFace * this.backwardsFall;
    this.bumpFall();
  } else {
    let y = this.distanceToFloor();
    if (y >= 5) {
      this.bumpFall();
    } else {
      if (this.frameID(24, 25) || this.frameID(40, 42) || this.frameID(102, 106)) {
        this.charX -= 5 * this.charFace;
        this.land();
      } else {
        tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
        if (!this.swordDrawn && !tile.isWalkable() && this.action !== "highjump") {
          this.charX -= 5 * this.charFace;
        }

        if (this.swordDrawn) {
          if (this.moveR()) {
            this.charX -= 5;
          } else if (this.moveL()) {
            this.charX += 5;
          } else {
            this.charX += 5 * this.charFace;
          }
          this.bumpSound();
        } else if (!["softland", "medland"].includes(this.action)) {
          this.blockEngarde = true;
          this.setBump();
          this.processCommand();
        }
      }
    }
  }
};

PrinceJS.Kid.prototype.setBump = function () {
  this.bumpSound();
  this.action = "bump";
  this.alignToFloor();
};

PrinceJS.Kid.prototype.bumpSound = function () {
  if (this.bumpTimer === 0) {
    this.game.sound.play("BumpIntoWallSoft");
    this.bumpTimer = 10;
  }
};

PrinceJS.Kid.prototype.bumpFall = function () {
  this.inFallDown = true;
  if (this.actionCode === 4) {
    this.charX -= this.charFace * this.backwardsFall;
    this.charXVel = 0;
  } else {
    this.charX -= 2 * this.charFace * this.backwardsFall;
    this.bumpSound();
    this.action = "bumpfall";
    this.processCommand();
  }
};

PrinceJS.Kid.prototype.fastsheathe = function () {
  this.flee = true;
  this.action = "fastsheathe";
  this.swordDrawn = false;
  if (this.opponent !== null) {
    this.opponent.fastsheathe();
    this.opponent.refracTimer = 9;
  }
};

PrinceJS.Kid.prototype.block = function () {
  if (this.frameID(158) || this.frameID(165)) {
    if (this.opponent !== null) {
      if (this.opponent.frameID(18)) {
        return;
      }
      this.action = "block";
      if (this.opponent.frameID(3)) {
        this.processCommand();
      }
    }
  } else {
    if (!this.frameID(167)) {
      return;
    }
    this.action = "striketoblock";
  }

  this.allowBlock = false;
};

PrinceJS.Kid.prototype.checkButton = function () {
  let checkCharBlockX = this.charBlockX;
  let checkCharBlockY = this.charBlockY;
  let checkCharFcheck = this.charFcheck;

  if (
    ["hang", "hangstraight"].includes(this.action) ||
    (this.action === "climbup" && this.frameID(135, 140)) ||
    (this.action === "climbdown" && this.frameID(91, 141))
  ) {
    checkCharBlockY = checkCharBlockY - 1;
  }
  if (["hang", "hangstraight", "climbup", "climbdown", "runturn"].includes(this.action)) {
    checkCharFcheck = true;
  }

  switch (this.actionCode) {
    case 0: // stand
    case 1: // running
    case 2: // hang
    case 5: // bump
    case 6: // hangstraight
    case 7: // turn
      if (checkCharFcheck) {
        let tile = this.level.getTileAt(checkCharBlockX, checkCharBlockY, this.room);
        switch (tile.element) {
          case PrinceJS.Level.TILE_RAISE_BUTTON:
          case PrinceJS.Level.TILE_DROP_BUTTON:
            tile.push();
            break;
        }
      }
      break;
  }
};

PrinceJS.Kid.prototype.checkFloor = function () {
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  let tileR = this.level.getTileAt(this.charBlockX - this.charFace, this.charBlockY, this.room);

  if (this.action === "climbdown" && ![PrinceJS.Level.TILE_LOOSE_BOARD].includes(tile.element)) {
    return;
  }
  if (this.action === "climbup" && ![PrinceJS.Level.TILE_LOOSE_BOARD].includes(tile.element)) {
    return;
  }

  let checkCharFcheck = this.charFcheck;
  if (this.action === "runturn") {
    checkCharFcheck = true;
  }

  switch (this.actionCode) {
    case 0: // stand
    case 1: // running
    case 5: // bump
    case 7: // turn
      this.inFallDown = false;
      if (checkCharFcheck) {
        switch (tile.element) {
          case PrinceJS.Level.TILE_FLOOR:
            if (tile.hidden) {
              tile.hidden = false;
              tile.revalidate();
            }
            break;
          case PrinceJS.Level.TILE_SPACE:
          case PrinceJS.Level.TILE_TOP_BIG_PILLAR:
          case PrinceJS.Level.TILE_TAPESTRY_TOP:
            if (!this.alive) {
              return;
            }
            if (this.inFallDistance(tileR)) {
              this.startFall();
            }
            break;

          case PrinceJS.Level.TILE_LOOSE_BOARD:
            tile.shake(true);
            break;

          case PrinceJS.Level.TILE_SPIKES:
            tile.raise();
            if (
              (this.inSpikeDistance(tile) &&
                ["running", "runjump", "runturn", "softland", "medland"].includes(this.action)) ||
              (this.action === "standjump" && this.frameID(26, 28))
            ) {
              this.game.sound.play("SpikedBySpikes"); // HardLandingSplat
              this.alignToTile(tile);
              this.dieSpikes();
            }
            break;
        }
      }
      break;

    case 3: // stepfall
    case 4: // freefall
      this.inFallDown = true;

      if (this.actionCode === 3 && !this.checkFloorStepFall) {
        return;
      }
      this.checkFloorStepFall = false;

      if (this.charY >= PrinceJS.Utils.convertBlockYtoY(this.charBlockY)) {
        tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);

        if (tile.isWalkable()) {
          this.land();
        } else {
          if (tile.isBarrier()) {
            this.charX -= (tile.isBarrierLeft() ? 10 : 5) * this.charFace;
          }
          this.level.maskTile(this.charBlockX + 1, this.charBlockY, this.room);
        }
      }
      break;
  }
};

PrinceJS.Kid.prototype.moveR = function () {
  if (["stoop", "bump", "stand", "turn", "turnengarde", "engarde"].includes(this.action)) {
    return false;
  }
  return (
    (this.faceL() && ["retreat", "stabbed"].includes(this.action)) ||
    (this.faceR() && !["retreat", "stabbed"].includes(this.action))
  );
};

PrinceJS.Kid.prototype.moveL = function () {
  if (["stoop", "bump", "stand", "turn", "turnengarde", "engarde"].includes(this.action)) {
    return false;
  }
  return (
    (this.faceR() && ["retreat", "stabbed"].includes(this.action)) ||
    (this.faceL() && !["retreat", "stabbed"].includes(this.action))
  );
};

PrinceJS.Kid.prototype.checkRoomChange = function () {
  let footX = this.charX + this.charFdx * this.charFace;
  let footBlockX = PrinceJS.Utils.convertXtoBlockX(footX);

  if (footBlockX >= 9 && this.moveR()) {
    let cameraRoom = this.room;
    if (footX > 142 || (this.swordDrawn && (footX > 130 || footX < 0))) {
      // Camera check
      if (this.level.rooms[this.room]) {
        cameraRoom = this.level.rooms[this.room].links.right;
      }
    }
    this.onChangeRoom.dispatch(this.room, cameraRoom);
  }

  if (this.moveL() && (footBlockX === 8 || (footBlockX === 9 && footX < 134))) {
    this.onChangeRoom.dispatch(this.room);
  }

  if (this.charY > 189) {
    this.charY -= 189;
    this.baseY += 189;
    if (this.level.rooms[this.room]) {
      this.room = this.level.rooms[this.room].links.down;
      this.onChangeRoom.dispatch(this.room);
    }
  }
};

PrinceJS.Kid.prototype.maskAndCrop = function () {
  // Mask climbing
  if (this.faceR() && this.charFrame > 134 && this.charFrame < 145) {
    this.frameName += "r";
  }

  // Mask hanging
  if (this.faceR() && this.action.substring(0, 4) === "hang") {
    this.level.maskTile(this.charBlockX, this.charBlockY - 1, this.room);
  } else if (this.faceR() && this.action.substring(0, 4) === "jumphanglong" && this.frameID(79)) {
    this.level.maskTile(this.charBlockX, this.charBlockY - 1, this.room);
  } else if (this.faceR() && this.action.substring(0, 4) === "jumpbackhang" && this.frameID(79)) {
    this.level.maskTile(this.charBlockX, this.charBlockY - 1, this.room);
  } else if (this.faceR() && this.action === "climbdown" && this.frameID(91)) {
    this.level.maskTile(this.charBlockX, this.charBlockY - 1, this.room);
  }

  // Unmask falling / hangdroping
  if (this.frameID(15) || this.frameID(158) || (this.faceL() && this.action === "hang")) {
    this.level.unMaskTile();
  }

  // Crop in jumpup
  if (this.recoverCrop) {
    this.crop(null);
    this.recoverCrop = false;
  }

  if (this.inJumpUp && this.frameID(78, 79)) {
    this.crop(new Phaser.Rectangle(0, 7, -this.width * this.charFace, this.height));
  }

  if (this.inJumpUp && this.frameID(81)) {
    this.crop(null);
    this.crop(new Phaser.Rectangle(0, 3, -this.width * this.charFace, this.height));
    this.inJumpUp = false;
    this.recoverCrop = true;
  }
};

PrinceJS.Kid.prototype.tryPickup = function () {
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  let tileF = this.level.getTileAt(this.charBlockX + this.charFace, this.charBlockY, this.room);

  this.pickupSword = tile.element === PrinceJS.Level.TILE_SWORD || tileF.element === PrinceJS.Level.TILE_SWORD;
  this.pickupPotion = tile.element === PrinceJS.Level.TILE_POTION || tileF.element === PrinceJS.Level.TILE_POTION;

  if (this.pickupPotion || this.pickupSword) {
    if (this.faceR()) {
      if (tileF.element === PrinceJS.Level.TILE_POTION || tileF.element === PrinceJS.Level.TILE_SWORD) {
        this.charBlockX++;
      }
      this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 1 * this.pickupPotion;
    }
    if (this.faceL()) {
      if (tile.element === PrinceJS.Level.TILE_POTION || tile.element === PrinceJS.Level.TILE_SWORD) {
        this.charBlockX++;
      }
      this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) - 3;
    }
    this.action = "stoop";
    this.allowCrawl = false;
  }
};

PrinceJS.Kid.prototype.keyL = function () {
  return this.cursors.left.isDown;
};

PrinceJS.Kid.prototype.keyR = function () {
  return this.cursors.right.isDown;
};

PrinceJS.Kid.prototype.keyU = function () {
  return this.cursors.up.isDown;
};

PrinceJS.Kid.prototype.keyD = function () {
  return this.cursors.down.isDown;
};

PrinceJS.Kid.prototype.keyS = function () {
  return this.shiftKey.isDown;
};

PrinceJS.Kid.prototype.syncShadow = function () {
  if (
    this.opponentSync &&
    this.opponent &&
    this.opponent.charName === "shadow" &&
    !this.opponent.active &&
    this.opponent.charFace !== this.charFace
  ) {
    this.opponent.action = this.action;
  }
};

PrinceJS.Kid.prototype.mergeShadowPosition = function () {
  let shadow = this.opponent;
  this.opponent = null;
  shadow.opponent = null;
  shadow.action = "stand";
  shadow.setInvisible();
  this.charX = shadow.charX;
  this.charY = shadow.charY;
  this.charFdx = shadow.charFdx;
  this.charFdy = shadow.charFdy;
  this.charFood = shadow.charFood;
  if (this.charFace !== shadow.charFace) {
    this.changeFace();
  }
  this.updateCharPosition();
  this.updateBlockXY();
};

PrinceJS.Kid.prototype.flashShadowOverlay = function () {
  this.shadowFlashTimer = 30;
};

PrinceJS.Kid.prototype.turn = function () {
  if (!this.hasSword || !this.canReachOpponent()) {
    this.action = "turn";
  } else if (!this.facingOpponent()) {
    this.action = "turndraw";
    this.flee = false;
    if (!this.swordDrawn) {
      this.game.sound.play("UnsheatheSword");
    }
    this.swordDrawn = true;
  } else {
    this.action = "turn";
  }
};

PrinceJS.Kid.prototype.standjump = function () {
  this.action = "standjump";
  this.syncShadow();
};

PrinceJS.Kid.prototype.startrun = function () {
  if (this.nearBarrier()) {
    return this.step();
  }
  this.action = "startrun";
  this.syncShadow();
};

PrinceJS.Kid.prototype.runturn = function () {
  this.action = "runturn";
};

PrinceJS.Kid.prototype.turnrun = function () {
  if (this.nearBarrier()) {
    return this.step();
  }
  this.action = "turnrun";
};

PrinceJS.Kid.prototype.runjump = function () {
  this.action = "runjump";
  this.syncShadow();
};

PrinceJS.Kid.prototype.rdiveroll = function () {
  this.action = "rdiveroll";
  this.allowCrawl = false;
};

PrinceJS.Kid.prototype.standup = function () {
  this.action = "standup";
  this.allowCrawl = true;
};

PrinceJS.Kid.prototype.land = function () {
  this.charY = PrinceJS.Utils.convertBlockYtoY(this.charBlockY);
  this.charXVel = 0;
  this.charYVel = 0;

  let fallingBlocks = this.inFloat ? 0 : this.fallingBlocks;
  this.stopFall();

  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  if (tile.element === PrinceJS.Level.TILE_SPIKES) {
    this.game.sound.play("SpikedBySpikes"); // HardLandingSplat
    this.alignToTile(tile);
    this.dieSpikes();
  } else {
    switch (fallingBlocks) {
      case 0:
      case 1:
        if (PrinceJS.firstLand) {
          this.action = "medland";
        } else {
          this.action = "softland";
        }
        this.game.sound.play("SoftLanding");
        break;
      case 2:
        this.action = "medland";
        this.game.sound.play("MediumLandingOof");
        this.damageLife(true);
        break;
      default:
        this.game.sound.play("FreeFallLand");
        this.die("falldead");
    }
  }
  this.alignToFloor();
  this.processCommand();
  this.level.unMaskTile();
  PrinceJS.firstLand = false;
};

PrinceJS.Kid.prototype.crawl = function () {
  this.action = "crawl";
  this.allowCrawl = false;
};

PrinceJS.Kid.prototype.runstop = function () {
  if (this.frameID(7) || this.frameID(11)) {
    this.action = "runstop";
    this.syncShadow();
  }
};

PrinceJS.Kid.prototype.step = function () {
  let px = 11;

  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  let tileF = this.level.getTileAt(this.charBlockX + this.charFace, this.charBlockY, this.room);

  if (
    (tile.element === PrinceJS.Level.TILE_CHOPPER && this.faceL()) ||
    (tileF.element === PrinceJS.Level.TILE_CHOPPER && this.faceR())
  ) {
    px = this.distanceToEdge() - 3;
    if (px <= 0) {
      px = 11;
    }
  } else if (
    (tile.element === PrinceJS.Level.TILE_MIRROR && this.faceL()) ||
    (tileF.element === PrinceJS.Level.TILE_MIRROR && this.faceR())
  ) {
    px = this.distanceToEdge() - 8;
    if (px <= 0) {
      this.bump();
      return;
    }
  } else if (
    this.nearBarrier() ||
    tileF.element === PrinceJS.Level.TILE_SPACE ||
    tileF.element === PrinceJS.Level.TILE_TOP_BIG_PILLAR ||
    tileF.element === PrinceJS.Level.TILE_TAPESTRY_TOP ||
    tileF.element === PrinceJS.Level.TILE_POTION ||
    tileF.element === PrinceJS.Level.TILE_LOOSE_BOARD ||
    tileF.element === PrinceJS.Level.TILE_DROP_BUTTON ||
    tileF.element === PrinceJS.Level.TILE_RAISE_BUTTON ||
    tileF.element === PrinceJS.Level.TILE_SWORD
  ) {
    px = this.distanceToEdge();

    if (
      ((tile.element === PrinceJS.Level.TILE_GATE &&
        (tile.state === PrinceJS.Tile.Gate.STATE_FAST_DROPPING || !tile.canCross(30))) ||
        tile.element === PrinceJS.Level.TILE_TAPESTRY) &&
      this.faceR()
    ) {
      px -= 6;
      if (px <= 0) {
        this.setBump();
        return;
      }
    } else {
      if (tileF.isBarrier() && px - 2 < 0) {
        this.setBump();
        return;
      } else {
        if (
          px === 0 &&
          (tileF.element === PrinceJS.Level.TILE_LOOSE_BOARD ||
            tileF.element === PrinceJS.Level.TILE_DROP_BUTTON ||
            tileF.element === PrinceJS.Level.TILE_RAISE_BUTTON ||
            tileF.element === PrinceJS.Level.TILE_SPACE ||
            tileF.element === PrinceJS.Level.TILE_TOP_BIG_PILLAR ||
            tileF.element === PrinceJS.Level.TILE_TAPESTRY_TOP)
        ) {
          if (
            this.charRepeat ||
            tileF.element === PrinceJS.Level.TILE_DROP_BUTTON ||
            tileF.element === PrinceJS.Level.TILE_RAISE_BUTTON
          ) {
            this.charRepeat = false;
            px = 11;
          } else {
            this.charRepeat = true;
            this.action = "testfoot";
            return;
          }
        }
      }
    }
  }
  if (px > 0) {
    this.action = "step" + Math.min(px, 14);
    this.syncShadow();
  }
};

PrinceJS.Kid.prototype.startFall = function () {
  if (["turn", "turnrun", "turnengarde", "highjump", "hangdrop"].includes(this.action)) {
    this.checkFloorStepFall = true;
  }

  this.fallingBlocks = 0;
  this.inFallDown = true;
  this.backwardsFall = this.swordDrawn ? -1 : 1;

  if (this.action.substring(0, 4) === "hang") {
    let blockX = this.charBlockX;
    if (this.action === "hangstraight") {
      blockX -= this.charFace;
    }
    let tile = this.level.getTileAt(blockX, this.charBlockY, this.room);
    if (
      ![PrinceJS.Level.TILE_SPACE, PrinceJS.Level.TILE_TOP_BIG_PILLAR, PrinceJS.Level.TILE_TAPESTRY_TOP].includes(
        tile.element
      )
    ) {
      tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
      if (tile.isBarrier()) {
        this.charX -= 7 * this.charFace;
      }
      this.action = "hangdrop";
      this.stopFall();
    } else {
      tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
      if (tile.isBarrier()) {
        this.charX -= 7 * this.charFace;
      }
      this.action = "hangfall";
      this.level.maskTile(this.charBlockX - this.charFace, this.charBlockY, this.room);
      this.processCommand();
    }
  } else {
    let act = "stepfall";

    if (this.frameID(44)) {
      act = "rjumpfall";
    }
    if (this.frameID(26)) {
      act = "jumpfall";
    }
    if (this.frameID(13)) {
      act = "stepfall2";
    }

    if (this.distanceToEdge() <= 2 && this.action === "running") {
      this.charX -= 8 * this.charFace;
    }

    if (["retreat"].includes(this.action) || this.swordDrawn) {
      this.charX += 10 * this.charFace * (this.action === "advance" ? 1 : -1);
      this.level.maskTile(this.charBlockX + this.charFace, this.charBlockY, this.room);
    } else {
      this.level.maskTile(this.charBlockX + 1, this.charBlockY, this.room);
    }
    this.swordDrawn = false;
    this.action = act;
    this.processCommand();
  }
};

PrinceJS.Kid.prototype.stoop = function () {
  let tileR = this.level.getTileAt(this.charBlockX - this.charFace, this.charBlockY, this.room);

  if (
    [PrinceJS.Level.TILE_SPACE, PrinceJS.Level.TILE_TOP_BIG_PILLAR, PrinceJS.Level.TILE_TAPESTRY_TOP].includes(
      tileR.element
    )
  ) {
    if (this.charFace === -1) {
      if (this.charX - PrinceJS.Utils.convertBlockXtoX(this.charBlockX) > 4) {
        return this.climbdown();
      }
    } else {
      if (this.charX - PrinceJS.Utils.convertBlockXtoX(this.charBlockX) < 9) {
        return this.climbdown();
      }
    }
  }

  this.action = "stoop";
};

PrinceJS.Kid.prototype.climbdown = function () {
  this.blockEngarde = false;

  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);

  if (
    this.faceL() &&
    tile.element === PrinceJS.Level.TILE_GATE &&
    (tile.state === PrinceJS.Tile.Gate.STATE_FAST_DROPPING || !tile.canCross(15))
  ) {
    this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 3;
  } else {
    if (this.faceL()) {
      this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 6;
    } else {
      this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 7;
    }
    this.action = "climbdown";
  }
};

PrinceJS.Kid.prototype.climbup = function () {
  this.blockEngarde = false;

  let tileT = this.level.getTileAt(this.charBlockX, this.charBlockY - 1, this.room);

  if (
    this.faceL() &&
    tileT.element === PrinceJS.Level.TILE_GATE &&
    (tileT.state === PrinceJS.Tile.Gate.STATE_FAST_DROPPING || !tileT.canCross(15))
  ) {
    this.action = "climbfail";
  } else {
    this.action = "climbup";
    if (this.faceR()) {
      this.level.unMaskTile();
    }
  }

  if (tileT.element === PrinceJS.Level.TILE_LOOSE_BOARD) {
    tileT.shake(true);
  }
};

PrinceJS.Kid.prototype.jumpup = function () {
  this.action = "jumpup";
  this.inJumpUp = true;
};

PrinceJS.Kid.prototype.highjump = function () {
  let tileTR = this.level.getTileAt(this.charBlockX - this.charFace, this.charBlockY - 1, this.room);

  this.action = "highjump";
  if (this.faceL() && tileTR.isWalkable()) {
    this.level.maskTile(this.charBlockX + 1, this.charBlockY - 1, this.room);
  }
};

PrinceJS.Kid.prototype.jumpbackhang = function () {
  if (this.charFace === -1) {
    this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 7;
  } else {
    this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 6;
  }
  this.action = "jumpbackhang";
  if (this.faceR()) {
    this.level.maskTile(this.charBlockX, this.charBlockY - 1, this.room);
  }
};

PrinceJS.Kid.prototype.jumphanglong = function () {
  if (this.charFace === -1) {
    this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 1;
  } else {
    this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 12;
  }
  this.action = "jumphanglong";
  if (this.faceR()) {
    this.level.maskTile(this.charBlockX + 1, this.charBlockY - 1, this.room);
  }
};

PrinceJS.Kid.prototype.climbstairs = function () {
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);

  if (tile.element === PrinceJS.Level.TILE_EXIT_RIGHT) {
    this.charBlockX--;
  } else {
    tile = this.level.getTileAt(this.charBlockX + 1, this.charBlockY, this.room);
  }

  if (this.faceR()) {
    this.charFace *= -1;
    this.scale.x *= -1;
  }

  this.charX = PrinceJS.Utils.convertBlockXtoX(this.charBlockX) + 3;
  tile.mask();
  this.action = "climbstairs";
};

PrinceJS.Kid.prototype.jump = function () {
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  let tileT = this.level.getTileAt(this.charBlockX, this.charBlockY - 1, this.room);
  let tileTF = this.level.getTileAt(this.charBlockX + this.charFace, this.charBlockY - 1, this.room);
  let tileTR = this.level.getTileAt(this.charBlockX - this.charFace, this.charBlockY - 1, this.room);
  let tileR = this.level.getTileAt(this.charBlockX - this.charFace, this.charBlockY, this.room);

  if (tile.isExitDoor()) {
    if (tile.element === PrinceJS.Level.TILE_EXIT_LEFT) {
      tile = this.level.getTileAt(this.charBlockX + 1, this.charBlockY, this.room);
    }

    if (tile.open) {
      return this.climbstairs();
    }
  }

  if (this.faceL() && tile.element === PrinceJS.Level.TILE_MIRROR && Math.abs(tile.x - this.x) < 30) {
    return this.bump();
  }
  if (tileTF.element === PrinceJS.Level.TILE_MIRROR) {
    return this.jumpup();
  }

  if (tileT.isSpace() && tileTF.isWalkable()) {
    return this.jumphanglong();
  }

  if (tileT.isWalkable() && tileTR.isSpace() && tileR.isWalkable()) {
    if (this.faceL() && PrinceJS.Utils.convertBlockXtoX(this.charBlockX + 1) - this.charX < 11) {
      this.charBlockX++;
      return this.jumphanglong();
    }
    if (this.faceR() && this.charX - PrinceJS.Utils.convertBlockXtoX(this.charBlockX) < 9) {
      this.charBlockX--;
      return this.jumphanglong();
    }
    return this.jumpup();
  }

  if (tileT.isWalkable() && tileTR.isSpace()) {
    if (this.faceL() && PrinceJS.Utils.convertBlockXtoX(this.charBlockX + 1) - this.charX < 11) {
      return this.jumpbackhang();
    }
    if (this.faceR() && this.charX - PrinceJS.Utils.convertBlockXtoX(this.charBlockX) < 9) {
      return this.jumpbackhang();
    }
    return this.jumpup();
  }

  if (tileT.isSpace()) {
    return this.highjump();
  }

  this.jumpup();
};

PrinceJS.Kid.prototype.damageLife = function (crouch = false) {
  if (!this.alive) {
    return;
  }
  this.showSplash();
  PrinceJS.Utils.flashRedDamage(this.game);
  if (crouch) {
    this.splash.y = -5;
  }
  if (this.health > 1) {
    this.health -= 1;
    this.onDamageLife.dispatch(1);
  } else {
    this.die();
  }
};

PrinceJS.Kid.prototype.recoverLife = function () {
  if (this.health < this.maxHealth) {
    this.health++;
    this.onRecoverLive.dispatch();
  }
};

PrinceJS.Kid.prototype.addLife = function () {
  this.maxHealth++;
  this.health = this.maxHealth;
  this.onAddLive.dispatch();
};

PrinceJS.Kid.prototype.flipScreen = function () {
  let gameContainer = document.getElementById("gameContainer");
  gameContainer.classList.toggle("flipped");
};

PrinceJS.Kid.prototype.floatFall = function () {
  this.inFloat = true;
  this.game.sound.play("Float");
  PrinceJS.Utils.delayed(() => {
    this.inFloat = false;
  }, 20000);
};

PrinceJS.Kid.prototype.damageStruck = function () {
  if (!this.alive) {
    return;
  }
  if (this.action.includes("land")) {
    return;
  }
  this.fallingBlocks = 2;
  this.land();
};

PrinceJS.Kid.prototype.proceedOnDead = function () {
  PrinceJS.Utils.delayed(() => {
    if (this.game) {
      if (this.opponent && this.opponent.baseCharName === "jaffar") {
        this.game.sound.play("HeroicDeath");
      } else {
        this.game.sound.play("Accident");
      }
      this.onDead.dispatch();
    }
  }, 1000);
};
