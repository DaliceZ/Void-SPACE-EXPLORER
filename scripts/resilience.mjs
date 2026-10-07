import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 640 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://localhost:5174");
const fixture = await page.evaluate(async () => {
  const { generateSystem, generatePlanets } =
    await import("/src/game/universe.ts");
  const p = generatePlanets(generateSystem("483920183", [0, 0, 0]))[0];
  return {
    planet: p,
    save: {
      version: 1,
      seed: "483920183",
      position: [p.position[0], p.position[1], p.position[2] + p.radius * 1.08],
      rotation: [0, 0, 0, 1],
      energy: 100,
      mode: 2,
      discoveries: [],
      systems: [],
      settings: {
        quality: 1,
        sensitivity: 1,
        invertY: false,
        volume: 0,
        fov: 65,
      },
    },
  };
});
await page.evaluate(
  (save) => localStorage.setItem("void.expedition.v1", JSON.stringify(save)),
  fixture.save,
);
await page.reload();
await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).click();
await page.keyboard.down("w");
await page.waitForTimeout(6000);
await page.keyboard.up("w");
await page.screenshot({ path: "test-results/atmosphere.png" });
assert(
  (await page.locator(".flight-top").textContent()).includes("ATMOSPHERIC"),
);
await page.keyboard.press("Escape");
const near = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("void.expedition.v1")),
);
assert(
  Math.hypot(...near.position.map((v, i) => v - fixture.planet.position[i])) >=
    fixture.planet.radius,
  "surface cannot be penetrated",
);
await page.reload();
await page.evaluate((save) => {
  save.position = [30015, 0, 0];
  localStorage.setItem("void.expedition.v1", JSON.stringify(save));
}, fixture.save);
await page.reload();
await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).click();
await page.keyboard.down("d");
await page.waitForTimeout(2500);
await page.keyboard.up("d");
await page.keyboard.press("F3");
await page.waitForTimeout(1500);
const debug = await page.locator(".debug").textContent();
assert(debug.includes("SECTORS 27"));
const loadedIds = await page.evaluate(async () => {
  const { world } = await import("/src/game/Universe.tsx");
  return world.planets.map((p) => p.id);
});
assert(
  !loadedIds.some((id) => id.startsWith("0:0:0/")),
  "home planets unload outside system range",
);
await page.keyboard.press("Escape");
await page.reload();
await page.evaluate(() =>
  localStorage.setItem("void.expedition.v1", "{corrupt"),
);
await page.reload();
assert(await page.getByRole("button", { name: "NEW UNIVERSE" }).isVisible());
assert(
  (await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).count()) ===
    0,
);
const fallback = await browser.newPage({
  viewport: { width: 960, height: 640 },
});
fallback.on("pageerror", (e) => errors.push(e.message));
await fallback.addInitScript(() => {
  window.Worker = class {
    constructor() {
      throw Error("worker disabled for fallback test");
    }
  };
});
await fallback.goto("http://localhost:5174");
await fallback.getByRole("button", { name: "NEW UNIVERSE" }).click();
await fallback.getByRole("button", { name: "BEGIN EXPEDITION" }).click();
await fallback.waitForTimeout(2000);
await fallback.keyboard.press("f");
await fallback.waitForFunction(
  () =>
    JSON.parse(localStorage.getItem("void.expedition.v1") || "{}").discoveries
      ?.length === 1,
  {},
  { timeout: 60000 },
);
console.log(
  JSON.stringify({
    nearSurfacePosition: near.position,
    streaming: debug,
    invalidSaveRecovery: true,
    workerFallback: true,
    errors,
  }),
);
await browser.close();
assert.deepEqual(errors, []);
