// The level editor (editor.html)

import Phaser from "phaser";
import PrinceJS from "../PrinceJS.js";

import "../modules.js";
import { EditorState } from "./EditorState.js";
import { EditorBoot, EditorScene } from "./EditorScene.js";
import { EditorUI } from "./ui.js";
import * as model from "./model.js";

window.addEventListener("load", async () => {
  let state = new EditorState();
  let options = { grid: false, roomNumbers: true, allLinks: false, animate: true };

  // The last level edited, or the first level of the game
  let draft = EditorState.restore();
  if (draft && draft.level) {
    state.load(draft.level, draft.saved);
  } else {
    let response = await fetch("assets/maps/level1.json");
    state.load(await response.json());
  }

  let game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "view",
    backgroundColor: "#101018",
    pixelArt: true,
    // The editor does not play sounds (the tiles would ask for some)
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
    scene: [EditorBoot, EditorScene]
  });
  game.registry.set("state", state);
  game.registry.set("options", options);

  let ui = new EditorUI(state, options, game);
  game.events.once("editor-ready", (scene) => ui.attach(scene));

  // Exposed for the automated tests in tests/ and for browser dev tools
  window.editor = { state, ui, game, options, model };
  window.PrinceJS = PrinceJS;
  window.Phaser = Phaser;
});
