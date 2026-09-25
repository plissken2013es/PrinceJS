"use strict";

// Browser side access to the game for each Phaser version. The tests run against
// the Phaser 4 build by default; PHASER=2 runs them against the original Phaser 2
// build to produce the baselines (see scripts/phaser2-baseline.sh).
// Each adapter is injected into the page as window.engine.

function phaser4() {
  const game = () => PrinceJS.game;
  window.engine = {
    ready: () => typeof PrinceJS !== "undefined" && !!PrinceJS.game,
    // Whether the scene is running, i.e. its create() has run
    running: (name) => game().scene.isActive(name),
    current: () => game().scene.getScenes(true)[0].sys.settings.key,
    start: (name) => game().scene.getScenes(true)[0].scene.start(name),
    scene: (name) => game().scene.getScene(name),
    json: (key) => game().cache.json.get(key),
    frameName: (sprite) => sprite.frame.name,
    rnd: () => Phaser.Math.RND,
    loopCount: () => game().loop.frame
  };
}

function phaser2() {
  const game = () => PrinceJS.game;
  window.engine = {
    ready: () => typeof PrinceJS !== "undefined" && !!PrinceJS.game,
    running: (name) => game().state.current === name && game().state._created && !game().state._pendingState,
    current: () => game().state.current,
    start: (name) => game().state.start(name),
    scene: (name) => game().state.states[name],
    json: (key) => game().cache.getJSON(key),
    frameName: (sprite) => sprite.frameName,
    rnd: () => game().rnd,
    loopCount: () => game().time.time
  };
}

module.exports = {
  name: process.env.PHASER === "2" ? "phaser2" : "phaser4",
  adapter: process.env.PHASER === "2" ? phaser2 : phaser4
};
