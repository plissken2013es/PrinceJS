import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.Actor = class extends Phaser.GameObjects.Sprite {
  constructor(scene, charX, charY, charFace, key, animKey) {
    super(scene, 0, 0, key);

    if (typeof animKey === "undefined") {
      animKey = key;
    }

    this.charX = charX;
    this.charY = charY;
    this.charFace = charFace;
    this.charName = key;

    this.charFrame;
    this.charFdx = 0;
    this.charFdy = 0;
    this.charFcheck = false;
    this.charFfoot = 0;
    this.charFood = false;
    this.charFthin = false;

    this.scaleX *= -charFace;
    PrinceJS.Utils.anchor(this, 0, 1);

    this._action = "stand";
    this._seqpointer = 0;

    this.scene.add.existing(this);

    this.setDepth(20);

    // Sprites that follow this actor, like children did in Phaser 2
    this.attachments = [];

    this.baseX = 0;
    this.baseY = 0;

    this.charAnims = this.scene.cache.json.get(animKey + "-anims");

    this.commands = [];
    this.delegate = null;

    for (let i = 0; i < 256; i++) {
      this.registerCommand(i, this.CMD_NOOP);
    }

    this.registerCommand(0xff, this.CMD_GOTO); // 255
    this.registerCommand(0xfe, this.CMD_ABOUTFACE); // 254
    this.registerCommand(0xfb, this.CMD_CHX); // 251
    this.registerCommand(0xfa, this.CMD_CHY); // 250
    this.registerCommand(0xf2, this.CMD_TAP); // 242
    this.registerCommand(0x00, this.CMD_FRAME); // 0
  }
};

PrinceJS.Actor.prototype.registerCommand = function (value, fn) {
  this.commands[value] = fn.bind(this);
};

PrinceJS.Actor.prototype.updateCharFrame = function () {
  let framedef = this.charAnims.framedef[this.charFrame];
  this.charFdx = framedef.fdx;
  this.charFdy = framedef.fdy;

  let fcheck = parseInt(framedef.fcheck, 16);
  this.charFfoot = fcheck & 0x1f;
  this.charFood = (fcheck & 0x80) === 0x80;
  this.charFcheck = (fcheck & 0x40) === 0x40;
  this.charFthin = (fcheck & 0x20) === 0x20;
};

PrinceJS.Actor.prototype.updateActor = function () {
  this.processCommand();
  this.updateCharPosition();
};

PrinceJS.Actor.prototype.CMD_NOOP = function (data) {};

PrinceJS.Actor.prototype.CMD_GOTO = function (data) {
  this._action = data.p1;
  this._seqpointer = data.p2 - 1;
};

PrinceJS.Actor.prototype.CMD_ABOUTFACE = function (data) {
  this.changeFace();
};

PrinceJS.Actor.prototype.CMD_CHX = function (data) {
  this.charX += data.p1 * this.charFace;
};

PrinceJS.Actor.prototype.CMD_CHY = function (data) {
  this.charY += data.p1;
};

PrinceJS.Actor.prototype.CMD_TAP = function (data) {};

PrinceJS.Actor.prototype.CMD_FRAME = function (data) {
  this.charFrame = data.p1;
  this.updateCharFrame();
  this.processing = false;
};

PrinceJS.Actor.prototype.processCommand = function () {
  this.processing = true;

  while (this.processing) {
    let data = this.charAnims.sequence[this._action][this._seqpointer];
    this.commands[data.cmd](data);

    this._seqpointer++;
  }
};

PrinceJS.Actor.prototype.changeFace = function () {
  this.charFace *= -1;
  this.scaleX *= -1;
  this.syncAttachments();

  if (this.delegate) {
    this.delegate.syncFace(this);
  }
};

PrinceJS.Actor.prototype.updateCharPosition = function () {
  PrinceJS.Utils.setFrame(this, this.charName + "-" + this.charFrame);

  let tempx = this.charX + this.charFdx * this.charFace;

  if ((this.charFood && this.faceL()) || (!this.charFood && this.faceR())) {
    tempx += 0.5;
  }

  this.x = this.baseX + PrinceJS.Utils.convertX(tempx);
  this.y = this.baseY + this.charY + this.charFdy;
  this.syncAttachments();

  if (this.delegate) {
    this.delegate.syncFrame(this);
  }
};

PrinceJS.Actor.prototype.faceL = function () {
  return this.charFace === -1;
};

PrinceJS.Actor.prototype.faceR = function () {
  return this.charFace === 1;
};

PrinceJS.Actor.prototype.frameID = function (from, to) {
  if (typeof to === "undefined") {
    return this.charFrame === from;
  } else {
    return this.charFrame >= from && this.charFrame <= to;
  }
};

// Attaches a sprite at an offset from the actor's position. It follows the actor's
// position and facing, and is only drawn while the actor is visible.
PrinceJS.Actor.prototype.attach = function (sprite, offsetX, offsetY) {
  let owner = this;

  sprite.offsetX = offsetX;
  sprite.offsetY = offsetY;
  sprite.setDepth(this.depth);
  sprite.willRender = function (camera) {
    return owner.visible && Phaser.GameObjects.Sprite.prototype.willRender.call(this, camera);
  };
  this.scene.add.existing(sprite);
  this.attachments.push(sprite);
  this.syncAttachments();

  return sprite;
};

PrinceJS.Actor.prototype.syncAttachments = function () {
  for (let sprite of this.attachments) {
    sprite.x = this.x + sprite.offsetX * this.scaleX;
    sprite.y = this.y + sprite.offsetY * this.scaleY;
    sprite.scaleX = this.scaleX;
    sprite.scaleY = this.scaleY;
  }
};

// Phaser 2's centerX: based on the anchor and the signed, cropped width
Object.defineProperty(PrinceJS.Actor.prototype, "centerX", {
  get: function () {
    let width = PrinceJS.Utils.width(this);
    return this.x - this.anchorX * width + width * 0.5;
  }
});

Object.defineProperty(PrinceJS.Actor.prototype, "action", {
  get: function () {
    return this._action;
  },

  set: function (value) {
    this._action = value;

    this._seqpointer = 0;
  }
});
