import { Vector3 } from "three";
import { useGame } from "../../stores/game";
import { flight } from "../runtime";
import { surface, touchSurface } from "./state";
import { surfaceWorld } from "./ecology";
import { addItem, ITEMS, RECIPES, spend, slots } from "./items";
import type { CatalogEntry, ItemId } from "./types";
import { chime } from "../audio";
import { feedback, impact, resourceMaterial } from "../feedback";
export function catalog(entry: CatalogEntry) {
  if (surface.data.catalog.some((d) => d.id === entry.id)) return false;
  surface.data.catalog.unshift(entry);
  touchSurface();
  chime(useGame.getState().settings.volume);
  useGame
    .getState()
    .notify(`${entry.category.toUpperCase()} DISCOVERED · ${entry.name}`);
  useGame.getState().save();
  return true;
}
export function startSurfaceScan() {
  if (!surfaceWorld.target)
    return useGame
      .getState()
      .notify("Point at a nearby lifeform, mineral, or signal.");
  surface.scan = 0.001;
  surface.scanId = surfaceWorld.target.id;
  impact(
    "scan",
    flight.position,
    new Vector3(...surfaceWorld.target.normal),
    "crystal",
    0.7,
  );
}
export function updateTools(dt: number) {
  const target = surfaceWorld.target,
    d = surface.data,
    p = surface.planet;
  if (!p) return;
  const range = d.upgrades.includes("survey") ? 16 : 10;
  if (surface.scan > 0) {
    if (!target || target.id !== surface.scanId) {
      surface.scan = 0;
      useGame.getState().notify("Scan interrupted · hold target in view");
    } else {
      surface.scan += dt / 3;
      if (surface.scan >= 1) {
        const s = target.species;
        catalog({
          id: s?.id || target.id,
          name: target.name,
          category:
            target.kind === "mineral"
              ? "Minerals"
              : target.kind === "flora"
                ? "Flora"
                : target.kind === "fauna"
                  ? "Fauna"
                  : target.kind === "ship"
                    ? "Spacecraft"
                    : "Structures",
          planetId: p.id,
          planetName: p.name,
          system: p.id.split("/")[0],
          rarity: target.rarity,
          position: target.position,
          time: Date.now(),
          description: s
            ? `${s.archetype} of the ${s.family} evolutionary family.`
            : target.kind === "structure"
              ? "An ancient archive emits a repeating signal. Approach and press E to recover its memory."
              : target.kind === "ship"
                ? "A grounded spacecraft. Inspect its systems and repair before claiming."
                : `${ITEMS[target.resource || "veyrite"].name} deposit. Extract with the mining beam.`,
          details: s
            ? {
                Classification: s.archetype,
                Temperament: s.temperament,
                Diet: s.diet,
                Activity: s.activity,
                Family: s.family,
                Adaptation: s.adaptation,
                Height: `${(s.size * 10).toFixed(1)} m`,
                Biome: surfaceWorld.profile?.biome || "Unknown",
              }
            : {
                Composition: target.resource
                  ? ITEMS[target.resource].name
                  : "Unknown",
                Seed: target.seed.toString(16).toUpperCase(),
              },
        });
        surface.scan = 0;
      }
    }
  }
  if (
    surface.mouseDown &&
    !surface.building &&
    target?.resource &&
    new Vector3(...target.position).distanceTo(flight.position) < range
  ) {
    if (surface.miningId !== target.id) {
      surface.miningId = target.id;
      surface.mining = 0;
      feedback.damageStage = 0;
    }
    surface.mining += dt / (d.upgrades.includes("survey") ? 1.4 : 2.6);
    feedback.miningClock += dt;
    const stage = Math.floor(surface.mining * 3);
    if (feedback.miningClock > 0.13 || stage > feedback.damageStage) {
      const normal = new Vector3(...target.normal),
        at = new Vector3(...target.position).addScaledVector(
          normal,
          target.size * 0.4,
        );
      impact(
        "mining",
        at,
        normal,
        resourceMaterial(target.resource),
        stage > feedback.damageStage ? 1.4 : 0.45,
      );
      feedback.miningClock = 0;
      feedback.damageStage = stage;
    }
    if (surface.mining >= 1) {
      const count = target.kind === "flora" ? 6 : 12;
      if (addItem(d.inventory, target.resource, count)) {
        d.changes[target.id] = 1;
        impact(
          "fracture",
          new Vector3(...target.position),
          new Vector3(...target.normal),
          resourceMaterial(target.resource),
          1,
        );
        impact(
          "collect",
          new Vector3(...target.position),
          new Vector3(...target.normal),
          resourceMaterial(target.resource),
          0.8,
        );
        useGame
          .getState()
          .notify(`+${count} ${ITEMS[target.resource].name.toUpperCase()}`);
        touchSurface();
        useGame.getState().save();
      } else
        useGame
          .getState()
          .notify("SUIT STORAGE FULL · transfer cargo at your ship");
      surface.mining = 0;
      surface.mouseDown = false;
    }
  } else surface.mining = Math.max(0, surface.mining - dt * 0.5);
}
export function craft(id: string) {
  const recipe = RECIPES.find((r) => r.id === id),
    d = surface.data;
  if (!recipe) return;
  if (recipe.requires && !d.catalog.length)
    return useGame
      .getState()
      .notify("Complete a surface scan to unlock this blueprint.");
  const next = { ...d.inventory };
  if (!spend(next, recipe.cost) || !addItem(next, recipe.result, recipe.count))
    return useGame
      .getState()
      .notify("Missing materials or inventory capacity.");
  d.inventory = next;
  touchSurface();
  useGame.getState().save();
}
export function consume(id: ItemId) {
  const d = surface.data;
  if (!d.inventory[id]) return;
  if (id === "cell") {
    d.inventory.cell!--;
    d.suit = Math.min(100, d.suit + 60);
  } else if (id === "module" && !d.upgrades.includes("survey")) {
    d.inventory.module!--;
    d.upgrades.push("survey");
  } else return;
  touchSurface();
  useGame.getState().save();
}
export function transfer(id: ItemId, toShip: boolean) {
  const d = surface.data;
  if (
    new Vector3(...d.shipPosition).distanceTo(flight.position) > 8 &&
    d.mode !== "landed"
  )
    return useGame
      .getState()
      .notify("Ship cargo link requires proximity within 80 m.");
  const from = toShip ? d.inventory : d.shipCargo,
    to = toShip ? d.shipCargo : d.inventory;
  const count = from[id] || 0;
  const ship = d.ships.find((s) => s.id === d.activeShip);
  if (!count || !addItem(to, id, count, toShip ? ship?.cargo || 48 : 16))
    return useGame.getState().notify("Destination storage is full.");
  delete from[id];
  touchSurface();
  useGame.getState().save();
}
export function collectArtifact() {
  const t = surfaceWorld.target,
    p = surface.planet,
    d = surface.data;
  if (
    !t ||
    !p ||
    t.kind !== "structure" ||
    new Vector3(...t.position).distanceTo(flight.position) > 5
  )
    return false;
  if (d.changes[t.id]) {
    useGame.getState().notify("Archive memory already recovered");
    return true;
  }
  if (!addItem(d.inventory, "relic", 1)) return true;
  d.changes[t.id] = 1;
  catalog({
    id: t.id + ":relic",
    name: `Echo of ${t.seed.toString(16).slice(0, 4).toUpperCase()}`,
    category: "Artifacts",
    planetId: p.id,
    planetName: p.name,
    system: p.id.split("/")[0],
    rarity: "Exotic",
    position: t.position,
    time: Date.now(),
    description:
      "A memory lattice repeating the coordinates of a sky that no longer exists.",
    details: {
      Age: `${18000 + (t.seed % 72000)} years`,
      Civilization: `The ${["Veiled", "Silent", "Distant"][t.seed % 3]} Assembly`,
      Composition: "Crystalline memory substrate",
    },
  });
  return true;
}
export { slots };
