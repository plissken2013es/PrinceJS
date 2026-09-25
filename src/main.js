import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

// Module evaluation order matters: prototypes are extended at load time
import "./Boot.js";
import "./Preloader.js";
import "./Game.js";
import "./Utils.js";
import "./Title.js";
import "./EndTitle.js";
import "./Credits.js";
import "./Cutscene.js";
import "./Scene.js";
import "./Level.js";
import "./LevelBuilder.js";
import "./Actor.js";
import "./Fighter.js";
import "./Enemy.js";
import "./Kid.js";
import "./Mouse.js";
import "./Interface.js";
import "./tiles/Base.js";
import "./tiles/Button.js";
import "./tiles/Chopper.js";
import "./tiles/Clock.js";
import "./tiles/ExitDoor.js";
import "./tiles/Gate.js";
import "./tiles/Loose.js";
import "./tiles/Mirror.js";
import "./tiles/Potion.js";
import "./tiles/Skeleton.js";
import "./tiles/Spikes.js";
import "./tiles/Star.js";
import "./tiles/Sword.js";
import "./tiles/Torch.js";

window.addEventListener("load", () => {
  let game = new Phaser.Game({
    type: Phaser.AUTO,
    width: PrinceJS.WORLD_WIDTH,
    height: PrinceJS.WORLD_HEIGHT,
    parent: "gameContainer",
    backgroundColor: "#000000",
    pixelArt: true,
    // Phaser 2 ran the game logic at most 60 times per second, whatever the display rate.
    // The title and credits count frames, so they would play faster on faster displays.
    fps: { limit: 60 },
    // The first scene in the list starts automatically
    scene: [
      PrinceJS.Boot,
      PrinceJS.Preloader,
      PrinceJS.Game,
      PrinceJS.Title,
      PrinceJS.EndTitle,
      PrinceJS.Credits,
      PrinceJS.Cutscene
    ]
  });
  // Exposed for the automated tests in tests/ and for browser dev tools
  PrinceJS.game = game;
  window.PrinceJS = PrinceJS;
  window.Phaser = Phaser;
});
