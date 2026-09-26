"use strict";

PrinceJS.Preloader = function (game) {};

PrinceJS.Preloader.prototype = {
  preload: function () {
    this.text = this.game.add.bitmapText(
      PrinceJS.SCREEN_WIDTH * 0.5,
      PrinceJS.SCREEN_HEIGHT * 0.5,
      "font",
      "Loading. . . .",
      16
    );
    this.text.anchor.setTo(0.5, 0.5);

    this.load.atlasJSONHash("kid", "assets/gfx/kid.png", "assets/gfx/kid.json");
    this.load.atlasJSONHash("princess", "assets/gfx/princess.png", "assets/gfx/princess.json");
    this.load.atlasJSONHash("vizier", "assets/gfx/vizier.png", "assets/gfx/vizier.json");
    this.load.atlasJSONHash("mouse", "assets/gfx/mouse.png", "assets/gfx/mouse.json");
    this.load.atlasJSONHash("guard-1", "assets/gfx/guard-1.png", "assets/gfx/guard-1.json");
    this.load.atlasJSONHash("guard-2", "assets/gfx/guard-2.png", "assets/gfx/guard-2.json");
    this.load.atlasJSONHash("guard-3", "assets/gfx/guard-3.png", "assets/gfx/guard-3.json");
    this.load.atlasJSONHash("guard-4", "assets/gfx/guard-4.png", "assets/gfx/guard-4.json");
    this.load.atlasJSONHash("guard-5", "assets/gfx/guard-5.png", "assets/gfx/guard-5.json");
    this.load.atlasJSONHash("guard-6", "assets/gfx/guard-6.png", "assets/gfx/guard-6.json");
    this.load.atlasJSONHash("guard-7", "assets/gfx/guard-7.png", "assets/gfx/guard-7.json");
    this.load.atlasJSONHash("fatguard", "assets/gfx/fatguard.png", "assets/gfx/fatguard.json");
    this.load.atlasJSONHash("jaffar", "assets/gfx/jaffar.png", "assets/gfx/jaffar.json");
    this.load.atlasJSONHash("skeleton", "assets/gfx/skeleton.png", "assets/gfx/skeleton.json");
    this.load.atlasJSONHash("shadow", "assets/gfx/shadow.png", "assets/gfx/shadow.json");
    this.load.atlasJSONHash("dungeon", "assets/gfx/dungeon.png", "assets/gfx/dungeon.json");
    this.load.atlasJSONHash("palace", "assets/gfx/palace.png", "assets/gfx/palace.json");
    this.load.atlasJSONHash("general", "assets/gfx/general.png", "assets/gfx/general.json");
    this.load.atlasJSONHash("title", "assets/gfx/title.png", "assets/gfx/title.json");
    this.load.atlasJSONHash("cutscene", "assets/gfx/cutscene.png", "assets/gfx/cutscene.json");
    this.load.json("kid-anims", "assets/anims/kid.json");
    this.load.json("sword-anims", "assets/anims/sword.json");
    this.load.json("fighter-anims", "assets/anims/fighter.json");
    this.load.json("princess-anims", "assets/anims/princess.json");
    this.load.json("shadow-anims", "assets/anims/shadow.json");
    this.load.json("vizier-anims", "assets/anims/vizier.json");
    this.load.json("mouse-anims", "assets/anims/mouse.json");

    this.game.load.audio("PrologueA", "assets/music/01_Prologue_A.ogg");
    this.game.load.audio("PrologueB", "assets/music/02_Prologue_B.ogg");
    this.game.load.audio("Princess", "assets/music/03_Princess.ogg");
    this.game.load.audio("Jaffar", "assets/music/04_Jaffar.ogg");
    this.game.load.audio("Heartbeat", "assets/music/05_Heartbeat.ogg");
    this.game.load.audio("Danger", "assets/music/06_Danger.ogg");
    this.game.load.audio("Accident", "assets/music/07_Accident.ogg");
    this.game.load.audio("Potion1", "assets/music/08_Potion_1.ogg");
    this.game.load.audio("Victory", "assets/music/09_Victory.ogg");
    this.game.load.audio("Prince", "assets/music/11_Prince.ogg");
    this.game.load.audio("Heartbeat2", "assets/music/12_Heartbeat_2.ogg");
    this.game.load.audio("HeroicDeath", "assets/music/13_Heroic_Death.ogg");
    this.game.load.audio("Potion2", "assets/music/14_Potion_2.ogg");
    this.game.load.audio("TheShadow", "assets/music/15_The_Shadow.ogg");
    this.game.load.audio("Float", "assets/music/16_Float.ogg");
    this.game.load.audio("Timer", "assets/music/17_Timer.ogg");
    this.game.load.audio("TragicEnd", "assets/music/18_Tragic_End.ogg");
    this.game.load.audio("Jaffar2", "assets/music/19_Jaffar_2.ogg");
    this.game.load.audio("JaffarDead", "assets/music/20_Jaffar_Dead.ogg");
    this.game.load.audio("Embrace", "assets/music/21_Embrace.ogg");
    this.game.load.audio("Epilogue", "assets/music/22_Epilogue.ogg");

    this.game.load.audio("FreeFallLand", "assets/sfx/01_Free_fall_land.wav");
    this.game.load.audio("LooseFloorLands", "assets/sfx/02_Loose_floor_lands.wav");
    this.game.load.audio("LooseFloorShakes", "assets/sfx/03_Loose_floor_shakes.wav");
    this.game.load.audio("GateComingDownSlow", "assets/sfx/04_Gate_coming_down_slow.wav");
    this.game.load.audio("GateRising", "assets/sfx/05_Gate_rising.wav");
    this.game.load.audio("GateReachesBottomClang", "assets/sfx/06_Gate_reaches_bottom_clang.wav");
    this.game.load.audio("GateStopsAtTop", "assets/sfx/07_Gate_stops_at_top.wav");
    this.game.load.audio("BumpIntoWallSoft", "assets/sfx/08_Bump_into_wall_soft.wav");
    this.game.load.audio("BumpIntoWallHard", "assets/sfx/09_Bump_into_wall_hard.wav");
    this.game.load.audio("SwordClash", "assets/sfx/10_Sword_clash.wav");
    this.game.load.audio("StabAir", "assets/sfx/11_Stab_air.wav");
    this.game.load.audio("StabOpponent", "assets/sfx/12_Stab_opponent.wav");
    this.game.load.audio("StabbedByOpponent", "assets/sfx/13_Stabbed_by_opponent.wav");
    this.game.load.audio("MediumLandingOof", "assets/sfx/14_Medium_landing_oof.wav");
    this.game.load.audio("SoftLanding", "assets/sfx/15_Soft_landing.wav");
    this.game.load.audio("UnsheatheSword", "assets/sfx/16_Unsheathe_sword.wav");
    this.game.load.audio("LooseFloorShakes3", "assets/sfx/17_Loose_floor_shakes_3.wav");
    this.game.load.audio("LooseFloorShakes2", "assets/sfx/18_Loose_floor_shakes_2.wav");
    this.game.load.audio("FloorButton", "assets/sfx/19_Floor_button.wav");
    this.game.load.audio("Footsteps", "assets/sfx/20_Footsteps.wav");
    this.game.load.audio("BonesLeapToLife", "assets/sfx/21_Bones_leap_to_life.wav");
    this.game.load.audio("Mirror", "assets/sfx/22_Mirror.wav");
    this.game.load.audio("HalvedByChopper", "assets/sfx/23_Halved_by_chopper.wav");
    this.game.load.audio("SlicerBladesClash", "assets/sfx/24_Slicer_blades_clash.wav");
    this.game.load.audio("HardLandingSplat", "assets/sfx/25_Hard_landing_splat.wav");
    this.game.load.audio("ImpaledBySpikes", "assets/sfx/26_Impaled_by_spikes.wav");
    this.game.load.audio("DoorSqueak", "assets/sfx/27_Door_squeak.wav");
    this.game.load.audio("FallingFloorLands", "assets/sfx/28_Falling_floor_lands.wav");
    this.game.load.audio("EntranceDoorCloses", "assets/sfx/29_Entrance_door_closes.wav");
    this.game.load.audio("ExitDoorOpening", "assets/sfx/30_Exit_door_opening.wav");
    this.game.load.audio("DrinkPotionGlugGlug", "assets/sfx/31_Drink_potion_glug_glug.wav");
    this.game.load.audio("Beep", "assets/sfx/32_Beep.wav");
    this.game.load.audio("SpikedBySpikes", "assets/sfx/33_Spiked_by_spikes.wav");
  },

  create: function () {
    this.text.setText("Click to Start");
    this.text.inputEnabled = true;
    this.text.events.onInputDown.add(this.start, this);

    this.input.keyboard.onDownCallback = this.start.bind(this);
    this.game.input.onDown.addOnce(() => {
      this.game.sound.context.resume();
    });
  },

  start: function () {
    if (PrinceJS.SKIP_TITLE) {
      this.state.start("Game");
    } else {
      this.state.start("Title");
    }
  }
};
