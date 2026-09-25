import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

// Minimal replacement for Phaser 2 signals: listeners run in the order they were added.
PrinceJS.Signal = class {
  constructor() {
    this.listeners = [];
  }

  add(fn, context) {
    this.listeners.push({ fn, context });
  }

  remove(fn, context) {
    this.listeners = this.listeners.filter((listener) => listener.fn !== fn || listener.context !== context);
  }

  removeAll() {
    this.listeners = [];
  }

  dispatch(...args) {
    for (const listener of this.listeners.slice()) {
      listener.fn.apply(listener.context, args);
    }
  }
};

PrinceJS.Utils = {
  convertX: function (x) {
    return Math.floor((x * 320) / 140);
  },

  convertXtoBlockX: function (x) {
    return Math.floor((x - 7) / 14);
  },

  convertYtoBlockY: function (y) {
    return Math.floor(y / PrinceJS.BLOCK_HEIGHT);
  },

  convertBlockXtoX: function (block) {
    return block * 14 + 7;
  },

  convertBlockYtoY: function (block) {
    return (block + 1) * PrinceJS.BLOCK_HEIGHT - 10;
  },

  // Runs fn after the delay on the scene clock, so it is cancelled when the scene is left
  // and never touches objects of a level that is already gone.
  delayed: function (scene, fn, millis) {
    return new Promise((resolve) => {
      scene.time.delayedCall(millis, () => {
        resolve(fn && fn());
      });
    });
  },

  // Runs fn now and resolves after the delay on the scene clock
  perform: function (scene, fn, millis) {
    return new Promise((resolve) => {
      let result = fn && fn();
      scene.time.delayedCall(millis, () => {
        resolve(result);
      });
    });
  },

  flashScreen: function (scene, count, color, time) {
    for (let i = 0; i < count * 2; i++) {
      PrinceJS.Utils.delayed(
        scene,
        () => {
          scene.cameras.main.setBackgroundColor(i % 2 === 0 ? color : 0x000000);
        },
        time * i
      );
    }
  },

  flashRedDamage: function (scene) {
    PrinceJS.Utils.flashScreen(scene, 1, PrinceJS.Level.FLASH_RED, 25);
  },

  flashRedPotion: function (scene) {
    PrinceJS.Utils.flashScreen(scene, 3, PrinceJS.Level.FLASH_RED, 30);
  },

  flashGreenPotion: function (scene) {
    PrinceJS.Utils.flashScreen(scene, 3, PrinceJS.Level.FLASH_GREEN, 30);
  },

  flashYellowSword: function (scene) {
    PrinceJS.Utils.flashScreen(scene, 3, PrinceJS.Level.FLASH_YELLOW, 50);
  },

  flashWhiteShadowMerge: function (scene) {
    PrinceJS.Utils.flashScreen(scene, 15, PrinceJS.Level.FLASH_WHITE, 50);
  },

  flashWhiteVizierVictory: function (scene) {
    PrinceJS.Utils.flashScreen(scene, 2, PrinceJS.Level.FLASH_WHITE, 100);
    PrinceJS.Utils.delayed(
      scene,
      () => {
        PrinceJS.Utils.flashScreen(scene, 2, PrinceJS.Level.FLASH_WHITE, 75);
      },
      500
    );
  },

  // Phaser 2 ran the game logic at most 60 times per second, whatever the display rate,
  // while Phaser 4 updates once per display frame. Screens that count frames call this
  // from update() and only advance when it returns true, to keep the Phaser 2 pace.
  // (Phaser 4's fps limit is no substitute: it speeds up the scene clocks.)
  logicFrame: function (scene, delta) {
    let step = 1000 / 60;
    // Like Phaser 2: at most 3 steps of catch-up time per frame, one update per frame
    scene.logicTime = (scene.logicTime || 0) + Math.max(Math.min(step * 3, delta), 0);
    if (scene.logicTime >= step) {
      scene.logicTime -= step;
      return true;
    }
    return false;
  },

  random: function (max) {
    return Math.floor(Math.random() * Math.floor(max));
  },

  between: function (min, max) {
    return Phaser.Math.RND.between(min, max);
  },

  // Equivalent of Phaser 2's Animation.generateFrameNames without zero padding
  frameNames: function (prefix, start, stop) {
    let names = [];
    for (let i = start; i <= stop; i++) {
      names.push(prefix + i);
    }
    return names;
  },

  // Phaser 2 sprites were anchored at their top left corner by default.
  // The image is not added to the display list.
  image: function (scene, x, y, key, frame) {
    return new Phaser.GameObjects.Image(scene, x, y, key, frame).setOrigin(0, 0);
  },

  // Anchors a sprite; unlike setOrigin, the anchor survives cropping.
  anchor: function (sprite, x, y) {
    sprite.anchorX = x;
    sprite.anchorY = y;
    sprite.setOrigin(x, y);
    PrinceJS.Utils.updateCrop(sprite);
    return sprite;
  },

  // Crops a sprite with Phaser 2 semantics: the visible part of the frame is drawn
  // at the sprite position (anchored on the cropped size) instead of staying in place.
  // Pass null to remove the crop.
  crop: function (sprite, rect) {
    sprite.cropRect = rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    PrinceJS.Utils.updateCrop(sprite);
  },

  // Re-applies the crop, needed after the sprite changes its frame
  updateCrop: function (sprite) {
    let anchorX = sprite.anchorX || 0;
    let anchorY = sprite.anchorY || 0;

    if (!sprite.cropRect) {
      if (sprite.cropped) {
        sprite.cropped = null;
        sprite.setCrop();
        sprite.setOrigin(anchorX, anchorY);
      }
      return;
    }

    let frameWidth = sprite.frame.realWidth;
    let frameHeight = sprite.frame.realHeight;
    let rect = sprite.cropRect;

    let x = Math.max(0, rect.x);
    let y = Math.max(0, rect.y);
    let width = Math.max(0, Math.min(frameWidth, rect.x + rect.width) - x);
    let height = Math.max(0, Math.min(frameHeight, rect.y + rect.height) - y);

    sprite.cropped = { x, y, width, height };
    sprite.setCrop(x, y, width, height);
    sprite.setDisplayOrigin(x + anchorX * width, y + anchorY * height);
  },

  // Paused tween that reveals a sprite from left to right, as the title screens do
  revealTween: function (scene, sprite, duration) {
    let rect = { x: 0, y: 0, width: 0, height: sprite.frame.realHeight };
    let apply = () => PrinceJS.Utils.crop(sprite, rect);
    apply();
    return scene.tweens.add({
      targets: rect,
      width: sprite.frame.realWidth,
      duration: duration,
      paused: true,
      onUpdate: apply,
      onComplete: apply
    });
  },

  // Width and height as Phaser 2 reported them: cropped, and the width signed by the horizontal scale
  width: function (sprite) {
    return sprite.scaleX * (sprite.cropped ? sprite.cropped.width : sprite.frame.realWidth);
  },

  height: function (sprite) {
    return sprite.scaleY * (sprite.cropped ? sprite.cropped.height : sprite.frame.realHeight);
  },

  // Sets the frame of a sprite, keeping its crop
  setFrame: function (sprite, name) {
    sprite.setFrame(name);
    PrinceJS.Utils.updateCrop(sprite);
  },

  intersects: function (a, b) {
    return Phaser.Geom.Intersects.RectangleToRectangle(a, b);
  },

  // Replacement for Phaser 2's keyboard.onDownCallback: a single handler for any key
  onAnyKey: function (scene, fn) {
    scene.input.keyboard.off("keydown");
    if (fn) {
      scene.input.keyboard.on("keydown", fn);
    }
  },

  // The game is rendered at 640x400 from a 320x200 world, like Phaser 2's world scale of 2
  setupCamera: function (scene) {
    scene.cameras.main.setOrigin(0, 0).setZoom(PrinceJS.SCALE_FACTOR);
  }
};
