export type Vec3 = [number, number, number];
export type Planet = {
  id: string;
  seed: number;
  name: string;
  position: Vec3;
  radius: number;
  type: string;
  color: string;
  temperature: number;
  atmosphere: string;
  resource: string;
  hazard: number;
  rings: boolean;
  anomaly: boolean;
};
export type System = {
  id: string;
  seed: number;
  name: string;
  position: Vec3;
  color: string;
  radius: number;
  className: string;
  temperature: number;
  count: number;
};
export const SECTOR_SIZE = 60000;
export function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function name(seed: number) {
  const r = random(seed),
    a = ["Ae", "Ve", "Th", "Ny", "Sa", "Or", "Ca", "Ze", "El", "Io"],
    b = [
      "thra",
      "lune",
      "rys",
      "vora",
      "lith",
      "nara",
      "dris",
      "ria",
      "thea",
      "lios",
    ];
  return `${a[Math.floor(r() * a.length)]}${b[Math.floor(r() * b.length)]}-${Math.floor(r() * 900 + 100)}`.toUpperCase();
}
export function sectorAt(position: Vec3): Vec3 {
  return position.map((v) =>
    Math.floor((v + SECTOR_SIZE / 2) / SECTOR_SIZE),
  ) as Vec3;
}
export function nearbySectors(center: Vec3, range = 1): Vec3[] {
  const result: Vec3[] = [];
  for (let x = -range; x <= range; x++)
    for (let y = -range; y <= range; y++)
      for (let z = -range; z <= range; z++)
        result.push([center[0] + x, center[1] + y, center[2] + z]);
  return result;
}
export function generateSystem(universe: string, sector: Vec3): System {
  const id = sector.join(":"),
    seed = hash(`${universe}:sector:${id}`),
    r = random(seed),
    v = r();
  const cls =
    v < 0.45
      ? ["Orange dwarf", "#ffbd80", 4400]
      : v < 0.73
        ? ["Yellow star", "#ffe0a3", 5800]
        : v < 0.9
          ? ["Red dwarf", "#ff7e62", 3100]
          : v < 0.98
            ? ["White star", "#d4e5ff", 9000]
            : ["Blue giant", "#8bc7ff", 22000];
  const home = sector.every((v) => v === 0);
  return {
    id,
    seed,
    name: name(seed),
    position: home
      ? [-6000, 2500, -7500]
      : (sector.map((v) => v * SECTOR_SIZE + (r() - 0.5) * 12000) as Vec3),
    color: cls[1] as string,
    className: cls[0] as string,
    temperature: cls[2] as number,
    radius: 450 + r() * 550,
    count: 3 + Math.floor(r() * 6),
  };
}
const types = [
  "Ocean",
  "Desert",
  "Ice",
  "Volcanic",
  "Lush",
  "Barren",
  "Gas giant",
  "Crystal",
];
const palettes = [
  "#6cbdca",
  "#c1a074",
  "#a7c6d1",
  "#c16f4d",
  "#7ba38e",
  "#9c9590",
  "#bb8b73",
  "#a49ad2",
];
const atmospheres = [
  "Oxygen / nitrogen",
  "Thin carbon dioxide",
  "Thin nitrogen",
  "Sulfur dioxide",
  "Dense oxygen",
  "Trace argon",
  "Hydrogen / helium",
  "Ionized argon",
];
const resources = [
  "Pelagium",
  "Silicate",
  "Cryonite",
  "Obsidian",
  "Verdite",
  "Ferrite",
  "Helium-3",
  "Lumen crystal",
];
export function generatePlanets(system: System): Planet[] {
  const r = random(system.seed ^ 92341);
  return Array.from({ length: system.count }, (_, i) => {
    const seed = hash(`${system.seed}:planet:${i}`),
      t = system.id === "0:0:0" && i === 0 ? 0 : Math.floor(r() * types.length),
      angle = r() * Math.PI * 2,
      orbit = 3500 + i * 2200;
    const position: Vec3 =
      system.id === "0:0:0" && i === 0
        ? [680, 180, -500]
        : [
            system.position[0] + Math.cos(angle) * orbit,
            system.position[1] + (r() - 0.5) * 700,
            system.position[2] + Math.sin(angle) * orbit,
          ];
    return {
      id: `${system.id}/${i}`,
      seed,
      name: name(seed),
      position,
      radius: system.id === "0:0:0" && i === 0 ? 890 : 250 + r() * 550,
      type: types[t],
      color: palettes[t],
      temperature: Math.round(
        t === 2 ? -160 + r() * 80 : t === 3 ? 260 + r() * 300 : -30 + r() * 110,
      ),
      atmosphere: atmospheres[t],
      resource: resources[t],
      hazard: Math.floor(r() * 5),
      rings: i === 0 || r() < 0.13,
      anomaly: r() < 0.06,
    };
  });
}
