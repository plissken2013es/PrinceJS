import Phaser from "phaser";
import PrinceJS from "./PrinceJS.js";

import "./modules.js";

if (new URLSearchParams(location.search).has("test")) {
  try {
    PrinceJS.testPlay = JSON.parse(localStorage.getItem(PrinceJS.TEST_PLAY_KEY));
  } catch (e) {
    PrinceJS.testPlay = null;
  }
}

window.addEventListener("load", () => {
  let game = new Phaser.Game({
    type: Phaser.AUTO,
    width: PrinceJS.WORLD_WIDTH,
    height: PrinceJS.WORLD_HEIGHT,
    parent: "gameContainer",
    backgroundColor: "#000000",
    pixelArt: true,
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
