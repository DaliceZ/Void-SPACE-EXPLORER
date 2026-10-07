import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  Object3D,
  Vector3,
} from "three";
import { world } from "./Universe";
import { flight } from "./runtime";
import { hash, random, type System } from "./universe";
import { surface } from "./surface/state";
import { useGame } from "../stores/game";
export function phenomenaFor(system: System) {
  const r = random(hash(`${system.seed}:phenomena`));
  return {
    comet: r() < 0.09,
    nebula: r() < 0.16,
    debris: r() < 0.1,
    seed: system.seed,
  };
}
function Region({ system, quality }: { system: System; quality: number }) {
  const ref = useRef<Group>(null),
    comet = useRef<Group>(null),
    rocks = useRef<InstancedMesh>(null);
  const profile = useMemo(() => phenomenaFor(system), [system]);
  const cloud = useMemo(() => {
    const r = random(system.seed ^ 291),
      a = new Float32Array(quality * 140 * 3);
    for (let i = 0; i < a.length; i += 3) {
      const angle = r() * Math.PI * 2,
        radius = r() * 7000;
      a.set(
        [
          Math.cos(angle) * radius,
          (r() - 0.5) * 1300,
          Math.sin(angle) * radius,
        ],
        i,
      );
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(a, 3));
    return g;
  }, [system.seed, quality]);
  useEffect(() => () => cloud.dispose(), [cloud]);
  useEffect(() => {
    if (!rocks.current) return;
    const r = random(system.seed ^ 221),
      o = new Object3D();
    for (let i = 0; i < quality * 70; i++) {
      const angle = r() * Math.PI * 2,
        radius = 2800 + r() * 1700;
      o.position.set(
        Math.cos(angle) * radius,
        (r() - 0.5) * 120,
        Math.sin(angle) * radius,
      );
      o.rotation.set(r() * 6, r() * 6, r() * 6);
      o.scale.set(2 + r() * 9, 2 + r() * 6, 2 + r() * 7);
      o.updateMatrix();
      rocks.current.setMatrixAt(i, o.matrix);
    }
    rocks.current.instanceMatrix.needsUpdate = true;
    rocks.current.computeBoundingSphere();
  }, [quality, system.seed]);
  useFrame(() => {
    ref.current?.position.set(...system.position).sub(flight.position);
    if (comet.current) {
      const t = surface.data.elapsed * 0.002 + (system.seed % 100);
      comet.current.position.set(Math.cos(t) * 7000, 1800, Math.sin(t) * 7000);
      comet.current.quaternion.setFromUnitVectors(
        new Vector3(0, 1, 0),
        comet.current.position.clone().normalize(),
      );
    }
  });
  return (
    <group ref={ref}>
      <instancedMesh ref={rocks} args={[undefined, undefined, quality * 70]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#847c73" roughness={0.95} />
      </instancedMesh>
      {profile.nebula && (
        <points geometry={cloud}>
          <pointsMaterial
            color={system.seed % 2 ? "#677c96" : "#7d658e"}
            size={2200}
            sizeAttenuation
            transparent
            opacity={0.025}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </points>
      )}
      {profile.comet && (
        <group ref={comet}>
          <mesh>
            <icosahedronGeometry args={[28, 1]} />
            <meshStandardMaterial color="#abbbb8" roughness={0.8} />
          </mesh>
          <mesh position={[0, 800, 0]}>
            <coneGeometry args={[150, 1600, 12, 1, true]} />
            <meshBasicMaterial
              color="#9dd2e5"
              transparent
              opacity={0.12}
              depthWrite={false}
              side={2}
            />
          </mesh>
          <mesh position={[90, 500, 0]} rotation={[0, 0, 0.15]}>
            <coneGeometry args={[240, 1100, 12, 1, true]} />
            <meshBasicMaterial
              color="#b7ae9c"
              transparent
              opacity={0.06}
              depthWrite={false}
              side={2}
            />
          </mesh>
        </group>
      )}
      {profile.debris && (
        <mesh position={[2000, 400, 0]} rotation={[0.6, 0.3, 0.7]}>
          <torusGeometry args={[8, 1.5, 6, 12, Math.PI * 1.3]} />
          <meshStandardMaterial
            color="#9ca7a5"
            roughness={0.7}
            metalness={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
export function SpacePhenomena() {
  const [systems, setSystems] = useState<System[]>([]),
    timer = useRef(0),
    quality = useGame((s) => s.settings.quality);
  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < 1) return;
    timer.current = 0;
    const next = world.systems.filter(
      (s) => new Vector3(...s.position).distanceTo(flight.position) < 32000,
    );
    setSystems((old) =>
      old.map((s) => s.seed).join() === next.map((s) => s.seed).join()
        ? old
        : next,
    );
  });
  return (
    <>
      {systems.map((s) => (
        <Region key={s.seed} system={s} quality={quality} />
      ))}
    </>
  );
}
