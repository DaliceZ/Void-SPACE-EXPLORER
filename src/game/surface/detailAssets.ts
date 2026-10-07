import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LatheGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  LinearFilter,
  LinearMipmapLinearFilter,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Shared, deterministic meshes and small tileable surface maps; no per-object textures.
function join(parts: BufferGeometry[]) {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
  const result = mergeGeometries(flat)!;
  flat.forEach((g) => g.dispose());
  parts.forEach((g) => g.dispose());
  return result;
}
function branch(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  radius: number,
) {
  const g = new CylinderGeometry(
    radius * 0.45,
    radius,
    Math.hypot(bx - ax, by - ay, bz - az),
    7,
    3,
  );
  // Align cylinder's Y axis with the branch direction.
  const dx = bx - ax,
    dy = by - ay,
    dz = bz - az;
  g.rotateZ(-Math.atan2(dx, Math.hypot(dy, dz)));
  g.rotateX(Math.atan2(dz, dy));
  return g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
}
function leaf(length: number, width: number) {
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        0,
        0,
        0,
        -width,
        width * 0.1,
        length * 0.48,
        0,
        width * 0.28,
        length * 0.54,
        0,
        0,
        0,
        0,
        width * 0.28,
        length * 0.54,
        width,
        width * 0.1,
        length * 0.48,
        -width,
        width * 0.1,
        length * 0.48,
        0,
        0,
        length,
        0,
        width * 0.28,
        length * 0.54,
        0,
        width * 0.28,
        length * 0.54,
        0,
        0,
        length,
        width,
        width * 0.1,
        length * 0.48,
      ],
      3,
    ),
  );
  g.setAttribute(
    "uv",
    new Float32BufferAttribute(
      [
        0.5, 0, 0, 0.5, 0.5, 0.5, 0.5, 0, 0.5, 0.5, 1, 0.5, 0, 0.5, 0.5, 1, 0.5,
        0.5, 0.5, 0.5, 0.5, 1, 1, 0.5,
      ],
      2,
    ),
  );
  g.computeVertexNormals();
  return g;
}
function textured(kind: "bark" | "stone" | "skin" | "leaf", base: string) {
  const data = new Uint8Array(128 * 128 * 4),
    c = new Color(base).convertLinearToSRGB();
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const grain = (Math.sin(x * 73.1 + y * 317.7) * 43758.5453) % 1;
      const striation =
        kind === "bark"
          ? Math.sin(x * 0.65 + Math.sin(y * 0.13) * 1.8)
          : kind === "skin"
            ? Math.sin(x * 0.55) * Math.sin(y * 0.8)
            : kind === "leaf"
              ? Math.cos((x - 64) * 0.5 + y * 0.22)
              : Math.sin(x * 0.2 + Math.sin(y * 0.15) * 3);
      const v = 0.88 + striation * 0.07 + grain * 0.025,
        i = (y * 128 + x) * 4;
      data[i] = Math.min(255, c.r * 255 * v);
      data[i + 1] = Math.min(255, c.g * 255 * v);
      data[i + 2] = Math.min(255, c.b * 255 * v);
      data[i + 3] = 255;
    }
  const texture = new DataTexture(data, 128, 128, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  const material = new MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: kind === "stone" ? 0.008 : 0.003,
    roughness: kind === "skin" ? 0.7 : 0.9,
    metalness: kind === "stone" ? 0.12 : 0,
  });
  if (kind === "leaf") {
    material.bumpMap = null;
    material.emissive.set("#426844");
    material.emissiveIntensity = 0.22;
  }
  return { material, texture };
}
export function createDetailAssets() {
  const wood: BufferGeometry[] = [
    new CylinderGeometry(0.035, 0.07, 1, 9, 6).translate(0, 0, 0),
  ];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399,
      h = -0.25 + i * 0.105;
    wood.push(
      branch(0, h, 0, Math.cos(a) * 0.38, h + 0.24, Math.sin(a) * 0.38, 0.025),
    );
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 1.256;
    wood.push(
      branch(0, -0.35, 0, Math.cos(a) * 0.17, -0.5, Math.sin(a) * 0.17, 0.04),
    );
  }
  const fronds: BufferGeometry[] = [];
  for (let tier = 0; tier < 3; tier++)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + tier * 0.55,
        len = 0.65 - tier * 0.12;
      for (let j = 0; j < 5; j++)
        for (const side of [-1, 1]) {
          const g = leaf(0.24 * (1 - j * 0.12), 0.058)
            .rotateY(side * 0.9)
            .translate(0, 0, (j * len) / 5)
            .rotateX(-0.2 - tier * 0.15)
            .rotateY(a)
            .translate(0, tier * 0.16, 0);
          fronds.push(g);
        }
      fronds.push(
        branch(
          0,
          tier * 0.16,
          0,
          Math.sin(a) * len,
          tier * 0.16 + 0.1,
          Math.cos(a) * len,
          0.008,
        ),
      );
    }
  const cap = new LatheGeometry(
    [
      new Vector2(0, 0.05),
      new Vector2(0.18, -0.03),
      new Vector2(0.46, -0.06),
      new Vector2(0.63, 0),
      new Vector2(0.49, 0.1),
      new Vector2(0.3, 0.23),
      new Vector2(0.05, 0.3),
      new Vector2(0, 0.28),
    ],
    24,
  );
  const fungi: BufferGeometry[] = [cap];
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    fungi.push(
      branch(
        0,
        -0.04,
        0,
        Math.cos(a) * 0.57,
        -0.025,
        Math.sin(a) * 0.57,
        0.008,
      ),
    );
  }
  const petals: BufferGeometry[] = [];
  for (let i = 0; i < 13; i++)
    petals.push(
      leaf(0.65, 0.13)
        .rotateX(-0.8)
        .rotateY(i * 2.399)
        .translate(0, (i % 3) * 0.08, 0),
    );
  const rock = new IcosahedronGeometry(1, 2).toNonIndexed(),
    pos = rock.getAttribute("position");
  const colors: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const r =
      0.86 +
      0.17 * Math.sin(x * 11 + y * 7 + z * 5) +
      0.09 * Math.sin(z * 23 - x * 9);
    pos.setXYZ(i, x * r, Math.max(-0.48, y * r), z * r);
    const v = 0.65 + 0.2 * Math.sin(Math.floor(i / 3) * 7.31);
    colors.push(v, v * 0.98, v * 0.93);
  }
  rock.setAttribute("color", new Float32BufferAttribute(colors, 3));
  rock.computeVertexNormals();
  const crystals: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399;
    crystals.push(
      new CylinderGeometry(0, 0.16, 0.8 + (i % 3) * 0.22, 5, 1)
        .rotateZ(Math.cos(a) * 0.35)
        .translate(Math.cos(a) * 0.33, 0.15, Math.sin(a) * 0.33),
    );
  }
  const body: BufferGeometry[] = [
    new SphereGeometry(1, 16, 10).scale(0.9, 0.8, 1),
  ];
  for (let i = 0; i < 6; i++)
    body.push(
      new SphereGeometry(1, 8, 5)
        .scale(0.93 - i * 0.025, 0.22, 0.22)
        .translate(0, 0.61, -0.7 + i * 0.27),
    );
  const head: BufferGeometry[] = [
    new SphereGeometry(1, 12, 8).scale(0.8, 0.8, 1.2),
    new CylinderGeometry(0.26, 0.5, 0.8, 7)
      .rotateX(Math.PI / 2)
      .translate(0, -0.1, -1.1),
  ];
  for (const side of [-1, 1])
    head.push(
      new CylinderGeometry(0, 0.13, 0.85, 6)
        .rotateZ(-side * 0.3)
        .translate(side * 0.48, 0.82, 0.1),
    );
  const eye: BufferGeometry[] = [];
  for (const side of [-1, 1])
    eye.push(
      new SphereGeometry(0.19, 8, 6)
        .scale(0.5, 1, 1)
        .translate(side * 0.73, 0.2, -0.5),
    );
  const leg = join([
    branch(0, 0.5, 0, 0.26, 0, 0.12, 0.12),
    branch(0.26, 0, 0.12, 0.16, -0.45, -0.05, 0.075),
    new IcosahedronGeometry(0.15, 1).translate(0.26, 0, 0.12),
    new SphereGeometry(0.13, 8, 4)
      .scale(1, 0.5, 1.8)
      .translate(0.16, -0.48, -0.13),
  ]);
  const feathers: BufferGeometry[] = [];
  for (let i = 0; i < 9; i++)
    feathers.push(
      leaf(1 - i * 0.045, 0.12)
        .rotateY(-0.65 + i * 0.13)
        .translate((i - 4) * 0.12, 0, 0),
    );
  const materials = [
    textured("stone", "#e0ded4"),
    textured("bark", "#a69b80"),
    textured("leaf", "#e6ead9"),
    textured("skin", "#d4d3bc"),
  ];
  materials[0].material.vertexColors = true;
  materials[2].material.side = 2;
  const geometries = {
    trunk: join(wood),
    fern: join(fronds),
    fungus: join(fungi),
    bulb: join(petals),
    rock,
    crystal: join(crystals),
    body: join(body),
    head: join(head),
    eyes: join(eye),
    leg,
    wing: join(feathers),
  };
  return {
    geometries,
    materials,
    dispose() {
      Object.values(geometries).forEach((g) => g.dispose());
      materials.forEach((m) => {
        m.material.dispose();
        m.texture.dispose();
      });
    },
  };
}
