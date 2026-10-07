import { Vector3 } from "three";
import { hash, random, name, type Planet, type Vec3 } from "../universe";
import { groundPoint, radial, radiusAt } from "./ground";
import type { Rarity, ItemId, ShipData } from "./types";
export type Species = {
  id: string;
  name: string;
  kind: "flora" | "fauna";
  archetype: string;
  rarity: Rarity;
  color: string;
  size: number;
  limbs: number;
  temperament: string;
  diet: string;
  activity: string;
  family: string;
  adaptation: string;
};
export type Profile = {
  gravity: number;
  life: string;
  biodiversity: number;
  biome: string;
  flora: Species[];
  fauna: Species[];
  weather: string;
  cycle: number;
  family: string;
};
export type SurfaceEntity = {
  id: string;
  kind: "mineral" | "flora" | "fauna" | "structure" | "ship";
  position: Vec3;
  normal: Vec3;
  seed: number;
  size: number;
  name: string;
  rarity: Rarity;
  resource?: ItemId;
  species?: Species;
  ship?: ShipData;
  chunk: string;
};
export const surfaceWorld = {
  entities: [] as SurfaceEntity[],
  target: null as SurfaceEntity | null,
  profile: null as Profile | null,
  chunks: 0,
  creatures: new Map<
    string,
    { position: Vector3; phase: number; state: string }
  >(),
};
export function rarity(r: number): Rarity {
  return r < 0.72
    ? "Common"
    : r < 0.95
      ? "Uncommon"
      : r < 0.993
        ? "Rare"
        : r < 0.9995
          ? "Exotic"
          : "Anomalous";
}
export function planetProfile(p: Planet): Profile {
  const r = random(hash(`${p.seed}:ecology-v2`)),
    gravity = Math.max(0.45, Math.min(1.6, p.radius / 650));
  const wet =
    p.type === "Ocean"
      ? 1
      : p.type === "Lush"
        ? 0.9
        : p.type === "Ice"
          ? 0.2
          : 0.07;
  const air =
    p.atmosphere.includes("oxygen") || p.atmosphere.includes("Oxygen")
      ? 1
      : p.atmosphere.includes("nitrogen")
        ? 0.3
        : 0.05;
  const thermal = Math.exp(-(((p.temperature - 22) / 75) ** 2));
  let score = Math.max(
    0,
    Math.min(1, thermal * 0.42 + wet * 0.3 + air * 0.28 - p.hazard * 0.025),
  );
  if (
    ["Barren", "Gas giant", "Volcanic"].includes(p.type) ||
    p.temperature > 220
  )
    score = 0;
  if (p.type === "Ice") score *= 0.35;
  if (p.type === "Crystal") score *= 0.5;
  const biodiversity = Math.round(score * 100),
    life =
      score === 0
        ? "Sterile"
        : score < 0.12
          ? "Microbial"
          : score < 0.35
            ? "Sparse life"
            : score < 0.65
              ? "Moderate biosphere"
              : "Rich biosphere";
  const family = `${name(p.seed).split("-")[0]} ${r() > 0.5 ? "hexata" : "quadrata"}`,
    limbs = family.endsWith("hexata") ? 6 : 4;
  const biome =
    p.type === "Ice"
      ? "Glacial steppe"
      : p.type === "Desert"
        ? "Silicate dunes"
        : p.type === "Volcanic"
          ? "Basalt fields"
          : p.type === "Crystal"
            ? "Prismatic highlands"
            : p.type === "Barren"
              ? "Regolith plain"
              : "Coastal uplands";
  const species = (kind: "flora" | "fauna", count: number): Species[] =>
    Array.from({ length: count }, (_, i) => {
      const sr = random(hash(`${p.seed}:${kind}:${i}`)),
        rare = rarity(sr()),
        flying = kind === "fauna" && i === count - 1 && count > 2;
      return {
        id: `${p.id}:${kind}:${i}`,
        name: `${name(hash(`${p.seed}:${kind}:${i}`)).split("-")[0]} ${["velata", "striata", "noctis", "minor", "cauta", "lucens"][i % 6]}`,
        kind,
        archetype:
          kind === "flora"
            ? p.type === "Ice"
              ? "Frost spine"
              : p.type === "Desert"
                ? "Desert spine"
                : ["Crown fern", "Fungal tower", "Luminous bulb"][i % 3]
            : flying
              ? "Glider"
              : i % 3 === 0
                ? "Grazer"
                : i % 3 === 1
                  ? "Crawler"
                  : "Floater",
        rarity: rare,
        color:
          kind === "flora"
            ? p.type === "Ice"
              ? "#9cc2db"
              : ["#6b8d77", "#a68ab9", "#9baf79"][i % 3]
            : ["#a7b7a0", "#b5a18b", "#b9bbc7"][hash(family) % 3],
        size:
          (kind === "flora" ? 0.6 : 0.35) + sr() * (gravity < 0.8 ? 1.4 : 0.8),
        limbs,
        temperament:
          i % 4 === 0
            ? "Curious"
            : i % 4 === 1
              ? "Skittish"
              : i % 4 === 2
                ? "Docile"
                : "Territorial",
        diet:
          i % 3 === 0
            ? "Herbivore"
            : i % 3 === 1
              ? "Mineral feeder"
              : "Omnivore",
        activity: rare === "Rare" ? "Night" : "Day",
        family,
        adaptation:
          gravity > 1.2
            ? "Low body profile, load-bearing limbs"
            : p.temperature < 0
              ? "Insulating shell, compact extremities"
              : p.temperature > 45
                ? "Heat-dissipating fins"
                : "Wide sensory crown, efficient locomotion",
      };
    });
  return {
    gravity,
    life,
    biodiversity,
    biome,
    flora: species("flora", score < 0.12 ? 0 : 2 + Math.floor(score * 7)),
    fauna: species("fauna", score < 0.22 ? 0 : 2 + Math.floor(score * 5)),
    weather:
      p.type === "Ice"
        ? "Snow squall"
        : p.type === "Desert"
          ? "Dust storm"
          : p.type === "Volcanic"
            ? "Ash storm"
            : p.type === "Crystal"
              ? "Crystal storm"
              : p.type === "Ocean" || p.type === "Lush"
                ? "Rain"
                : "Dust drift",
    cycle: 480 + r() * 300,
    family,
  };
}
export const TILE = 16;
export function cubeAddress(n: Vector3, radius: number) {
  const values = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)],
    axis = values.indexOf(Math.max(...values));
  const f = axis * 2 + (n.getComponent(axis) < 0 ? 1 : 0),
    d = values[axis];
  let u = 0,
    v = 0;
  if (axis === 0) {
    u = n.z / d;
    v = n.y / d;
  } else if (axis === 1) {
    u = n.x / d;
    v = n.z / d;
  } else {
    u = n.x / d;
    v = n.y / d;
  }
  const count = Math.ceil((radius * 2) / TILE),
    width = (radius * 2) / count;
  return {
    face: f,
    x: Math.min(count - 1, Math.floor(((u + 1) * radius) / width)),
    y: Math.min(count - 1, Math.floor(((v + 1) * radius) / width)),
    width,
    count,
  };
}
function cubeNormal(face: number, u: number, v: number) {
  return new Vector3(
    ...((face === 0
      ? [1, v, u]
      : face === 1
        ? [-1, v, u]
        : face === 2
          ? [u, 1, v]
          : face === 3
            ? [u, -1, v]
            : face === 4
              ? [u, v, 1]
              : [u, v, -1]) as Vec3),
  ).normalize();
}
export function generateChunk(
  p: Planet,
  face: number,
  x: number,
  y: number,
  profile: Profile,
): SurfaceEntity[] {
  const count = Math.ceil((p.radius * 2) / TILE);
  if (x < 0 || y < 0 || x >= count || y >= count) return [];
  const width = (p.radius * 2) / count,
    chunk = `${p.id}:${face}:${x}:${y}`,
    r = random(hash(`${p.seed}:chunk:${chunk}`));
  const entities: SurfaceEntity[] = [];
  const total =
    7 + (profile.flora.length ? 12 : 0) + (profile.fauna.length ? 2 : 0);
  for (let i = 0; i < total; i++) {
    const u = ((x + r()) * width) / p.radius - 1,
      v = ((y + r()) * width) / p.radius - 1,
      n = cubeNormal(face, u, v);
    if (
      (p.type === "Ocean" || p.type === "Lush") &&
      radiusAt(p, n) < p.radius + 0.8
    )
      continue;
    const kind =
      i < 7 ? "mineral" : i < 19 && profile.flora.length ? "flora" : "fauna";
    const species =
      kind === "flora"
        ? profile.flora[Math.floor(r() * profile.flora.length)]
        : kind === "fauna"
          ? profile.fauna[Math.floor(r() * profile.fauna.length)]
          : undefined;
    if (kind !== "mineral" && !species) continue;
    const seed = hash(`${chunk}/${i}`);
    entities.push({
      id: `${chunk}/${i}`,
      kind,
      seed,
      position: groundPoint(p, n).toArray(),
      normal: n.toArray(),
      size: species?.size || 0.18 + r() * 0.35,
      name:
        species?.name ||
        ["Veyrite outcrop", "Silica nodule", "Prism cluster", "Rime deposit"][
          i % 4
        ],
      rarity: species?.rarity || (i % 4 === 2 ? "Uncommon" : "Common"),
      resource:
        kind === "flora"
          ? "mycel"
          : kind === "mineral"
            ? (
                [
                  "veyrite",
                  "silica",
                  "prism",
                  p.type === "Ice" ? "rime" : "veyrite",
                ] as ItemId[]
              )[i % 4]
            : undefined,
      species,
      chunk,
    });
  }
  if (r() < 0.025) {
    const n = cubeNormal(
      face,
      ((x + 0.5) * width) / p.radius - 1,
      ((y + 0.5) * width) / p.radius - 1,
    );
    if (
      radiusAt(p, n) > p.radius + 0.8 ||
      !["Ocean", "Lush"].includes(p.type)
    ) {
      const seed = hash(chunk + ":site"),
        isShip = hash(`${p.seed}:ship-eligibility`) % 100 < 24 && r() < 0.22;
      entities.push({
        id: chunk + ":site",
        kind: isShip ? "ship" : "structure",
        seed,
        position: groundPoint(p, n, 0.1).toArray(),
        normal: n.toArray(),
        size: isShip ? 2.4 : 1.7,
        name: isShip ? "Derelict spacecraft" : "Resonance archive",
        rarity: rarity(r() * 0.28 + 0.72),
        chunk,
        ship: isShip ? generateShip(seed, p.id) : undefined,
      });
    }
  }
  return entities;
}
export function nearbySurfaceEntities(
  p: Planet,
  position: Vector3,
  profile: Profile,
  range = 1,
) {
  const a = cubeAddress(radial(p, position), p.radius),
    entities: SurfaceEntity[] = [];
  const visited = new Set<string>();
  for (let y = -range; y <= range; y++)
    for (let x = -range; x <= range; x++) {
      const n = cubeNormal(
          a.face,
          ((a.x + x + 0.5) * a.width) / p.radius - 1,
          ((a.y + y + 0.5) * a.width) / p.radius - 1,
        ),
        cell = cubeAddress(n, p.radius),
        key = `${cell.face}/${cell.x}/${cell.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        entities.push(...generateChunk(p, cell.face, cell.x, cell.y, profile));
      }
    }
  return {
    entities,
    chunks: visited.size,
    key: `${p.id}/${a.face}/${a.x}/${a.y}`,
  };
}
export function generateShip(seed: number, planetId = ""): ShipData {
  const r = random(seed),
    classes = ["Scout", "Explorer", "Hauler", "Surveyor"],
    c = Math.floor(r() * 4);
  return {
    id: `ship-${seed.toString(16)}`,
    seed,
    name: `${name(seed)} “${["Wayfarer", "Stillwater", "Nightjar", "Longview"][c]}”`,
    className: classes[c],
    rarity: rarity(r() * 0.3 + 0.7),
    speed: [1.25, 1, 0.78, 0.92][c],
    handling: [1.2, 1, 0.7, 1.1][c],
    cargo: [24, 40, 64, 36][c],
    scanner: [1, 1.3, 0.8, 1.6][c],
    efficiency: [0.85, 1.2, 1, 0.95][c],
    paint: ["#c0c6bb", "#b9aca0", "#a3b3bd", "#b3a9ba"][c],
    planetId,
    damaged: true,
  };
}
