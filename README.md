# Prince of Persia (JS)

Prince of Persia reimplementation written in HTML5/Javascript, built on [Phaser 4](https://phaser.io)

## Play Online

- https://plissken2013es.github.io/PrinceJS/ lets you choose between the original version
  (Phaser 2), the port to Phaser 4 and the level editor

## Play Locally

- Install [Node.js](https://nodejs.org) 20.19+ or 22.12+
- Terminal:
  - `npm install`
  - `npm start`
- Chrome:
  - `localhost:8080`
- Enjoy!

## Level Editor

`editor.html` (`localhost:8080/editor.html`) edits the levels in `public/assets/maps/`. It draws
them with the game's own code, so they look as they will in the game, and plays them in the game.

- Open an original level, a new one, or a level file; save it as `levelN.json`
- Tools: select (V), paint tiles from the palette (B, right click picks a tile), rooms (R: add,
  move and delete rooms), guards (G). Characters are dragged to move them
- Select a button to link it to the gates and exit doors it opens or closes
- ▶ Play (P) plays the level in the game, ▶ From selected tile (Shift+P) starts it there;
  Esc returns to the editor
- The level number picks the guards' strength and the game's script for that level (the
  mirror, the shadow, the skeleton, Jaffar...)
- The work in progress is kept in the browser; the Problems list flags what would misbehave

To add an edited level to the game, save it over `public/assets/maps/levelN.json`.

## Build

- `npm run build` creates a static build in `dist/` (game files live in `public/`)
- `npm run preview` serves that build
- `npm run build:site` builds the website in `dist-site/`: a menu, the original version from
  the `phaser2` branch and the Phaser 4 build. `.github/workflows/publish-site.yml` publishes it
  to the `gh-pages` branch, which GitHub Pages serves

The `phaser2` branch keeps the original Phaser 2 version, with only the bug fixes made before
the port.

## Tests

Browser tests (Playwright + Chromium) boot the game, load every level, go through the
level transitions, cutscenes and credits, and fail on any uncaught error or missing asset.
`tests/editor.spec.js` covers the level editor.

- `npx playwright install chromium` (once)
- `npm test`

The game is compared against its original Phaser 2 version, from before the port to Phaser 4:

- `tests/reference.spec.js` compares a screenshot of every level at a deterministic point.
- `tests/replay.spec.js` replays fixed key sequences in every level, plus scenarios for specific
  mechanics (fights, potions, traps, exit door, mirror, shadow, mouse...). The game state after
  every step must match the recorded trace, and the screen must match at checkpoints.

The baselines come from the Phaser 2 build (`npm run test:baseline`), and the screenshots are
platform specific. `PHASER=2` runs the tests against a Phaser 2 build, see
`scripts/phaser2-baseline.sh`.
