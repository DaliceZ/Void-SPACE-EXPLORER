import { describe, it, expect, vi } from "vitest";
import { Vector3 } from "three";
import { generateSystem, generatePlanets } from "../universe";
import { planetProfile, nearbySurfaceEntities } from "./ecology";
import {
  landingSite,
  radial,
  safeGround,
  surfaceRotation,
  groundPoint,
} from "./ground";
import { addItem, slots, spend } from "./items";
import { initialExpansion } from "./types";
import { validateSave, defaults, loadSave, writeSave, SAVE_KEY } from "../save";
import { surface } from "./state";
import { baseFloorRadius, blockedByBase, poweredShelter } from "./building";
import type { BasePiece } from "./types";
const planet = generatePlanets(generateSystem("483920183", [0, 0, 0]))[0];
describe("planetary traversal", () => {
  it("finds dry level terrain without changing the V1 planet", () => {
    const site = landingSite(planet, new Vector3(0, 0, 1900));
    expect(site).not.toBeNull();
    expect(safeGround(planet, radial(planet, site!))).toBe(true);
    expect(
      landingSite({ ...planet, type: "Gas giant" }, new Vector3(0, 0, 1900)),
    ).toBeNull();
  });
});
describe("deterministic ecosystems", () => {
  it("correlates life with conditions", () => {
    expect(
      planetProfile({ ...planet, type: "Barren", atmosphere: "Trace argon" })
        .fauna,
    ).toHaveLength(0);
    expect(
      planetProfile({ ...planet, type: "Volcanic", temperature: 350 }).flora,
    ).toHaveLength(0);
    expect(
      planetProfile({ ...planet, type: "Lush", temperature: 22, hazard: 0 })
        .biodiversity,
    ).toBeGreaterThan(80);
  });
  it("regenerates the same species and placements after unloading", () => {
    const profile = planetProfile(planet),
      at = landingSite(planet, new Vector3(0, 0, 1900))!;
    const a = nearbySurfaceEntities(planet, at, profile);
    expect(nearbySurfaceEntities(planet, at, planetProfile(planet))).toEqual(a);
    expect(a.chunks).toBeLessThanOrEqual(9);
    for (const e of a.entities) {
      expect(e.position.every(Number.isFinite)).toBe(true);
      expect(e.species?.family || profile.family).toBe(profile.family);
    }
  });
});
describe("inventory transactions", () => {
  it("prevents overflow without losing resources", () => {
    const inv = { veyrite: 99 };
    expect(addItem(inv, "silica", 1, 1)).toBe(false);
    expect(inv).toEqual({ veyrite: 99 });
    expect(slots(inv)).toBe(1);
  });
  it("checks all recipe ingredients before spending", () => {
    const inv = { veyrite: 10 };
    expect(spend(inv, { veyrite: 8, silica: 3 })).toBe(false);
    expect(inv.veyrite).toBe(10);
  });
});
describe("V1 compatibility", () => {
  const old = {
    version: 1,
    seed: "original",
    position: [1, 2, 3],
    rotation: [0, 0, 0, 1],
    energy: 90,
    mode: 1,
    discoveries: [],
    systems: [],
    settings: defaults,
  };
  it("accepts both original saves and the versioned expansion", () => {
    expect(validateSave(old)).toBe(true);
    expect(
      validateSave({ ...old, version: 2, expansion: initialExpansion() }),
    ).toBe(true);
  });
  it("rejects invalid expansion values", () => {
    expect(
      validateSave({
        ...old,
        version: 2,
        expansion: { ...initialExpansion(), inventory: { veyrite: -1 } },
      }),
    ).toBe(false);
  });
  it("migrates a V1 save while retaining its exact backup", () => {
    const store = new Map([[SAVE_KEY, JSON.stringify(old)]]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const migrated = loadSave()!;
    expect(migrated.version).toBe(2);
    expect(migrated.position).toEqual(old.position);
    expect(writeSave(migrated)).toBe(true);
    expect(store.get(SAVE_KEY + ".backup")).toBe(JSON.stringify(old));
    vi.unstubAllGlobals();
  });
});

describe("base collision and shelter", () => {
  it("requires a powered enclosure, supports a floor, and allows a doorway", () => {
    surface.data = initialExpansion();
    surface.planet = planet;
    const ship = landingSite(planet, new Vector3(0, 0, 1900))!;
    const n = radial(planet, ship),
      rot = surfaceRotation(n),
      center = groundPoint(planet, n, 0.06);
    const piece = (
      id: string,
      type: BasePiece["type"],
      x: number,
      y: number,
      z: number,
    ): BasePiece => ({
      id,
      type,
      planetId: planet.id,
      position: new Vector3(x, y, z).applyQuaternion(rot).add(center).toArray(),
      rotation: rot.toArray(),
    });
    surface.data.bases = [
      piece("f", "foundation", 0, 0, 0),
      piece("roof", "roof", 0, 1.2, 0),
      piece("power", "power", 3, 0, 0),
      piece("north", "wall", 0, 0.6, -1),
      piece("south", "wall", 0, 0.6, 1),
      piece("west", "wall", -1, 0.6, 0),
    ];
    const eye = center.clone().addScaledVector(n, 0.24);
    expect(poweredShelter(eye)).toBe(false);
    surface.data.bases.push(piece("east", "wall", 1, 0.6, 0));
    expect(poweredShelter(eye)).toBe(true);
    surface.data.changes["power:charge"] = 0;
    surface.daylight = 0;
    expect(poweredShelter(eye)).toBe(false);
    surface.daylight = 1;
    expect(poweredShelter(eye, 1)).toBe(true);
    expect(baseFloorRadius(eye, planet.radius)).toBeCloseTo(
      center.distanceTo(new Vector3(...planet.position)) + 0.06,
    );
    surface.data.bases = [piece("door", "door", 0, 0.6, 0)];
    expect(
      blockedByBase(
        center.clone().add(new Vector3(0, 0.4, 0).applyQuaternion(rot)),
      ),
    ).toBe(false);
    expect(
      blockedByBase(
        center.clone().add(new Vector3(0.7, 0.4, 0).applyQuaternion(rot)),
      ),
    ).toBe(true);
  });
});
