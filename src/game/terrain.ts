import type { Planet } from "./universe";
function smooth(v: number) {
  return v * v * (3 - 2 * v);
}
function lattice(x: number, y: number, z: number, seed: number) {
  let n =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(z, 2147483647) +
    seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function noise(x: number, y: number, z: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z),
    fx = smooth(x - ix),
    fy = smooth(y - iy),
    fz = smooth(z - iz);
  let value = 0;
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 2; b++)
      for (let c = 0; c < 2; c++)
        value +=
          lattice(ix + a, iy + b, iz + c, seed) *
          (a ? fx : 1 - fx) *
          (b ? fy : 1 - fy) *
          (c ? fz : 1 - fz);
  return value;
}
export function surfaceHeight(x: number, y: number, z: number, p: Planet) {
  if (p.type === "Gas giant") return 0;
  const warp = noise(x * 2 + 5, y * 2, z * 2, p.seed) * 0.6;
  const continent = noise(x * 3 + warp, y * 3, z * 3, p.seed);
  const mountain =
    1 - Math.abs(noise(x * 13, y * 13, z * 13, p.seed + 21) * 2 - 1);
  const detail = noise(x * 43, y * 43, z * 43, p.seed + 55);
  const h = (continent - 0.48) * 0.095 + mountain * 0.013 + detail * 0.004;
  return p.type === "Ocean" || p.type === "Lush" ? Math.max(0, h) : h;
}
function rgb(hex: string) {
  return [1, 3, 5].map((i) =>
    Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2),
  );
}
export function buildTerrain(p: Planet, resolution: number) {
  const count = 6 * (resolution + 1) ** 2,
    positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    indices = new Uint32Array(6 * resolution * resolution * 6);
  const base = rgb(p.color);
  let at = 0,
    idx = 0;
  for (let face = 0; face < 6; face++)
    for (let iy = 0; iy <= resolution; iy++)
      for (let ix = 0; ix <= resolution; ix++) {
        const u = (ix / resolution) * 2 - 1,
          v = (iy / resolution) * 2 - 1;
        let [x, y, z] =
          face === 0
            ? [1, v, -u]
            : face === 1
              ? [-1, v, u]
              : face === 2
                ? [u, 1, -v]
                : face === 3
                  ? [u, -1, v]
                  : face === 4
                    ? [u, v, 1]
                    : [-u, v, -1];
        const len = Math.hypot(x, y, z);
        x /= len;
        y /= len;
        z /= len;
        const h = surfaceHeight(x, y, z, p),
          radius = p.radius * (1 + h);
        positions.set([x * radius, y * radius, z * radius], at * 3);
        const moisture = noise(x * 5 + 9, y * 5, z * 5, p.seed + 18),
          latitude = Math.abs(y);
        let color = base.map((c) => c * (0.65 + moisture * 0.6));
        if (p.type === "Ocean" || p.type === "Lush") {
          color =
            h < 0.001
              ? [0.012, 0.05 + moisture * 0.055, 0.09 + moisture * 0.08]
              : h < 0.004
                ? [0.2, 0.25, 0.19]
                : [
                    0.065 + moisture * 0.12,
                    0.13 + moisture * 0.16,
                    0.095 + moisture * 0.07,
                  ];
          if (latitude > 0.86 || h > 0.045) color = [0.62, 0.72, 0.75];
        }
        if (p.type === "Gas giant") {
          const band =
            0.55 +
            0.35 * Math.sin(y * 38 + noise(x * 7, y * 7, z * 7, p.seed) * 5);
          color = base.map((c) => c * band);
        }
        if (p.type === "Volcanic" && moisture > 0.69)
          color = [0.7, 0.11, 0.018];
        colors.set(color, at * 3);
        if (ix < resolution && iy < resolution) {
          const a = at,
            b = at + 1,
            c = at + resolution + 1,
            d = c + 1;
          indices.set([a, b, c, b, d, c], idx);
          idx += 6;
        }
        at++;
      }
  return { positions, colors, indices };
}
