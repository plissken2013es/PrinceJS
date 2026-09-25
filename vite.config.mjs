import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths so the build also works from a subfolder (e.g. GitHub Pages)
  base: "./",
  server: { port: 8080 },
  build: {
    // "assets" is taken by the game's own files in public/assets
    assetsDir: "bundle",
    // Phaser alone is about 1.3 MB minified
    chunkSizeWarningLimit: 1600
  }
});
