import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

PrinceJS.Preloader = class extends Phaser.Scene {
  constructor() {
    super("Preloader");
  }
};

Object.assign(PrinceJS.Preloader.prototype, {
  preload: function () {
    PrinceJS.Utils.setupCamera(this);

    this.text = this.add.bitmapText(
      PrinceJS.SCREEN_WIDTH * 0.5,
      PrinceJS.SCREEN_HEIGHT * 0.5,
      "font",
      "Loading. . . .",
      16
    );
    this.text.setOrigin(0.5, 0.5);

    PrinceJS.Preloader.loadGraphics(this);
    PrinceJS.Preloader.loadSounds(this);
  },

  create: function () {
    PrinceJS.Preloader.fixPivots(this);

    this.text.setText("Click to Start");
    this.text.setInteractive();
    this.text.on("pointerdown", this.start, this);

    PrinceJS.Utils.onAnyKey(this, this.start.bind(this));

    if (PrinceJS.testPlay) {
      this.start();
    }
  },

  start: function () {
    if (PrinceJS.testPlay) {
      PrinceJS.InitTestPlay();
      this.scene.start("Game");
    } else if (PrinceJS.SKIP_TITLE) {
      this.scene.start("Game");
    } else {
      this.scene.start("Title");
    }
  }
});

// The graphics and animations, also used by the level editor
PrinceJS.Preloader.loadGraphics = function (scene) {
  scene.load.atlas("kid", "assets/gfx/kid.png", "assets/gfx/kid.json");
  scene.load.atlas("princess", "assets/gfx/princess.png", "assets/gfx/princess.json");
  scene.load.atlas("vizier", "assets/gfx/vizier.png", "assets/gfx/vizier.json");
  scene.load.atlas("mouse", "assets/gfx/mouse.png", "assets/gfx/mouse.json");
  scene.load.atlas("guard-1", "assets/gfx/guard-1.png", "assets/gfx/guard-1.json");
  scene.load.atlas("guard-2", "assets/gfx/guard-2.png", "assets/gfx/guard-2.json");
  scene.load.atlas("guard-3", "assets/gfx/guard-3.png", "assets/gfx/guard-3.json");
  scene.load.atlas("guard-4", "assets/gfx/guard-4.png", "assets/gfx/guard-4.json");
  scene.load.atlas("guard-5", "assets/gfx/guard-5.png", "assets/gfx/guard-5.json");
  scene.load.atlas("guard-6", "assets/gfx/guard-6.png", "assets/gfx/guard-6.json");
  scene.load.atlas("guard-7", "assets/gfx/guard-7.png", "assets/gfx/guard-7.json");
  scene.load.atlas("fatguard", "assets/gfx/fatguard.png", "assets/gfx/fatguard.json");
  scene.load.atlas("jaffar", "assets/gfx/jaffar.png", "assets/gfx/jaffar.json");
  scene.load.atlas("skeleton", "assets/gfx/skeleton.png", "assets/gfx/skeleton.json");
  scene.load.atlas("shadow", "assets/gfx/shadow.png", "assets/gfx/shadow.json");
  scene.load.atlas("dungeon", "assets/gfx/dungeon.png", "assets/gfx/dungeon.json");
  scene.load.atlas("palace", "assets/gfx/palace.png", "assets/gfx/palace.json");
  scene.load.atlas("general", "assets/gfx/general.png", "assets/gfx/general.json");
  scene.load.atlas("title", "assets/gfx/title.png", "assets/gfx/title.json");
  scene.load.atlas("cutscene", "assets/gfx/cutscene.png", "assets/gfx/cutscene.json");
  scene.load.json("kid-anims", "assets/anims/kid.json");
  scene.load.json("sword-anims", "assets/anims/sword.json");
  scene.load.json("fighter-anims", "assets/anims/fighter.json");
  scene.load.json("princess-anims", "assets/anims/princess.json");
  scene.load.json("shadow-anims", "assets/anims/shadow.json");
  scene.load.json("vizier-anims", "assets/anims/vizier.json");
  scene.load.json("mouse-anims", "assets/anims/mouse.json");
};

PrinceJS.Preloader.loadSounds = function (scene) {
  scene.load.audio("PrologueA", "assets/music/01_Prologue_A.ogg");
  scene.load.audio("PrologueB", "assets/music/02_Prologue_B.ogg");
  scene.load.audio("Princess", "assets/music/03_Princess.ogg");
  scene.load.audio("Jaffar", "assets/music/04_Jaffar.ogg");
  scene.load.audio("Heartbeat", "assets/music/05_Heartbeat.ogg");
  scene.load.audio("Danger", "assets/music/06_Danger.ogg");
  scene.load.audio("Accident", "assets/music/07_Accident.ogg");
  scene.load.audio("Potion1", "assets/music/08_Potion_1.ogg");
  scene.load.audio("Victory", "assets/music/09_Victory.ogg");
  scene.load.audio("Prince", "assets/music/11_Prince.ogg");
  scene.load.audio("Heartbeat2", "assets/music/12_Heartbeat_2.ogg");
  scene.load.audio("HeroicDeath", "assets/music/13_Heroic_Death.ogg");
  scene.load.audio("Potion2", "assets/music/14_Potion_2.ogg");
  scene.load.audio("TheShadow", "assets/music/15_The_Shadow.ogg");
  scene.load.audio("Float", "assets/music/16_Float.ogg");
  scene.load.audio("Timer", "assets/music/17_Timer.ogg");
  scene.load.audio("TragicEnd", "assets/music/18_Tragic_End.ogg");
  scene.load.audio("Jaffar2", "assets/music/19_Jaffar_2.ogg");
  scene.load.audio("JaffarDead", "assets/music/20_Jaffar_Dead.ogg");
  scene.load.audio("Embrace", "assets/music/21_Embrace.ogg");
  scene.load.audio("Epilogue", "assets/music/22_Epilogue.ogg");

  scene.load.audio("FreeFallLand", "assets/sfx/01_Free_fall_land.wav");
  scene.load.audio("LooseFloorLands", "assets/sfx/02_Loose_floor_lands.wav");
  scene.load.audio("LooseFloorShakes", "assets/sfx/03_Loose_floor_shakes.wav");
  scene.load.audio("GateComingDownSlow", "assets/sfx/04_Gate_coming_down_slow.wav");
  scene.load.audio("GateRising", "assets/sfx/05_Gate_rising.wav");
  scene.load.audio("GateReachesBottomClang", "assets/sfx/06_Gate_reaches_bottom_clang.wav");
  scene.load.audio("GateStopsAtTop", "assets/sfx/07_Gate_stops_at_top.wav");
  scene.load.audio("BumpIntoWallSoft", "assets/sfx/08_Bump_into_wall_soft.wav");
  scene.load.audio("BumpIntoWallHard", "assets/sfx/09_Bump_into_wall_hard.wav");
  scene.load.audio("SwordClash", "assets/sfx/10_Sword_clash.wav");
  scene.load.audio("StabAir", "assets/sfx/11_Stab_air.wav");
  scene.load.audio("StabOpponent", "assets/sfx/12_Stab_opponent.wav");
  scene.load.audio("StabbedByOpponent", "assets/sfx/13_Stabbed_by_opponent.wav");
  scene.load.audio("MediumLandingOof", "assets/sfx/14_Medium_landing_oof.wav");
  scene.load.audio("SoftLanding", "assets/sfx/15_Soft_landing.wav");
  scene.load.audio("UnsheatheSword", "assets/sfx/16_Unsheathe_sword.wav");
  scene.load.audio("LooseFloorShakes3", "assets/sfx/17_Loose_floor_shakes_3.wav");
  scene.load.audio("LooseFloorShakes2", "assets/sfx/18_Loose_floor_shakes_2.wav");
  scene.load.audio("FloorButton", "assets/sfx/19_Floor_button.wav");
  scene.load.audio("Footsteps", "assets/sfx/20_Footsteps.wav");
  scene.load.audio("BonesLeapToLife", "assets/sfx/21_Bones_leap_to_life.wav");
  scene.load.audio("Mirror", "assets/sfx/22_Mirror.wav");
  scene.load.audio("HalvedByChopper", "assets/sfx/23_Halved_by_chopper.wav");
  scene.load.audio("SlicerBladesClash", "assets/sfx/24_Slicer_blades_clash.wav");
  scene.load.audio("HardLandingSplat", "assets/sfx/25_Hard_landing_splat.wav");
  scene.load.audio("ImpaledBySpikes", "assets/sfx/26_Impaled_by_spikes.wav");
  scene.load.audio("DoorSqueak", "assets/sfx/27_Door_squeak.wav");
  scene.load.audio("FallingFloorLands", "assets/sfx/28_Falling_floor_lands.wav");
  scene.load.audio("EntranceDoorCloses", "assets/sfx/29_Entrance_door_closes.wav");
  scene.load.audio("ExitDoorOpening", "assets/sfx/30_Exit_door_opening.wav");
  scene.load.audio("DrinkPotionGlugGlug", "assets/sfx/31_Drink_potion_glug_glug.wav");
  scene.load.audio("Beep", "assets/sfx/32_Beep.wav");
  scene.load.audio("SpikedBySpikes", "assets/sfx/33_Spiked_by_spikes.wav");
};

PrinceJS.Preloader.fixPivots = function (scene) {
  // The atlases define a centered pivot for every frame, which Phaser 2 ignored.
  // Phaser 4 would apply it on every frame change, overriding the sprite origin.
  for (let key of scene.textures.getTextureKeys()) {
    let texture = scene.textures.get(key);
    for (let name of texture.getFrameNames()) {
      texture.get(name).customPivot = false;
    }
  }
};
