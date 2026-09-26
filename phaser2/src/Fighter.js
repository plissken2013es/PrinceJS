"use strict";

PrinceJS.Fighter = function (game, level, location, direction, room, key, animKey) {
  this.level = level;
  this.room = room;

  this.charBlockX = location % 10;
  this.charBlockY = Math.floor(location / 10);

  let x = PrinceJS.Utils.convertBlockXtoX(this.charBlockX);
  let y = PrinceJS.Utils.convertBlockYtoY(this.charBlockY);

  PrinceJS.Actor.call(this, game, x, y, direction, key, animKey);

  this.charXVel = 0;
  this.charYVel = 0;
  this.actionCode = 1;

  this.charSword = true;

  this.flee = false;
  this.allowAdvance = true;
  this.allowRetreat = true;
  this.allowBlock = true;
  this.allowStrike = true;
  this.inJumpUp = false;
  this.inFallDown = false;
  this.inFloat = false;
  this.fallingBlocks = 0;

  this.swordFrame = 0;
  this.swordDx = 0;
  this.swordDy = 0;

  if (this.charName !== "skeleton") {
    this.splash = this.game.make.sprite(0, 0, "general", (this.baseCharName || this.charName) + "-splash");
    this.splash.anchor.set(0, 1);
    this.splash.x = -6;
    this.splash.y = -15;
    this.splash.visible = false;
    this.addChild(this.splash);
    this.splashTimer = 0;
  }

  this.sword = this.game.make.sprite(0, 0, "general");
  this.sword.scale.x *= -this.charFace;
  this.sword.anchor.setTo(0, 1);

  this.game.add.existing(this.sword);

  this.hasSword = true;
  this.sword.z = 21;

  this.updateBase();

  this.swordAnims = this.game.cache.getJSON("sword-anims");

  this.registerCommand(0xf8, this.CMD_SETFALL); // 248
  this.registerCommand(0xf9, this.CMD_ACT); // 249
  this.registerCommand(0xf6, this.CMD_DIE); // 246

  this.opponent = null;
  this.active = true;
  this.startFight = true;

  this.health = 3;
  this.alive = true;
  this.swordDrawn = false;
  this.blocked = false;

  this.onInitLife = new Phaser.Signal();
  this.onDamageLife = new Phaser.Signal();
  this.onDead = new Phaser.Signal();
  this.onStrikeBlocked = new Phaser.Signal();
  this.onEnemyStrike = new Phaser.Signal();
  this.onChangeRoom = new Phaser.Signal();
};

PrinceJS.Fighter.GRAVITY = 3;
PrinceJS.Fighter.GRAVITY_FLOAT = 1;
PrinceJS.Fighter.TOP_SPEED = 33;
PrinceJS.Fighter.TOP_SPEED_FLOAT = 4;

PrinceJS.Fighter.prototype = Object.create(PrinceJS.Actor.prototype);
PrinceJS.Fighter.prototype.constructor = PrinceJS.Fighter;

PrinceJS.Fighter.prototype.CMD_SETFALL = function (data) {
  this.charXVel = data.p1 * this.charFace;
  this.charYVel = data.p2;
};

PrinceJS.Fighter.prototype.CMD_DIE = function (data) {
  this.alive = false;
  this.swordDrawn = false;
  this.showSplash();
  this.proceedOnDead();
  if (this.charName !== "kid") {
    PrinceJS.Utils.delayed(() => {
      if (this.baseCharName === "jaffar") {
        this.game.sound.play("JaffarDead");
        PrinceJS.Utils.flashWhiteVizierVictory(this.game);
      } else if (this.baseCharName !== "shadow") {
        this.game.sound.play("Victory");
      }
    }, 200);
  }
};

PrinceJS.Fighter.prototype.CMD_ACT = function (data) {
  this.actionCode = data.p1;
  if (data.p1 === 1) {
    this.charXVel = 0;
    this.charYVel = 0;
  }
};

PrinceJS.Fighter.prototype.CMD_FRAME = function (data) {
  this.charFrame = data.p1;
  this.updateCharFrame();
  this.updateSwordFrame();
  this.updateBlockXY();
  this.processing = false;
};

PrinceJS.Fighter.prototype.changeFace = function () {
  this.charFace *= -1;
  this.scale.x *= -1;
  this.sword.scale.x *= -1;

  if (this.delegate) {
    this.delegate.syncFace(this);
  }
};

PrinceJS.Fighter.prototype.updateBase = function () {
  if (this.level.rooms[this.room]) {
    this.baseX = this.level.rooms[this.room].x * PrinceJS.ROOM_WIDTH;
    this.baseY = this.level.rooms[this.room].y * PrinceJS.ROOM_HEIGHT + 3;
  }
};

PrinceJS.Fighter.prototype.updateSwordFrame = function () {
  let framedef = this.anims.framedef[this.charFrame];

  this.charSword = typeof framedef.fsword !== "undefined";

  if (this.charSword) {
    let stab = this.swordAnims.swordtab[framedef.fsword - 1];
    this.swordFrame = stab.id;
    this.swordDx = stab.dx;
    this.swordDy = stab.dy;
  }
};

PrinceJS.Fighter.prototype.updateBlockXY = function () {
  let footX = this.charX + this.charFdx * this.charFace - this.charFfoot * this.charFace;
  let footY = this.charY + this.charFdy;
  this.charBlockX = PrinceJS.Utils.convertXtoBlockX(footX);
  let charBlockYBefore = this.charBlockY;
  this.charBlockY = Math.min(PrinceJS.Utils.convertYtoBlockY(footY), 2);
  this.updateFallingBlocks(this.charBlockY, charBlockYBefore);

  if (this.charBlockX < 0) {
    if (this.action === "highjump" && this.faceR()) {
      return;
    }
    if (this.level.rooms[this.room]) {
      let leftRoom = this.level.rooms[this.room].links.left;
      if (leftRoom > -1) {
        this.charX += 140;
        this.baseX -= 320;
        this.charBlockX = 9;
        this.room = leftRoom;
        if (this.charName === "kid") {
          this.onChangeRoom.dispatch(this.room, 0);
        }
      }
    }
  } else if (this.charBlockX > 9) {
    if (this.action === "highjump" && this.faceL()) {
      return;
    }
    if (this.level.rooms[this.room]) {
      let rightRoom = this.level.rooms[this.room].links.right;
      this.charX -= 140;
      this.baseX += 320;
      this.charBlockX = 0;
      if (rightRoom > -1) {
        this.room = rightRoom;
        if (this.charName === "kid") {
          this.onChangeRoom.dispatch(this.room, 0);
        }
      }
    }
  }
};

PrinceJS.Fighter.prototype.updateFallingBlocks = function (charBlockY, charBlockYBefore) {
  if (!this.inFallDown) {
    return;
  }
  if (charBlockY !== charBlockYBefore) {
    this.fallingBlocks++;
  }

  if (this.charName === "kid" && this.fallingBlocks === 5) {
    this.game.sound.play("FallingFloorLands");
  }
};

PrinceJS.Fighter.prototype.updateActor = function () {
  this.updateSplash();
  this.processCommand();
  this.updateAcceleration();
  this.updateVelocity();
  this.checkFight();
  this.checkRoomChange();
  this.updateCharPosition();
  this.updateSwordPosition();
};

PrinceJS.Fighter.prototype.checkFight = function () {
  if (this.opponent == null) {
    return;
  }
  if (!this.startFight) {
    return;
  }

  if (this.blocked && this.action !== "strike") {
    this.retreat();
    this.processCommand();
    this.blocked = false;
    return;
  }

  let distance = this.opponentDistance();
  if (distance === -999) {
    return;
  }

  switch (this.action) {
    case "engarde":
      if (!this.opponent.alive) {
        this.sheathe();
        this.opponent = null;
      } else if (distance < -4) {
        if (!this.facingOpponent()) {
          this.turnengarde();
        }
        if (!this.opponent.facingOpponent()) {
          this.opponent.turnengarde();
        }
      }
      break;

    case "strike":
      if (this.charBlockY !== this.opponent.charBlockY) {
        return;
      }
      if (this.opponent.action === "climbstairs") {
        return;
      }
      if (!this.frameID(153, 154) && !this.frameID(3, 4)) {
        return;
      }

      if (!this.opponent.frameID(150) && !this.opponent.frameID(0)) {
        if (this.frameID(154) || this.frameID(4)) {
          let minHurtDistance = this.opponent.swordDrawn ? 12 : 8;

          if ((distance >= minHurtDistance || distance <= 0) && distance < 29) {
            this.opponent.stabbed();
          }
        }
      } else {
        if (this.charFrame !== "kid") {
          this.game.sound.play("SwordClash");
        }

        this.opponent.blocked = true;
        this.action = "blockedstrike";
        this.processCommand();
        this.onStrikeBlocked.dispatch();
      }
      break;

    case "stand":
      if (this.charName !== "kid" && !this.facingOpponent() && Math.abs(this.x - this.opponent.x) >= 20) {
        this.turn();
      }
      break;
  }
};

PrinceJS.Fighter.prototype.updateSwordPosition = function () {
  if (this.charSword) {
    this.sword.frameName = "sword" + this.swordFrame;
    this.sword.x = this.x + this.swordDx * this.charFace;
    this.sword.y = this.y + this.swordDy;
  }

  this.sword.visible = this.active && this.charSword;
};

PrinceJS.Fighter.prototype.opponentOnSameLevel = function () {
  return this.opponent.charBlockY === this.charBlockY;
};

PrinceJS.Fighter.prototype.opponentOnSameTile = function () {
  return this.charBlockX === this.opponent.charBlockX && this.charBlockY === this.opponent.charBlockY;
};

PrinceJS.Fighter.prototype.opponentOnSameTileBelow = function () {
  return this.charBlockX === this.opponent.charBlockX && this.charBlockY + 1 === this.opponent.charBlockY;
};

PrinceJS.Fighter.prototype.opponentOnNextTileBelow = function () {
  return this.charBlockX + 1 === this.opponent.charBlockX && this.charBlockY + 1 === this.opponent.charBlockY;
};

PrinceJS.Fighter.prototype.opponentDistance = function () {
  if (!this.opponentOnSameLevel()) {
    return 999 * (this.canWalkOnNextTile() ? 1 : -1);
  }

  let inSameRoom = this.opponentInSameRoom(this.opponent, this.room);
  let inRoomLeft = this.opponentNearRoomLeft(this.opponent, this.room);
  let inRoomRight = this.opponentNearRoomRight(this.opponent, this.room);
  if (!(inSameRoom || inRoomLeft || inRoomRight)) {
    return 999;
  }

  let distanceRoomOffset = 0;
  if (!inSameRoom) {
    if (inRoomLeft) {
      distanceRoomOffset = -150 * this.charFace;
    } else if (inRoomRight) {
      distanceRoomOffset = 150 * this.charFace;
    }
  }

  let maxCharBlockX = (this.opponent.charX - this.charX) * this.charFace;
  if (maxCharBlockX >= 0 && this.charFace !== this.opponent.charFace) {
    maxCharBlockX += 13;
  }

  return maxCharBlockX + distanceRoomOffset;
};

PrinceJS.Fighter.prototype.updateVelocity = function () {
  this.charX += this.charXVel;
  this.charY += this.charYVel;
};

PrinceJS.Fighter.prototype.updateAcceleration = function () {
  if (this.actionCode === 4) {
    if (this.inFloat) {
      this.charYVel += PrinceJS.Fighter.GRAVITY_FLOAT;
      if (this.charYVel > PrinceJS.Fighter.TOP_SPEED_FLOAT) {
        this.charYVel = PrinceJS.Fighter.TOP_SPEED_FLOAT;
      }
    } else {
      this.charYVel += PrinceJS.Fighter.GRAVITY;
      if (this.charYVel > PrinceJS.Fighter.TOP_SPEED) {
        this.charYVel = PrinceJS.Fighter.TOP_SPEED;
      }
    }
  }
};

PrinceJS.Fighter.prototype.alignToFloor = function () {};

PrinceJS.Fighter.prototype.stand = function () {
  this.action = "stand";
  this.processCommand();
};

PrinceJS.Fighter.prototype.turn = function () {
  this.action = "turn";
  this.charX -= this.charFace * 10;
  this.processCommand();
};

PrinceJS.Fighter.prototype.engarde = function () {
  if (!this.hasSword) {
    return;
  }
  this.action = "engarde";
  this.swordDrawn = true;
  this.flee = false;
  this.alignToFloor();

  if (this.charName === "kid") {
    this.game.sound.play("UnsheatheSword");
  }

  if (this.onInitLife) {
    this.onInitLife.dispatch(this);
  }
};

PrinceJS.Fighter.prototype.turnengarde = function () {
  if (!this.opponentOnSameLevel()) {
    return;
  }
  if (this.flee) {
    return;
  }
  if ("turnengarde" === this.action) {
    return;
  }
  if (!["stand", "engarde", "advance", "retreat"].includes(this.action)) {
    return;
  }
  let begin = Math.abs(this.opponentDistance()) > 10;
  this.action = (this.charName === "kid" && begin ? "begin" : "") + "turnengarde";
  if (!this.swordDrawn && this.charName === "kid") {
    this.game.sound.play("UnsheatheSword");
  }
  this.swordDrawn = true;
  this.alignToFloor();
};

PrinceJS.Fighter.prototype.sheathe = function () {
  this.action = "resheathe";
  this.swordDrawn = false;
  this.flee = false;
};

PrinceJS.Fighter.prototype.retreat = function () {
  if (this.frameID(158) || this.frameID(170) || this.frameID(8) || this.frameID(20, 21)) {
    this.action = "retreat";
    this.allowRetreat = false;
  }
};

PrinceJS.Fighter.prototype.advance = function () {
  if (this.action === "stand") {
    this.engarde();
    return;
  }

  if (this.frameID(158) || this.frameID(171) || this.frameID(8) || this.frameID(20, 21)) {
    this.action = "advance";
    this.allowAdvance = false;
  }
};

PrinceJS.Fighter.prototype.strike = function () {
  if (!this.opponentOnSameLevel()) {
    return;
  }

  if (this.charName === "kid" && this.frameID(157, 158)) {
    this.game.sound.play("StabAir");
  }

  if (
    this.frameID(157, 158) ||
    this.frameID(165) ||
    this.frameID(170, 171) ||
    this.frameID(7, 8) ||
    this.frameID(20, 21) ||
    this.frameID(15)
  ) {
    this.action = "strike";
    this.allowStrike = false;
  } else {
    if (this.frameID(150) || this.frameID(161) || this.frameID(0) || this.blocked) {
      this.action = "blocktostrike";
      this.allowStrike = false;
      this.blocked = false;
    }
  }
  this.opponent.onEnemyStrike.dispatch();
};

PrinceJS.Fighter.prototype.block = function () {
  if (!this.opponentOnSameLevel()) {
    return;
  }

  if (this.frameID(8) || this.frameID(20, 21) || this.frameID(18) || this.frameID(15)) {
    if (this.opponentDistance() >= 32) {
      return this.retreat();
    }
    if (!this.opponent.frameID(152) && !this.opponent.frameID(2)) {
      return;
    }
    this.action = "block";
  } else {
    if (!this.frameID(17)) {
      return;
    }
    this.action = "striketoblock";
  }

  this.allowBlock = false;
};

PrinceJS.Fighter.prototype.stabbed = function () {
  if (!this.alive) {
    return;
  }

  if (this.charName === "kid") {
    this.game.sound.play("StabbedByOpponent");
  } else {
    this.game.sound.play("StabOpponent");
  }

  if (this.health === 0) {
    return;
  }

  this.charY = PrinceJS.Utils.convertBlockYtoY(this.charBlockY);

  if (this.charName !== "skeleton") {
    if (this.swordDrawn) {
      this.damageLife();
    } else {
      this.die();
    }
  }

  if (this.health === 0) {
    this.action = "stabkill";
  } else {
    this.action = "stabbed";
  }

  this.showSplash();
};

PrinceJS.Fighter.prototype.opponentNextRoom = function (opponent, room) {
  return (
    this.opponentInSameRoom(opponent, room) ||
    this.opponentInRoomLeft(opponent, room) ||
    this.opponentInRoomRight(opponent, room)
  );
};

PrinceJS.Fighter.prototype.opponentInSameRoom = function (opponent, room) {
  return opponent.room === room;
};

PrinceJS.Fighter.prototype.opponentInRoomLeft = function (opponent, room) {
  return (
    this.level.rooms[room] &&
    this.level.rooms[room].links.left > 0 &&
    opponent.room === this.level.rooms[room].links.left
  );
};

PrinceJS.Fighter.prototype.opponentInRoomRight = function (opponent, room) {
  return (
    this.level.rooms[room] &&
    this.level.rooms[room].links.right > 0 &&
    opponent.room === this.level.rooms[room].links.right
  );
};

PrinceJS.Fighter.prototype.opponentCloseRoom = function (opponent, room) {
  return (
    opponent.room === room || this.opponentCloseRoomLeft(opponent, room) || this.opponentCloseRoomRight(opponent, room)
  );
};

PrinceJS.Fighter.prototype.opponentCloseRoomLeft = function (opponent, room) {
  return (
    this.level.rooms[room] &&
    this.level.rooms[room].links.left > 0 &&
    opponent.room === this.level.rooms[room].links.left &&
    opponent.charBlockX >= 9
  );
};

PrinceJS.Fighter.prototype.opponentCloseRoomRight = function (opponent, room) {
  return (
    this.level.rooms[room] &&
    this.level.rooms[room].links.right > 0 &&
    opponent.room === this.level.rooms[room].links.right &&
    this.charBlockX >= 9
  );
};

PrinceJS.Fighter.prototype.opponentNearRoom = function (opponent, room) {
  return (
    this.opponentInSameRoom(opponent, room) ||
    this.opponentNearRoomLeft(opponent, room) ||
    this.opponentNearRoomRight(opponent, room)
  );
};

PrinceJS.Fighter.prototype.opponentNearRoomLeft = function (opponent, room) {
  return (
    this.level.rooms[room] &&
    this.level.rooms[room].links.left > 0 &&
    opponent.room === this.level.rooms[room].links.left &&
    (opponent.charBlockX >= 8 || this.charBlockX <= 0)
  );
};

PrinceJS.Fighter.prototype.opponentNearRoomRight = function (opponent, room) {
  return (
    this.level.rooms[room] &&
    this.level.rooms[room].links.right > 0 &&
    opponent.room === this.level.rooms[room].links.right &&
    (opponent.charBlockX <= 0 || this.charBlockX >= 8)
  );
};

PrinceJS.Fighter.prototype.facingOpponent = function () {
  return (this.faceL() && this.opponent.x <= this.x) || (this.faceR() && this.opponent.x >= this.x);
};

PrinceJS.Fighter.prototype.canSeeOpponent = function (below = false) {
  if (this.opponent == null || !this.opponent.alive || !this.opponent.active) {
    return false;
  }

  if (!(this.opponent.charBlockY === this.charBlockY || (below && this.opponent.charBlockY === this.charBlockY + 1))) {
    return false;
  }

  return (
    this.opponentNearRoom(this.opponent, this.room) ||
    this.opponentNearRoom(this, this.opponent.room) ||
    (Math.abs(this.opponent.x - this.x) <= 160 && Math.abs(this.opponent.y - this.y) <= 70)
  );
};

PrinceJS.Fighter.prototype.nearBarrier = function (charBlockX, charBlockY) {
  charBlockX = charBlockX || this.charBlockX;
  charBlockY = charBlockY || this.charBlockY;

  let tile = this.level.getTileAt(charBlockX, charBlockY, this.room);
  let tileF = this.level.getTileAt(charBlockX + this.charFace, charBlockY, this.room);

  return (
    tileF.element === PrinceJS.Level.TILE_WALL ||
    (tileF.element === PrinceJS.Level.TILE_GATE && this.faceL() && !tileF.canCross(this.height)) ||
    (tile.element === PrinceJS.Level.TILE_GATE && this.faceR() && !tile.canCross(this.height)) ||
    (tile.element === PrinceJS.Level.TILE_TAPESTRY && this.faceR()) ||
    (tileF.element === PrinceJS.Level.TILE_TAPESTRY && this.faceL()) ||
    (tileF.element === PrinceJS.Level.TILE_TAPESTRY_TOP && this.faceL())
  );
};

PrinceJS.Fighter.prototype.standsOnTile = function (tile) {
  let floorTile = this.level.getTileAt(tile.roomX, tile.roomY, tile.room);
  let fighterTile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  return floorTile === fighterTile;
};

PrinceJS.Fighter.prototype.canCrossGate = function (tile) {
  let tileF = this.level.getTileAt(tile.roomX + this.charFace, tile.roomY, this.room);

  return !(
    (tileF.element === PrinceJS.Level.TILE_GATE && this.faceL() && !tileF.canCross(this.height)) ||
    (tile.element === PrinceJS.Level.TILE_GATE && this.faceR() && !tile.canCross(this.height))
  );
};

PrinceJS.Fighter.prototype.canWalkOnTile = function (charBlockX, charBlockY, room) {
  let tile = this.level.getTileAt(charBlockX, charBlockY, room);
  return (
    (tile.isSafeWalkable() && this.canCrossGate(tile)) ||
    ((!tile.isDangerousWalkable() ||
      (tile.element === PrinceJS.Level.TILE_CHOPPER && this.x > tile.x && this.opponent.x > tile.x)) &&
      (this.standsOnTile(tile) || this.opponent.standsOnTile(tile)))
  );
};

PrinceJS.Fighter.prototype.canWalkOnNextTile = function () {
  let charBlockX = PrinceJS.Utils.convertXtoBlockX(this.charX + this.charFdx * this.charFace);
  let tileF = this.level.getTileAt(charBlockX + this.charFace, this.charBlockY, this.room);
  if (tileF.isSafeWalkable()) {
    return true;
  }
  if (this.charBlockY < 2) {
    let tileBF = this.level.getTileAt(charBlockX + this.charFace, this.charBlockY + 1, this.room);
    if (tileBF.isSafeWalkable()) {
      return true;
    }
  }
  return false;
};

PrinceJS.Fighter.prototype.canReachOpponent = function (below = false) {
  if (!this.canSeeOpponent(below)) {
    return false;
  }

  return this.checkPathToOpponent(
    this.centerX,
    this.opponent,
    this.charBlockX,
    this.charBlockY,
    this.room,
    (charBlockX, charBlockY, room) => {
      if (this.canWalkOnTile(charBlockX, charBlockY, room)) {
        return {
          value: true
        };
      }
      let tile = this.level.getTileAt(charBlockX, charBlockY, room);
      if (
        tile.element === PrinceJS.Level.TILE_SPACE &&
        below &&
        charBlockY < 2 &&
        this.opponent.charBlockY === charBlockY + 1 &&
        !this.opponent.isHanging()
      ) {
        return {
          value: this.checkPathToOpponent(
            tile.centerX,
            this.opponent,
            charBlockX,
            charBlockY + 1,
            room,
            (charBlockX, charBlockY, room) => {
              return {
                value: this.canWalkOnTile(charBlockX, charBlockY, room)
              };
            }
          ),
          stop: true
        };
      }
      return {
        value: false
      };
    }
  );
};

PrinceJS.Fighter.prototype.checkPathToOpponent = function (x, opponent, charBlockX, charBlockY, room, callback) {
  let result = { value: false };
  let maxCharBlockX = opponent.charBlockX + (room === opponent.room ? 0 : 10);
  let minCharBlockX = opponent.charBlockX - (room === opponent.room ? 0 : 10);
  if (opponent.isHanging()) {
    maxCharBlockX += 1;
    minCharBlockX -= 1;
  }
  if (x <= opponent.centerX) {
    if (charBlockX > maxCharBlockX) {
      charBlockX = maxCharBlockX;
    }
    while (charBlockX <= maxCharBlockX) {
      if (charBlockX === 10) {
        if (this.level.rooms[room]) {
          room = this.level.rooms[room].links.right;
        } else {
          return false;
        }
      }
      result = callback(charBlockX % 10, charBlockY, room);
      if (!result.value || result.stop) {
        return result.value;
      }
      charBlockX++;
    }
  } else {
    if (charBlockX < minCharBlockX) {
      charBlockX = minCharBlockX;
    }
    while (charBlockX >= minCharBlockX) {
      if (charBlockX === -1) {
        if (this.level.rooms[room]) {
          room = this.level.rooms[room].links.left;
        } else {
          return false;
        }
      }
      result = callback((10 + charBlockX) % 10, charBlockY, room);
      if (!result.value || result.stop) {
        return result.value;
      }
      charBlockX--;
    }
  }
  return result.value;
};

PrinceJS.Fighter.prototype.isHanging = function () {
  return ["hang", "hangstraight", "climbup", "climbdown", "hangdrop", "jumphanglong"].includes(this.action);
};

PrinceJS.Fighter.prototype.tintSplash = function (color) {
  if (this.charName === "skeleton") {
    return;
  }
  this.splash.tint = color;
};

PrinceJS.Fighter.prototype.hideSplash = function () {
  if (this.charName === "skeleton") {
    return;
  }
  this.splash.visible = false;
};

PrinceJS.Fighter.prototype.showSplash = function () {
  if (this.charName === "skeleton") {
    return;
  }
  if (["dropdead", "falldead", "impale", "halve"].includes(this.action)) {
    return;
  }
  this.splash.visible = true;
  this.splashTimer = 2;
};

PrinceJS.Fighter.prototype.updateSplash = function () {
  if (this.charName === "skeleton") {
    return;
  }

  if (this.splashTimer > 0) {
    this.splashTimer--;
    if (this.splashTimer === 0) {
      this.splash.visible = false;
      this.splash.y = -15;
    }
  }
};

PrinceJS.Fighter.prototype.checkButton = function () {
  if (this.charFcheck) {
    let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
    switch (tile.element) {
      case PrinceJS.Level.TILE_RAISE_BUTTON:
      case PrinceJS.Level.TILE_DROP_BUTTON:
        tile.push();
        break;
    }
  }
};

PrinceJS.Fighter.prototype.checkFloor = function () {
  if (!this.visible) {
    return;
  }
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);

  let checkCharFcheck = this.charFcheck;
  if (["advance", "retreat"].includes(this.action)) {
    checkCharFcheck = true;
  }

  switch (this.actionCode) {
    case 0: // stand
    case 1: // move
    case 5: // bump
      this.inFallDown = false;
      if (checkCharFcheck) {
        switch (tile.element) {
          case PrinceJS.Level.TILE_SPACE:
          case PrinceJS.Level.TILE_TOP_BIG_PILLAR:
          case PrinceJS.Level.TILE_TAPESTRY_TOP:
            if (this.actionCode === 5) {
              return;
            }
            if (!this.alive) {
              return;
            }
            this.startFall();
            break;

          case PrinceJS.Level.TILE_LOOSE_BOARD:
            tile.shake(true);
            break;

          case PrinceJS.Level.TILE_SPIKES:
            tile.raise();
            this.game.sound.play("SpikedBySpikes"); // HardLandingSplat
            this.alignToTile(tile);
            this.dieSpikes();
            break;
        }
      }
      break;

    case 4: // freefall
      this.inFallDown = true;
      if (this.charY >= PrinceJS.Utils.convertBlockYtoY(this.charBlockY)) {
        tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);

        if (tile.isWalkable()) {
          this.land();
        } else if (tile.isBarrier()) {
          this.charX -= 10 * this.charFace;
        }
      }
      break;
  }
};

PrinceJS.Fighter.prototype.checkRoomChange = function () {
  if (this.charY > 192) {
    this.charY -= 192;
    this.baseY += 189;
    if (this.level.rooms[this.room]) {
      this.room = this.level.rooms[this.room].links.down;
    }
  }
};

PrinceJS.Fighter.prototype.startFall = function () {
  this.fallingBlocks = 0;
  this.inFallDown = true;

  let act = "stepfall";
  if (["retreat"].includes(this.action) || this.swordDrawn) {
    this.charX += 10 * this.charFace * (this.action === "advance" ? 1 : -1);
    this.level.maskTile(this.charBlockX + this.charFace, this.charBlockY, this.room);
  } else {
    this.level.maskTile(this.charBlockX + 1, this.charBlockY, this.room);
  }
  this.swordDrawn = false;
  this.action = act;
  this.processCommand();
};

PrinceJS.Fighter.prototype.stopFall = function () {
  this.fallingBlocks = 0;
  this.inFallDown = false;
  this.swordDrawn = false;
};

PrinceJS.Fighter.prototype.land = function () {
  this.charY = PrinceJS.Utils.convertBlockYtoY(this.charBlockY);
  this.charXVel = 0;
  this.charYVel = 0;

  let fallingBlocks = this.fallingBlocks;
  if (["skeleton", "shadow"].includes(this.charName)) {
    fallingBlocks = 1;
  }
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
        this.action = this.charName === "shadow" ? "softlandStandup" : "stand";
        break;
      default:
        this.game.sound.play("FreeFallLand");
        this.die("falldead");
        break;
    }
  }
  this.processCommand();
};

PrinceJS.Fighter.prototype.distanceToEdge = function () {
  if (this.faceR()) {
    return PrinceJS.Utils.convertBlockXtoX(this.charBlockX + 1) - 1 - this.charX - this.charFdx + this.charFfoot;
  } else {
    return this.charX + this.charFdx + this.charFfoot - PrinceJS.Utils.convertBlockXtoX(this.charBlockX);
  }
};

PrinceJS.Fighter.prototype.distanceToFloor = function () {
  return PrinceJS.Utils.convertBlockYtoY(this.charBlockY) - this.charY - this.charFdy;
};

PrinceJS.Fighter.prototype.distanceToTopFloor = function () {
  return PrinceJS.Utils.convertBlockYtoY(this.charBlockY - 1) - this.charY - this.charFdy;
};

PrinceJS.Fighter.prototype.checkSpikes = function () {
  if (this.distanceToEdge() < 5) {
    this.trySpikes(this.charBlockX + this.charFace, this.charBlockY);
  }
  this.trySpikes(this.charBlockX, this.charBlockY);
};

PrinceJS.Fighter.prototype.inSpikeDistance = function (tile) {
  return true;
};

PrinceJS.Fighter.prototype.trySpikes = function (x, y) {
  while (y < 3) {
    let tile = this.level.getTileAt(x, y, this.room);
    if (tile.element === PrinceJS.Level.TILE_SPIKES) {
      tile.raise();
    }
    if ([PrinceJS.Level.TILE_WALL].includes(tile.element)) {
      return;
    }
    y++;
  }
};

PrinceJS.Fighter.prototype.checkChoppers = function () {
  if (this.charName === "kid") {
    this.level.activateChopper(-1, this.charBlockY, this.room);
    if (this.level.rooms[this.room]) {
      let rightRoom = this.level.rooms[this.room].links.right;
      if (this.charBlockX === 9 && this.charX > 130 && rightRoom > 0) {
        this.level.activateChopper(-1, this.charBlockY, rightRoom);
      }
    }
    if (this.level.rooms[this.room]) {
      let leftRoom = this.level.rooms[this.room].links.left;
      if (this.charBlockX === 0 && this.charX < 5 && leftRoom > 0) {
        this.level.activateChopper(-1, this.charBlockY, leftRoom);
      }
    }
  }
  this.tryChoppers(this.charBlockX, this.charBlockY);
};

PrinceJS.Fighter.prototype.inChopDistance = function (tile) {
  let offsetX = -16;
  return Math.abs(tile.centerX - this.centerX + offsetX) < 6 + (this.swordDrawn ? 10 : 0);
};

PrinceJS.Fighter.prototype.tryChoppers = function (x, y) {
  if (this.charName === "skeleton") {
    return;
  }

  let tile = this.level.getTileAt(x, y, this.room);
  if (tile.element !== PrinceJS.Level.TILE_CHOPPER || this.faceR()) {
    tile = this.level.getTileAt(x + 1, y, this.room);
  }
  if (tile.element === PrinceJS.Level.TILE_CHOPPER && tile.step >= 1 && tile.step <= 3) {
    if (this.inChopDistance(tile) && this.action !== "turn") {
      tile.showBlood();
      if (this.alive) {
        this.dieChopper();
        this.game.sound.play("HalvedByChopper");
        this.alignToTile(tile);
        this.charX += this.faceL() ? -5 : -9;
        if (this.charName === "kid") {
          PrinceJS.Utils.flashRedDamage(this.game);
        }
      }
    }
  }
};

PrinceJS.Fighter.prototype.dieSpikes = function () {
  if (!this.alive || this.charName === "skeleton") {
    return;
  }

  this.die();
  this.action = "impale";
};

PrinceJS.Fighter.prototype.dieChopper = function () {
  if (!this.alive || this.charName === "skeleton") {
    return;
  }

  this.die();
  this.action = "halve";
};

PrinceJS.Fighter.prototype.damageLife = function () {
  if (!this.alive || this.charName === "skeleton") {
    return;
  }

  if (this.charName === "shadow") {
    PrinceJS.Utils.flashRedDamage(this.game);
  }
  this.showSplash();
  if (this.health > 1) {
    this.health -= 1;
    this.onDamageLife.dispatch(1);
    if (this.active && this.charName === "shadow" && this.opponent) {
      this.opponent.damageLife();
    }
  } else {
    this.die();
    if (this.active && this.charName === "shadow" && this.opponent) {
      this.opponent.die();
    }
  }
};

PrinceJS.Fighter.prototype.die = function (action) {
  if (!this.alive) {
    return;
  }
  if (this.charName === "skeleton") {
    this.action = "stand";
    return;
  }

  let damage = this.health;
  this.health -= damage;
  this.onDamageLife.dispatch(damage);

  this.action = action || "dropdead";
  this.alive = false;
  this.swordDrawn = false;
  this.hideSplash();
};

PrinceJS.Fighter.prototype.inLooseFloorDistance = function (tile) {
  return !!tile;
};

PrinceJS.Fighter.prototype.checkLooseFloor = function (tile) {};

PrinceJS.Fighter.prototype.proceedOnDead = function () {
  this.onDead.dispatch();
};

PrinceJS.Fighter.prototype.alignToTile = function (tile) {
  if (this.faceL()) {
    this.charX = PrinceJS.Utils.convertBlockXtoX(tile.roomX) - 2;
  } else {
    this.charX = PrinceJS.Utils.convertBlockXtoX(tile.roomX + 1) + 1;
  }
  this.charY = PrinceJS.Utils.convertBlockYtoY(tile.roomY);
  this.room = tile.room;
  this.updateBase();
  this.maskAndCrop();
  this.inJumpUp = false;
};

PrinceJS.Fighter.prototype.alignToFloor = function () {
  let tile = this.level.getTileAt(this.charBlockX, this.charBlockY, this.room);
  this.charY = PrinceJS.Utils.convertBlockYtoY(tile.roomY);
  this.inJumpUp = false;
  this.maskAndCrop();
};

PrinceJS.Fighter.prototype.maskAndCrop = function () {
  if (this.frameID(16) || this.frameID(21)) {
    this.level.unMaskTile();
  }
};
