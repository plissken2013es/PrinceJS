#!/usr/bin/env node
/**
 * Builds the website published on GitHub Pages into dist-site/:
 *
 *   index.html   a menu to choose the version to play (from site/)
 *   phaser2/     the original Phaser 2 version, from the phaser2 branch as it is
 *   phaser4/     the Phaser 4 version (the Vite build), with the level editor
 *                (phaser4/editor.html)
 *
 * Both games and the editor get a link back to the menu.
 *
 * Usage: npm run build:site [-- <git ref of the Phaser 2 version>]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { build } from "vite";

const OUT = "dist-site";

// The Phaser 2 version is a static site: it needs no build, only these files
const PHASER2_REF = process.argv[2] || findRef(["origin/phaser2", "phaser2"]);
const PHASER2_FILES = ["index.html", "lib/phaser.min.js", "src", "assets"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

await build({ logLevel: "warn", build: { outDir: path.join(OUT, "phaser4"), emptyOutDir: true } });

const phaser2 = path.join(OUT, "phaser2");
fs.mkdirSync(phaser2);
const archive = execFileSync("git", ["archive", "--format=tar", PHASER2_REF, ...PHASER2_FILES], {
  maxBuffer: 256 * 1024 * 1024
});
execFileSync("tar", ["-x", "-C", phaser2], { input: archive });

fs.copyFileSync("site/index.html", path.join(OUT, "index.html"));
// serve the files as they are (no Jekyll processing)
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

addMenuLink(path.join(phaser2, "index.html"));
addMenuLink(path.join(OUT, "phaser4", "index.html"));
addEditorMenuLink(path.join(OUT, "phaser4", "editor.html"));

console.log(`Site built in ${OUT}/ (Phaser 2 version from ${PHASER2_REF})`);

function findRef(candidates) {
  for (const ref of candidates) {
    try {
      execFileSync("git", ["rev-parse", "--verify", "--quiet", ref], { stdio: "ignore" });
      return ref;
    } catch {
      // try the next one
    }
  }
  throw new Error(`None of ${candidates.join(", ")} exists: fetch the phaser2 branch first`);
}

// Adds a link back to the menu under the game
function addMenuLink(file) {
  const html = fs.readFileSync(file, "utf8");
  const link =
    '<a href="../" style="display: inline-block; margin: 8px; color: #aaa; font: 14px sans-serif">&larr; Menu</a>';
  const updated = html.replace("</body>", `  ${link}\n  </body>`);
  if (updated === html) {
    throw new Error(`No </body> in ${file}`);
  }
  fs.writeFileSync(file, updated);
}

// The editor fills the window: its link goes in the header, next to the game's
function addEditorMenuLink(file) {
  const html = fs.readFileSync(file, "utf8");
  const updated = html.replace("<!-- menu -->", '<a href="../" title="Back to the menu">Menu</a>');
  if (updated === html) {
    throw new Error(`No menu placeholder in ${file}`);
  }
  fs.writeFileSync(file, updated);
}
