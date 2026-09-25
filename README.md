# Prince of Persia (JS)

Prince of Persia reimplementation written in HTML5/Javascript, built on [Phaser 4](https://phaser.io)

## Play Online

- Chrome: https://oklemenz.github.io/PrinceJS/

## Play Locally

- Install [Node.js](https://nodejs.org) 20.19+ or 22.12+
- Terminal:
  - `npm install`
  - `npm start`
- Chrome:
  - `localhost:8080`
- Enjoy!

## Build

- `npm run build` creates a static build in `dist/` (game files live in `public/`)
- `npm run preview` serves that build

## Tests

Browser tests (Playwright + Chromium) boot the game, load every level, go through the
level transitions, cutscenes and credits, and fail on any uncaught error or missing asset.

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
