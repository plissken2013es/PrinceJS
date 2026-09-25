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

`tests/reference.spec.js` compares every level against reference screenshots taken at a
deterministic point. The committed screenshots were taken with the original Phaser 2 version of
the game, so they check that the port to Phaser 4 looks the same. They are platform specific;
regenerate them with `npm run test:reference`.
