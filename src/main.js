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
  let game = new Phaser.Game(640, 400, Phaser.AUTO, "gameContainer", null, false, false);
  // Exposed for the automated tests in tests/
  PrinceJS.game = game;
  window.PrinceJS = PrinceJS;

  game.state.add("Boot", PrinceJS.Boot);
  game.state.add("Preloader", PrinceJS.Preloader);
  game.state.add("Game", PrinceJS.Game);
  game.state.add("Title", PrinceJS.Title);
  game.state.add("EndTitle", PrinceJS.EndTitle);
  game.state.add("Credits", PrinceJS.Credits);
  game.state.add("Cutscene", PrinceJS.Cutscene);

  game.state.start("Boot");
});
