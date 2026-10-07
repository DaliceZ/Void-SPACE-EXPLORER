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
await page.goto(process.env.VOID_URL || "http://localhost:5175");
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
if (!process.env.DETAIL_QUICK) {
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
}
await page.evaluate(async () => { window.__surface = (await import('/src/game/surface/state.ts')).surface; });
await page.waitForFunction(() => window.__surface.creatureCount > 0, {}, {timeout:60000});
await page.screenshot({ path: "test-results/v2-ecology.png" });
const fauna = await page.evaluate(async () => {
  const { surfaceWorld } = await import("/src/game/surface/ecology.ts");
  const { surface } = await import("/src/game/surface/state.ts");
  const { flight } = await import("/src/game/runtime.ts");
  const { radial, groundPoint, tangentFrame, surfaceRotation } =
    await import("/src/game/surface/ground.ts");
  const target = surfaceWorld.entities.find(
    (e) =>
      e.kind === "fauna" &&
      e.species.archetype === "Grazer" &&
      surfaceWorld.creatures.has(e.id),
  );
  if (!target) return false;
  const at = surfaceWorld.creatures.get(target.id).position.clone(),
    n = radial(surface.planet, at),
    { east, north } = tangentFrame(n);
  const from = at
    .clone()
    .addScaledVector(east, 1.5)
    .addScaledVector(north, -1.5);
  flight.position.copy(
    groundPoint(surface.planet, radial(surface.planet, from), 0.35),
  );
  const dir = at
    .clone()
    .addScaledVector(n, target.size * 0.4)
    .sub(flight.position)
    .normalize();
  const up = radial(surface.planet, flight.position);
  flight.rotation
    .copy(surfaceRotation(up, dir))
    .multiply(
      flight.rotation
        .clone()
        .setFromAxisAngle(n.clone().set(1, 0, 0), Math.asin(dir.dot(up))),
    );
  return target.name;
});
await page.waitForTimeout(1800);
await page.screenshot({ path: "test-results/detail-fauna.png" });
console.log(
  JSON.stringify({
    fauna,
    errors,
    metrics: await page.evaluate(async () => {
      const { telemetry } = await import("/src/game/telemetry.ts");
      return {
        draws: telemetry.drawCalls,
        triangles: telemetry.triangles,
        geometries: telemetry.geometries,
      };
    }),
  }),
);
await browser.close();
assert.deepEqual(errors, []);

