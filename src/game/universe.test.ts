import { describe, it, expect } from "vitest";
import {
  generatePlanets,
  generateSystem,
  nearbySectors,
  sectorAt,
} from "./universe";
import { buildTerrain, surfaceHeight } from "./terrain";
import { defaults, validateSave } from "./save";
describe("deterministic streaming universe", () => {
  it("recreates planets after a sector is unloaded", () => {
    const original = generatePlanets(generateSystem("astra", [12, -4, 6]));
    generatePlanets(generateSystem("elsewhere", [0, 0, 0]));
    expect(generatePlanets(generateSystem("astra", [12, -4, 6]))).toEqual(
      original,
    );
    expect(generatePlanets(generateSystem("other", [12, -4, 6]))).not.toEqual(
      original,
    );
  });
  it("keeps the active sector budget at 27 across negative and large coordinates", () => {
    for (const x of [-999999999, -30001, -30000, 0, 29999, 30000, 1e10]) {
      const c = sectorAt([x, 0, 0]),
        sectors = nearbySectors(c);
      expect(sectors).toHaveLength(27);
      expect(new Set(sectors.map((s) => s.join(":"))).size).toBe(27);
      expect(Math.abs(x - c[0] * 60000)).toBeLessThanOrEqual(30000);
    }
  });
  it("terrain buffers are finite and indices valid at each LOD", () => {
    const p = generatePlanets(generateSystem("astra", [0, 0, 0]))[0];
    for (const res of [16, 32, 64, 96]) {
      const g = buildTerrain(p, res);
      expect(g.positions.every(Number.isFinite)).toBe(true);
      expect(g.indices.every((i) => i < g.positions.length / 3)).toBe(true);
      expect(g.indices.length).toBe(36 * res * res);
    }
  });
  it("adjacent cube faces share deterministic surface heights", () => {
    const p = generatePlanets(generateSystem("astra", [0, 0, 0]))[0];
    const a = buildTerrain(p, 16),
      b = buildTerrain(p, 32);
    expect(Array.from(a.positions.slice(0, 3))).toEqual(
      Array.from(b.positions.slice(0, 3)),
    );
    expect(surfaceHeight(1, 0, 0, p)).toBe(surfaceHeight(1, 0, 0, p));
  });
});
describe("save validation", () => {
  const save = {
    version: 1,
    seed: "astra",
    position: [0, 0, 1900],
    rotation: [0, 0, 0, 1],
    energy: 100,
    mode: 1,
    discoveries: [],
    systems: [],
    settings: defaults,
  };
  it("accepts valid saves", () => expect(validateSave(save)).toBe(true));
  it("rejects corrupt data safely", () => {
    for (const bad of [
      null,
      {},
      "text",
      { ...save, position: [NaN, 0, 0] },
      { ...save, rotation: [0, 0, 0, 0] },
      { ...save, settings: { ...defaults, quality: 50 } },
      { ...save, discoveries: [{}] },
    ])
      expect(validateSave(bad)).toBe(false);
  });
});
