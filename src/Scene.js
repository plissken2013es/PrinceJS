import PrinceJS from "./PrinceJS.js";

// The princess' room shown in the cutscenes
PrinceJS.Scene = function (scene) {
  this.scene = scene;

  this.back = this.scene.add.layer();
  this.back.setDepth(10);

  this.front = this.scene.add.layer();
  this.front.setDepth(30);

  this.trobs = [];

  this.flash = false;
  this.tick = 0;

  this._build();
};

PrinceJS.Scene.prototype = {
  _build: function () {
    this.back.add(PrinceJS.Utils.image(this.scene, 0, 0, "cutscene", "room"));
    this.back.add(PrinceJS.Utils.image(this.scene, 0, 142, "cutscene", "room_bed"));

    let torchPos = [
      { x: 53, y: 81 },
      { x: 171, y: 81 }
    ];

    let i;

    for (i = 0; i < torchPos.length; i++) {
      let torch = new PrinceJS.Tile.Torch(this.scene, PrinceJS.Level.TILE_TORCH, 0, PrinceJS.Level.TYPE_PALACE);
      torch.x = torchPos[i].x;
      torch.y = torchPos[i].y;
      torch.backSprite.setFrame("palace_0");
      this.addObject(torch);
    }

    let starPos = [
      { x: 20, y: 97 },
      { x: 16, y: 104 },
      { x: 23, y: 110 },
      { x: 17, y: 116 },
      { x: 24, y: 120 },
      { x: 18, y: 128 }
    ];

    for (i = 0; i < starPos.length; i++) {
      let star = new PrinceJS.Tile.Star(this.scene, starPos[i].x, starPos[i].y);
      this.addObject(star);
    }

    this.front.add(PrinceJS.Utils.image(this.scene, 59, 120, "cutscene", "room_pillar"));
    this.front.add(PrinceJS.Utils.image(this.scene, 240, 120, "cutscene", "room_pillar"));
  },

  addTrob: function (trob) {
    this.trobs.push(trob);
  },

  update: function () {
    let i = this.trobs.length;

    while (i--) {
      this.trobs[i].update();
    }

    if (this.flash) {
      if (this.tick === 7) {
        this.flash = false;
        return;
      }
      if (this.tick % 2) {
        this.scene.cameras.main.setBackgroundColor("#FFFFFF");
      } else {
        this.scene.cameras.main.setBackgroundColor("#000000");
      }
      this.tick++;
    }
  },

  effect: function () {
    this.flash = true;
  },

  addObject: function (object) {
    this.back.add(object.back);
    this.addTrob(object);
  }
};

PrinceJS.Scene.prototype.constructor = PrinceJS.Scene;
