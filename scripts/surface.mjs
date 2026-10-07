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
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(process.env.VOID_URL || "http://localhost:5174");
const fixture = await page.evaluate(async () => {
  const { generateSystem, generatePlanets } =
      await import("/src/game/universe.ts"),
    { landingSite, radial, groundPoint, surfaceRotation } =
      await import("/src/game/surface/ground.ts"),
    { nearbySurfaceEntities, planetProfile } =
      await import("/src/game/surface/ecology.ts"),
    { initialExpansion } = await import("/src/game/surface/types.ts"),
    { flight } = await import("/src/game/runtime.ts");
  const p = generatePlanets(generateSystem("483920183", [0, 0, 0]))[0],
    ship = landingSite(p, flight.position),
    normal = radial(p, ship),
    profile = planetProfile(p),
    entities = nearbySurfaceEntities(p, ship, profile).entities;
  const target = entities
    .filter((e) => e.kind === "mineral" && e.resource === "veyrite")
    .sort(
      (a, b) =>
        flight.position.clone().fromArray(a.position).distanceTo(ship) -
        flight.position.clone().fromArray(b.position).distanceTo(ship),
    )[0];
  const at = flight.position
    .clone()
    .fromArray(target.position)
    .addScaledVector(flight.position.clone().set(1, 0, 0), 2);
  const pos = groundPoint(p, radial(p, at), 0.18);
  const dir = flight.position
    .clone()
    .fromArray(target.position)
    .addScaledVector(
      flight.position.clone().fromArray(target.normal),
      target.size * 0.2,
    )
    .sub(pos)
    .normalize();
  const rot = surfaceRotation(radial(p, pos), dir).multiply(
    flight.rotation
      .clone()
      .setFromAxisAngle(
        flight.position.clone().set(1, 0, 0),
        Math.asin(dir.dot(radial(p, pos))),
      ),
  );
  const expansion = {
    ...initialExpansion(),
    mode: "foot",
    planetId: p.id,
    shipPosition: ship.toArray(),
    shipRotation: surfaceRotation(normal).toArray(),
  };
  return {
    target,
    save: {
      version: 2,
      seed: "483920183",
      position: pos.toArray(),
      rotation: rot.toArray(),
      energy: 100,
      mode: 1,
      discoveries: [],
      systems: [],
      settings: {
        quality: 1,
        sensitivity: 1,
        invertY: false,
        volume: 0,
        fov: 65,
      },
      expansion,
    },
  };
});
await page.evaluate(
  (s) => localStorage.setItem("void.expedition.v1", JSON.stringify(s)),
  fixture.save,
);
await page.reload();
await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).click();
await page.waitForTimeout(1500);
await page.keyboard.press("f");
await page.waitForFunction(
  () =>
    JSON.parse(localStorage.getItem("void.expedition.v1")).expansion.catalog
      .length > 0,
  {},
  { timeout: 60000 },
);
await page
  .getByRole("button", { name: /HOLD · EXTRACT/ })
  .dispatchEvent("pointerdown");
await page.waitForFunction(
  () =>
    JSON.parse(localStorage.getItem("void.expedition.v1")).expansion.inventory
      .veyrite > 0,
  {},
  { timeout: 60000 },
);
await page.screenshot({ path: "test-results/v2-ecology.png" });
await page.keyboard.press("Tab");
assert(
  await page.getByRole("heading", { name: "Field inventory." }).isVisible(),
);
assert(
  await page.getByRole("heading", { name: "Veyrite", exact: true }).isVisible(),
);
await page.screenshot({ path: "test-results/v2-inventory.png" });
const saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("void.expedition.v1")),
);
assert(saved.expansion.changes[fixture.target.id]);
await page.reload();
await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).click();
await page.evaluate(async () => {
  window.__surface = (await import("/src/game/surface/state.ts")).surface;
});
await page.waitForFunction(
  () => window.__surface.floraCount > 0,
  {},
  { timeout: 60000 },
);
const state = await page.evaluate(async () => {
  const { surfaceWorld } = await import("/src/game/surface/ecology.ts"),
    { surface } = await import("/src/game/surface/state.ts");
  return {
    ids: surfaceWorld.entities.map((e) => e.id),
    plants: surface.floraCount,
    creatures: surface.creatureCount,
    chunks: surface.chunkCount,
    inventory: surface.data.inventory,
    planet: surface.planet?.id,
    profile: surfaceWorld.profile?.biodiversity,
    mode: surface.data.mode,
  };
});
assert(
  !state.ids.includes(fixture.target.id),
  "mined rock remains removed after reload",
);
assert(state.plants > 0, JSON.stringify(state));
assert(state.chunks <= 9);
// A resource fixture keeps crafting/build validation independent of mining time.
await page.evaluate(async () => {
  const { surface, touchSurface } = await import("/src/game/surface/state.ts");
  surface.data.inventory = { veyrite: 99, silica: 30, prism: 20 };
  touchSurface();
});
await page.keyboard.press("Tab");
await page.getByRole("button", { name: "CRAFTING", exact: true }).click();
await page
  .locator(".recipe-list article")
  .filter({ hasText: "Temper alloy" })
  .getByRole("button", { name: "CRAFT", exact: true })
  .click();
await page
  .locator(".recipe-list article")
  .filter({ hasText: "Temper alloy" })
  .getByRole("button", { name: "CRAFT", exact: true })
  .click();
await page
  .locator(".recipe-list article")
  .filter({ hasText: "Assemble energy cell" })
  .getByRole("button", { name: "CRAFT", exact: true })
  .click();
const crafted = await page.evaluate(
  () =>
    JSON.parse(localStorage.getItem("void.expedition.v1")).expansion.inventory,
);
assert.equal(crafted.veyrite, 83);
assert.equal(crafted.alloy, 2);
assert.equal(crafted.cell, 1);
await page.getByRole("button", { name: /RETURN TO EXPEDITION/ }).click();
const placement = await page.evaluate(async () => {
  const { surface } = await import("/src/game/surface/state.ts");
  const { flight } = await import("/src/game/runtime.ts");
  const { groundPoint, radial, surfaceRotation, tangentFrame } =
    await import("/src/game/surface/ground.ts");
  const { updateBuildPreview, buildState } =
    await import("/src/game/surface/building.ts");
  const p = surface.planet,
    n = radial(p, flight.position),
    { east, north } = tangentFrame(n),
    original = flight.position.clone();
  surface.building = true;
  surface.piece = "foundation";
  for (let i = 0; i < 100; i++) {
    const candidate = original
      .clone()
      .addScaledVector(east, (i % 10) * 3)
      .addScaledVector(north, Math.floor(i / 10) * 3);
    const nn = radial(p, candidate);
    flight.position.copy(groundPoint(p, nn, 0.18));
    flight.rotation.copy(surfaceRotation(nn));
    updateBuildPreview();
    if (buildState.valid) return true;
  }
  return buildState.reason;
});
assert.equal(placement, true);
await page.getByRole("button", { name: "E · PLACE", exact: true }).click();
assert.equal(
  await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("void.expedition.v1")).expansion.bases
        .length,
  ),
  1,
);
await page.screenshot({ path: "test-results/v2-building.png" });
await page.getByRole("button", { name: "B · CLOSE", exact: true }).click();
// Exercise repair, comparison UI and active ship stats with a deterministic derelict fixture.
const shipId = await page.evaluate(async () => {
  const { surface } = await import("/src/game/surface/state.ts");
  const { flight } = await import("/src/game/runtime.ts");
  const { surfaceWorld, generateShip } =
    await import("/src/game/surface/ecology.ts");
  const { radial } = await import("/src/game/surface/ground.ts");
  const { useGame } = await import("/src/stores/game.ts");
  const ship = generateShip(87133, surface.planet.id);
  surfaceWorld.target = {
    id: ship.id,
    kind: "ship",
    seed: ship.seed,
    position: flight.position.toArray(),
    normal: radial(surface.planet, flight.position).toArray(),
    size: 2.4,
    name: ship.name,
    rarity: ship.rarity,
    chunk: "fixture",
    ship,
  };
  useGame.getState().setScreen("fleet");
  return ship.id;
});
await page.getByRole("button", { name: /REPAIR & CLAIM/ }).click();
await page
  .locator(".fleet-list article")
  .last()
  .getByRole("button", { name: "SELECT", exact: true })
  .click();
const fleet = await page.evaluate(
  () => JSON.parse(localStorage.getItem("void.expedition.v1")).expansion,
);
assert.equal(fleet.activeShip, shipId);
assert.equal(fleet.inventory.alloy, 0);
assert.equal(fleet.inventory.cell, 0);
assert.equal(fleet.inventory.veyrite, 63);
await page.reload();
await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).click();
const restored = await page.evaluate(
  async () => (await import("/src/game/surface/state.ts")).surface.data,
);
assert.equal(restored.activeShip, shipId);
assert.equal(restored.bases.length, 1);
assert.deepEqual(errors, []);
console.log(
  JSON.stringify({
    mining: state.inventory,
    flora: state.plants,
    fauna: state.creatures,
    chunks: state.chunks,
    errors,
  }),
);
await browser.close();

