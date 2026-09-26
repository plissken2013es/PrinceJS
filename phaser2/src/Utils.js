"use strict";

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

  delayed: function (fn, millis) {
    return new Promise((resolve) => {
      setTimeout(() => {
        Promise.resolve()
          .then(() => {
            return fn && fn();
          })
          .then((result) => {
            resolve(result);
          });
      }, millis);
    });
  },

  perform: function (fn, millis) {
    return new Promise((resolve) => {
      let result = fn && fn();
      setTimeout(() => {
        resolve(result);
      }, millis);
    });
  },

  flashScreen: function (game, count, color, time) {
    for (let i = 0; i < count * 2; i++) {
      PrinceJS.Utils.delayed(() => {
        game.stage.backgroundColor = i % 2 === 0 ? color : 0x000000;
      }, time * i);
    }
  },

  flashRedDamage: function (game) {
    PrinceJS.Utils.flashScreen(game, 1, PrinceJS.Level.FLASH_RED, 25);
  },

  flashRedPotion: function (game) {
    PrinceJS.Utils.flashScreen(game, 3, PrinceJS.Level.FLASH_RED, 30);
  },

  flashGreenPotion: function (game) {
    PrinceJS.Utils.flashScreen(game, 3, PrinceJS.Level.FLASH_GREEN, 30);
  },

  flashYellowSword: function (game) {
    PrinceJS.Utils.flashScreen(game, 3, PrinceJS.Level.FLASH_YELLOW, 50);
  },

  flashWhiteShadowMerge: function (game) {
    PrinceJS.Utils.flashScreen(game, 15, PrinceJS.Level.FLASH_WHITE, 50);
  },

  flashWhiteVizierVictory: function (game) {
    PrinceJS.Utils.flashScreen(game, 2, PrinceJS.Level.FLASH_WHITE, 100);
    PrinceJS.Utils.delayed(() => {
      PrinceJS.Utils.flashScreen(game, 2, PrinceJS.Level.FLASH_WHITE, 75);
    }, 500);
  },

  random: function (max) {
    return Math.floor(Math.random() * Math.floor(max));
  }
};
