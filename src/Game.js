import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.Game = class extends Phaser.Scene {
  constructor() {
    super("Game");

    this.kid;

    this.level;

    this.ui;
    this.currentRoom;

    this.enemies = [];

    this.continueTimer = -1;
    this.pressButtonToContinueTimer = -1;
  }
};

Object.assign(PrinceJS.Game.prototype, {
  preload: function () {
    // Every level is loaded under the same key
    this.cache.json.remove("level");
    this.load.json("level", "assets/maps/level" + PrinceJS.currentLevel + ".json");

    if (!PrinceJS.startTime) {
      PrinceJS.startTime = new Date();
    }
  },

  create: function () {
    this.game.sound.stopAll();

    // Phaser reuses this state object, so per-run state must be reset here
    this.enemies = [];
    this.continueTimer = -1;
    this.pressButtonToContinueTimer = -1;
    this.leavingState = false;

    PrinceJS.Utils.setupCamera(this);

    if (PrinceJS.currentLevel === 1) {
      PrinceJS.firstLand = true;
    }

    let json = this.cache.json.get("level");

    this.level = new PrinceJS.LevelBuilder(this, this).buildFromJSON(json);

    this.shadow = null;
    this.mouse = null;
    for (let i = 0; i < json.guards.length; i++) {
      let data = json.guards[i];
      let enemy = new PrinceJS.Enemy(
        this,
        this.level,
        data.location,
        data.direction,
        data.room,
        data.skill,
        data.colors,
        data.type,
        i
      );
      if (data.visible === false) {
        enemy.hide();
      }
      if (data.active === false) {
        enemy.deactivate();
      }
      enemy.onInitLife.add((fighter) => {
        this.ui.setOpponentLive(fighter);
      }, this);
      this.enemies.push(enemy);
      if (enemy.charName === "shadow") {
        this.shadow = enemy;
      }
    }

    this.kid = new PrinceJS.Kid(this, this.level, json.prince.location, json.prince.direction, json.prince.room);
    if (json.prince.turn !== false) {
      this.kid.charX -= 6;
      PrinceJS.Utils.delayed(
        this,
        () => {
          this.kid.action = "turn";
        },
        100
      );
    }
    this.kid.charX += json.prince.offset || 0;

    this.kid.onChangeRoom.add(this.changeRoom, this);
    this.kid.onNextLevel.add(this.nextLevel, this);
    this.kid.onDead.add(this.handleDead, this);

    this.blockCamera = false;
    this.setupCamera(json.prince.room, json.prince.cameraRoom);
    this.currentRoom = json.prince.room;
    PrinceJS.Tile.Gate.reset();
    this.updateRoom(this.currentRoom, json.prince.cameraRoom, true);

    this.ui = new PrinceJS.Interface(this, this);
    this.ui.setPlayerLive(this.kid);

    this.worldTimer = this.time.addEvent({ delay: 80, loop: true, callback: this.updateWorld, callbackScope: this });

    this.input.keyboard.on("keydown-R", this.restartGameEvent, this);
    this.input.keyboard.on("keydown-A", this.restartLevelEvent, this);
    this.input.keyboard.on("keydown-L", this.nextLevelEvent, this);
    this.input.keyboard.on("keydown-SPACE", this.showRemainingMinutes, this);

    PrinceJS.Utils.onAnyKey(this, this.continueLevel.bind(this));

    if (PrinceJS.danger) {
      PrinceJS.danger = false;
      PrinceJS.Utils.delayed(
        this,
        () => {
          this.game.sound.play("Danger");
        },
        800
      );
    }

    this.firstUpdate = true;
  },

  update: function () {},

  updateWorld: function () {
    // A state change only happens on the next frame; the world belongs to the old level until then
    if (this.leavingState) {
      return;
    }
    this.level.update();
    this.kid.updateActor();
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].updateActor();
    }
    if (this.mouse) {
      this.mouse.updateActor();
    }
    this.checkLevelLogic();
    this.ui.updateUI();
    this.checkTimers();
  },

  checkLevelLogic: function () {
    let jaffar;
    let skeleton;
    let tile;

    switch (PrinceJS.currentLevel) {
      case 1:
        if (this.firstUpdate) {
          this.level.fireEvent(8, PrinceJS.Level.TILE_DROP_BUTTON);
        }
        break;

      case 3:
        skeleton = this.kid.opponent && this.kid.opponent.charName === "skeleton" ? this.kid.opponent : null;
        if (skeleton) {
          if (
            this.level.exitDoorOpen &&
            this.kid.room === skeleton.room &&
            Math.abs(this.kid.opponentDistance()) < 999
          ) {
            let tile = this.level.getTileAt(skeleton.charBlockX, skeleton.charBlockY, skeleton.room);
            if (tile.element === PrinceJS.Level.TILE_SKELETON) {
              tile.removeObject();
              skeleton.activate();
              this.game.sound.play("BonesLeapToLife");
            }
          }
          if (skeleton.room === 3 && skeleton.setCharForRoom !== skeleton.room) {
            skeleton.setCharForRoom = skeleton.room;
            PrinceJS.Utils.delayed(
              this,
              () => {
                skeleton.charX = PrinceJS.Utils.convertBlockXtoX(4);
                skeleton.charY = PrinceJS.Utils.convertBlockYtoY(1);
                skeleton.land();
                if (skeleton.charFace === -1) {
                  skeleton.turn();
                }
              },
              500
            );
          }
        }
        break;

      case 4:
        if (this.level.exitDoorOpen && this.kid.room === 11 && this.kid.charBlockY === 0) {
          tile = this.level.getTileAt(4, 0, 4);
          if (tile) {
            tile.addObject();
            this.kid.delegate = tile;
            this.level.mirror = tile;
          }
        } else if (
          this.level.exitDoorOpen &&
          this.kid.room === 4 &&
          this.kid.charBlockY === 0 &&
          this.level.mirror &&
          !this.level.mirrorDetected
        ) {
          this.level.mirrorDetected = true;
          PrinceJS.Utils.delayed(
            this,
            () => {
              this.game.sound.play("Danger");
            },
            400
          );
        }
        tile = this.level.getTileAt(this.kid.charBlockX - this.kid.charFace, this.kid.charBlockY, this.kid.room);
        if (
          tile &&
          tile.element === PrinceJS.Level.TILE_MIRROR &&
          this.kid.action === "runjump" &&
          this.kid.faceL() &&
          !this.level.shadowOutOfMirror
        ) {
          if (this.kid.distanceToFloor() === 0) {
            this.kid.bump();
          } else {
            tile.hideReflection();
            this.shadow.appearOutOfMirror(tile);
            this.level.shadowOutOfMirror = true;
            this.game.sound.play("Mirror");
          }
        }
        if (this.level.mirror && this.kid.room === 4 && this.kid.charBlockX <= 3 && this.kid.charBlockY === 1) {
          tile = this.level.getTileAt(4, 0, 4);
          tile.hideReflection();
        }
        if (this.shadow.visible && this.shadow.charBlockY > 0) {
          this.shadow.action = "stand";
          this.shadow.hide();
        }
        break;

      case 5:
        tile = this.level.getTileAt(1, 0, 24);
        if (tile.state === PrinceJS.Tile.Gate.STATE_RAISING && !this.shadow.visible && this.shadow.faceR()) {
          this.shadow.visible = true;
          this.performProgram(
            [
              { i: "ACTION", p1: 2600, p2: "running" },
              { i: "ACTION", p1: 700, p2: "runstop" },
              { i: "ACTION", p1: 0, p2: "drinkpotion" },
              { i: "SOUND", p1: 0, p2: "DrinkPotionGlugGlug" },
              { i: "REM_OBJECT" },
              { i: "WAIT", p1: 1500 },
              { i: "ACTION", p1: 500, p2: "turn" },
              { i: "ACTION", p1: 3000, p2: "running" }
            ],
            this.shadow
          );
        }
        if (this.shadow.visible && this.shadow.room === 11 && this.shadow.charBlockX === 8 && this.shadow.faceL()) {
          this.shadow.action = "stand";
          this.shadow.hide();
        }
        break;

      case 6:
        if (this.firstUpdate) {
          this.shadow.charX += 8;
        }
        if (this.kid.room === 1) {
          if (this.kid.charBlockX === 8 && !this.level.shadowDetected) {
            this.level.shadowDetected = true;
            this.game.sound.play("Danger");
          }
          if (this.kid.charBlockX === 6) {
            this.shadow.action = "step11";
          }
          if (this.kid.charBlockY === 2 && this.kid.charY >= 185) {
            this.blockCamera = true;
            PrinceJS.Utils.delayed(
              this,
              () => {
                this.nextLevel(PrinceJS.currentLevel);
              },
              100
            );
          }
        }
        break;

      case 8:
        if (this.level.exitDoorOpen && this.kid.room === 16 && this.kid.charBlockY === 0) {
          if (!this.level.waitForMouse) {
            this.level.waitForMouse = true;
            PrinceJS.Utils.delayed(
              this,
              () => {
                this.level.waitedForMouse = true;
              },
              12000
            );
          }
          if (this.level.waitedForMouse && !this.mouse) {
            this.mouse = new PrinceJS.Mouse(this, this.level, 16, 9, -1);
            this.performProgram(
              [
                { i: "ACTION", p1: 625, p2: "scurry" },
                { i: "ACTION", p1: 0, p2: "stop" },
                { i: "ACTION", p1: 1000, p2: "raise" },
                { i: "ACTION", p1: 0, p2: "stop" },
                { i: "TURN", p1: 0 },
                { i: "ACTION", p1: 600, p2: "scurry" },
                { i: "REM_ACTOR" }
              ],
              this.mouse
            );
          }
        }
        break;

      case 12:
        if (
          this.kid.room === 20 &&
          this.kid.charBlockY === 1 &&
          this.level.getTileAt(1, 0, 15).element === PrinceJS.Level.TILE_SWORD
        ) {
          this.level.removeObject(1, 0, 15);
        } else if (
          this.kid.room === 15 &&
          (this.kid.charBlockX === 5 || this.kid.charBlockX === 6) &&
          !this.shadow.visible &&
          !this.level.shadowMerge
        ) {
          this.shadow.charX = PrinceJS.Utils.convertBlockXtoX(1);
          this.shadow.charY = PrinceJS.Utils.convertBlockYtoY(1);
          this.shadow.show();
          this.shadow.activate();
          PrinceJS.Utils.delayed(
            this,
            () => {
              this.shadow.refracTimer = 9;
              this.shadow.opponent = this.kid;
              this.kid.opponent = this.shadow;
              this.kid.opponentSync = true;
            },
            1000
          );
        }
        if (
          !this.shadow.active &&
          this.kid.opponent &&
          Math.abs(this.kid.opponentDistance()) < 15 &&
          !this.level.shadowMerge
        ) {
          this.level.shadowMerge = true;
          this.ui.resetOpponentLive();
          this.kid.addLife();
          this.kid.mergeShadowPosition();
          this.kid.showShadowOverlay();
          this.kid.flashShadowOverlay();
          PrinceJS.Utils.flashWhiteShadowMerge(this);
          PrinceJS.Utils.delayed(
            this,
            () => {
              if (this.level.shadowMerge) {
                this.game.sound.play("Prince");
              }
              PrinceJS.Utils.delayed(
                this,
                () => {
                  this.level.leapOfFaith = true;
                },
                13000
              );
            },
            2000
          );
        }
        if (this.level.leapOfFaith && !this.level.leapOfFaithSetup) {
          this.level.leapOfFaithSetup = true;
          for (let i = 0; i < 10; i++) {
            tile = this.level.getTileAt(i, 0, 2);
            if (tile.element === PrinceJS.Level.TILE_SPACE) {
              tile.element = PrinceJS.Level.TILE_FLOOR;
              tile.hidden = true;
            }
            if (i >= 6) {
              tile = this.level.getTileAt(i, 0, this.level.rooms[2].links.left);
              if (tile.element === PrinceJS.Level.TILE_SPACE) {
                tile.element = PrinceJS.Level.TILE_FLOOR;
                tile.hidden = true;
              }
            }
          }
        }
        if (this.kid.room === 23 && this.kid.charBlockX === 9 && this.kid.charBlockY === 1) {
          this.nextLevel(PrinceJS.currentLevel);
        }
        break;

      case 13:
        if (this.firstUpdate) {
          this.kid.action = "startrun";
        }
        if (this.kid.room === 23 || this.kid.room === 16) {
          let tiles = [2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
          for (let i = 0; i < tiles.length; i++) {
            let tile = this.kid.level.getTileAt(tiles[i], 2, this.level.rooms[this.kid.room].links.up);
            if (tile.element === PrinceJS.Level.TILE_LOOSE_BOARD && !tile.fallStarted()) {
              tile.shake(true);
              break;
            }
          }
        }
        jaffar = this.enemies[0];
        if (jaffar) {
          if (this.kid.room === 1 && this.enemies.length) {
            if (jaffar.alive && !jaffar.meet) {
              this.game.sound.play("Jaffar2");
              jaffar.meet = true;
            }
          }
          if (!jaffar.alive && !PrinceJS.endTime) {
            PrinceJS.endTime = new Date();
            this.ui.showRemainingMinutes();
          }
          if (!jaffar.alive && !this.level.triggerOpenExitDoor) {
            this.level.triggerOpenExitDoor = true;
            PrinceJS.Utils.delayed(
              this,
              () => {
                let button = this.level.getTileAt(0, 0, 24);
                if (button.element === PrinceJS.Level.TILE_RAISE_BUTTON) {
                  button.mute = true;
                  button.push();
                }
              },
              5000
            );
          }
        }
        break;

      case 14:
        if (this.kid.room === 5) {
          this.nextLevel();
        }
        break;
    }

    this.firstUpdate = false;
  },

  fireEvent: function (event, type) {
    this.level.fireEvent(event, type);
  },

  performProgram: function (program, actor) {
    return program.reduce((promise, operation) => {
      return promise.then(() => {
        let object = operation.o || actor;
        let fn;
        switch (operation.i) {
          case "ACTION":
            fn = () => {
              object.action = operation.p2;
            };
            break;
          case "WAIT":
            fn = () => {};
            break;
          case "TURN":
            fn = () => {
              object.turn();
            };
            break;
          case "SOUND":
            fn = () => {
              this.game.sound.play(operation.p2);
            };
            break;
          case "REM_OBJECT":
            fn = () => {
              this.level.removeObject(object.charBlockX, object.charBlockY, object.room);
            };
            break;
          case "REM_ACTOR":
            fn = () => {
              object.visible = false;
              object.kill();
            };
            break;
          default:
            fn = operation.i;
            break;
        }
        return PrinceJS.Utils.perform(this, fn, operation.p1);
      });
    }, Promise.resolve());
  },

  checkTimers: function () {
    if (this.continueTimer > -1) {
      this.continueTimer--;
      if (this.continueTimer === 0) {
        this.continueTimer = -1;
        this.ui.showPressButtonToContinue();
        this.pressButtonToContinueTimer = 260;
      }
    }
    if (this.pressButtonToContinueTimer > -1) {
      this.pressButtonToContinueTimer--;
      if (this.pressButtonToContinueTimer === 0) {
        this.pressButtonToContinueTimer = -1;
        this.restartGame();
      }
    }
  },

  showRemainingMinutes: function () {
    this.ui.showRemainingMinutes();
  },

  restartGameEvent(event) {
    if (!event.ctrlKey) {
      return;
    }
    this.restartGame();
  },

  restartLevelEvent(event) {
    if (!event.ctrlKey) {
      return;
    }
    this.restartLevel();
  },

  nextLevelEvent: function (event) {
    if (!event.ctrlKey) {
      return;
    }

    if (PrinceJS.currentLevel > 3) {
      return;
    }

    this.nextLevel(undefined, true);
  },

  restartGame() {
    PrinceJS.Init();

    PrinceJS.Utils.onAnyKey(this, null);
    this.leaveTo("Title");
  },

  restartLevel() {
    this.reset(true);
  },

  nextLevel: function (triggerLevel, skipped = false) {
    if (triggerLevel !== undefined && triggerLevel !== PrinceJS.currentLevel) {
      return;
    }

    PrinceJS.maxHealth = this.kid.maxHealth;
    PrinceJS.currentLevel++;
    if (PrinceJS.currentLevel > 15) {
      this.restartGame();
      return;
    }

    if (skipped) {
      this.ui.setRemainingMinutesTo15();
    }

    this.reset();
  },

  previousLevel: function () {
    PrinceJS.currentLevel--;
    if (PrinceJS.currentLevel === 0) {
      PrinceJS.currentLevel = 14;
    }
    this.reset();
  },

  handleDead: function () {
    this.continueTimer = 10;
  },

  timeUp() {
    PrinceJS.Utils.delayed(
      this,
      () => {
        PrinceJS.currentLevel = 16;
        this.leaveTo("Cutscene");
      },
      1000
    );
  },

  outOfRoom() {
    this.kid.die();
    this.handleDead();
  },

  continueLevel: function () {
    if (this.pressButtonToContinueTimer > -1) {
      this.reset(true);
    }
  },

  reset: function (suppressCutscene) {
    if (!suppressCutscene && [2, 4, 6, 8, 9, 12, 15].indexOf(PrinceJS.currentLevel) > -1) {
      this.leaveTo("Cutscene");
    } else {
      this.leaveTo("Game");
    }
  },

  leaveTo: function (state) {
    this.leavingState = true;
    this.scene.start(state);
  },

  changeRoom: function (room, cameraRoom) {
    this.setupCamera(room, cameraRoom);
    if (this.currentRoom === room) {
      return;
    }
    this.updateRoom(room);
    this.checkForOpponent(room);
  },

  setupCamera: function (room, cameraRoom) {
    if (this.blockCamera) {
      return;
    }
    if (this.currentRoom > 0 && room === -1) {
      this.outOfRoom();
      return;
    }
    if (cameraRoom === 0) {
      return;
    }
    room = cameraRoom || room;
    if (this.level.rooms[room]) {
      this.cameras.main.setScroll(
        this.level.rooms[room].x * PrinceJS.SCREEN_WIDTH,
        this.level.rooms[room].y * PrinceJS.ROOM_HEIGHT
      );
    }
  },

  checkForOpponent: function (room) {
    let currentEnemy;
    // Same Room / Same BlockY
    for (let i = 0; i < this.enemies.length; i++) {
      let enemy = this.enemies[i];
      if (enemy.alive && this.kid.charBlockY === enemy.charBlockY && this.kid.opponentInSameRoom(enemy, room)) {
        currentEnemy = enemy;
        break;
      }
    }
    // Near Room / Same BlockY
    if (!currentEnemy) {
      for (let i = 0; i < this.enemies.length; i++) {
        let enemy = this.enemies[i];
        if (enemy.alive && this.kid.charBlockY === enemy.charBlockY && this.kid.opponentNearRoom(enemy, room)) {
          currentEnemy = enemy;
          break;
        }
      }
    }
    // Same Room
    if (!currentEnemy) {
      for (let i = 0; i < this.enemies.length; i++) {
        let enemy = this.enemies[i];
        if (enemy.alive && this.kid.opponentInSameRoom(enemy, room)) {
          currentEnemy = enemy;
          break;
        }
      }
    }
    // Near Room
    if (!currentEnemy) {
      for (let i = 0; i < this.enemies.length; i++) {
        let enemy = this.enemies[i];
        if (enemy.alive && this.kid.opponentNearRoom(enemy, room)) {
          currentEnemy = enemy;
          break;
        }
      }
    }
    if (currentEnemy) {
      if (this.kid.opponent !== currentEnemy) {
        this.kid.opponent = currentEnemy;
        this.kid.flee = false;
      }
      currentEnemy.opponent = this.kid;
    }
    let opponentSameRoom = false;
    let opponentNextRoom = false;
    if (this.kid.opponent) {
      if (this.kid.opponentInSameRoom(this.kid.opponent, room)) {
        opponentSameRoom = true;
      }
      if (this.kid.opponentNextRoom(this.kid.opponent, room)) {
        opponentNextRoom = true;
      }
    }
    if (opponentSameRoom) {
      this.ui.setOpponentLive(this.kid.opponent);
    } else if (!opponentNextRoom) {
      this.ui.resetOpponentLive();
    }
  },

  updateRoom: function (room, cameraRoom, force = false) {
    if (!force && this.currentRoom === room) {
      return;
    }
    this.level.checkGates(room, this.currentRoom);
    this.currentRoom = room;
  },

  floorStartFall: function (tile) {
    this.level.floorStartFall(tile);
  },

  floorStopFall: function (tile) {
    this.level.floorStopFall(tile);
    this.kid.checkLooseFloor(tile);
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].checkLooseFloor(tile);
    }
  }
});
