import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Group, Vector3, CanvasTexture, AdditiveBlending } from "three";
import {
  generatePlanets,
  generateSystem,
  nearbySectors,
  sectorAt,
  type Planet,
  type System,
} from "./universe";
import { PlanetMesh } from "./Planet";
import { flight } from "./runtime";
export const world: {
  planets: Planet[];
  systems: System[];
  sectors: number;
  lod: number;
} = { planets: [], systems: [], sectors: 27, lod: 0 };
let glow: CanvasTexture | undefined;
function glowTexture() {
  if (glow) return glow;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!,
    gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "#ffffffff");
  gradient.addColorStop(0.12, "#ffffffcc");
  gradient.addColorStop(0.3, "#ffffff33");
  gradient.addColorStop(1, "#ffffff00");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  glow = new CanvasTexture(canvas);
  return glow;
}
function Star({ system }: { system: System }) {
  const ref = useRef<Group>(null);
  useFrame(() =>
    ref.current?.position.set(...system.position).sub(flight.position),
  );
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[system.radius * 0.4, 24, 16]} />
        <meshBasicMaterial color={system.color} />
      </mesh>
      <sprite scale={[system.radius * 7, system.radius * 7, 1]}>
        <spriteMaterial
          map={glowTexture()}
          color={system.color}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}
export function Universe({
  seed,
  quality = 2,
}: {
  seed: string;
  quality?: number;
}) {
  const [sector, setSector] = useState("0,0,0");
  const timer = useRef(0);
  const systems = useMemo(
    () =>
      nearbySectors(
        sector.split(",").map(Number) as [number, number, number],
      ).map((s) => generateSystem(seed, s)),
    [seed, sector],
  );
  const [active, setActive] = useState<string[]>(["0:0:0"]);
  const planets = useMemo(
    () => systems.filter((s) => active.includes(s.id)).flatMap(generatePlanets),
    [systems, active],
  );
  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current > 0.4) {
      timer.current = 0;
      setSector(sectorAt(flight.position.toArray()).join(","));
      const next = systems
        .filter(
          (s) => flight.position.distanceTo(new Vector3(...s.position)) < 30000,
        )
        .map((s) => s.id);
      setActive((old) => (old.join() === next.join() ? old : next));
    }
    world.planets = planets;
    world.systems = systems;
    world.sectors = systems.length;
  });
  return (
    <>
      <Stars
        radius={35000}
        depth={45000}
        count={quality * 1800}
        factor={12}
        saturation={0.2}
        fade
        speed={0.15}
      />
      {systems.map((s) => (
        <Star key={`${seed}/${s.id}`} system={s} />
      ))}
      {planets.map((p) => (
        <PlanetMesh key={`${seed}/${p.id}`} planet={p} quality={quality} />
      ))}
    </>
  );
}
