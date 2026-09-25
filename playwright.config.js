"use strict";

const { defineConfig, devices } = require("@playwright/test");

const PORT = 8181;

module.exports = defineConfig({
  testDir: "tests",
  timeout: 120000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    viewport: { width: 660, height: 420 },
    launchOptions: {
      args: ["--autoplay-policy=no-user-gesture-required"]
    }
  },
  expect: {
    // Taking screenshots with a software renderer can be slow on a loaded machine
    timeout: 15000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.001 }
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 660, height: 420 } } }],
  webServer: {
    // Tests run against the production build
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI
  }
});
