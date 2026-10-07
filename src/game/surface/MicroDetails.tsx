import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  Color,
} from "three";
import { surfaceWorld } from "./ecology";
import { surface } from "./state";
import { flight } from "../runtime";
import { random } from "../universe";
import { groundPoint, radial, tangentFrame } from "./ground";
import { useGame } from "../../stores/game";
import { feedback } from "../feedback";
import { reactiveUniforms, vegetationMaterial } from "./reactiveMaterials";
export const microStats = { grass: 0, stones: 0 };
const CAP = 640;
export function MicroDetails() {
  const root = useRef<Group>(null),
    grass = useRef<InstancedMesh>(null),
    stones = useRef<InstancedMesh>(null),
    timer = useRef(1),
    old = useRef(new Vector3(1e9, 0, 0)),
    revision = useRef(-1),
    object = useMemo(() => new Object3D(), []);
  const uniforms = useMemo(reactiveUniforms, []);
  const blade = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(
        [
          -0.03, 0, 0, 0.03, 0, 0, 0.04, 0.28, 0.04, 0, 0, -0.03, 0, 0, 0.03,
          -0.03, 0.23, 0.015, -0.02, 0, -0.02, 0.02, 0, 0.02, -0.02, 0.19, 0.06,
        ],
        3,
      ),
    );
    g.computeVertexNormals();
    return g;
  }, []);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: "#91a57a",
      roughness: 1,
      side: 2,
    });
    vegetationMaterial(m, uniforms, 1.5);
    return m;
  }, [uniforms]);
  useEffect(
    () => () => {
      blade.dispose();
      material.dispose();
      microStats.grass = microStats.stones = 0;
    },
    [blade, material],
  );
  useFrame((_, delta) => {
    const p = surface.planet,
      enabled = !!p && surface.data.mode !== "flight";
    if (root.current) root.current.visible = enabled;
    if (!enabled || !p) return;
    root.current?.position.set(...p.position).sub(flight.position);
    uniforms.uPlayer.value
      .copy(flight.position)
      .sub(new Vector3(...p.position));
    uniforms.uLifeTime.value = feedback.time;
    uniforms.uWind.value = 0.5 + surface.weather * 2;
    uniforms.uRadius.value = 1.2;
    uniforms.uEngine.value =
      surface.data.mode === "landing" && surface.landingTime > 6 ? 1 : 0;
    uniforms.uShip.value.copy(uniforms.uPlayer.value);
    timer.current += Math.min(delta, 0.05);
    if (timer.current < 0.5) return;
    timer.current = 0;
    if (
      old.current.distanceTo(flight.position) < 1.5 &&
      revision.current === surface.revision
    )
      return;
    old.current.copy(flight.position);
    revision.current = surface.revision;
    let gi = 0,
      si = 0;
    const q = useGame.getState().settings.quality,
      range = q === 1 ? 7 : 11,
      budget = q * 180;
    for (const e of surfaceWorld.entities) {
      const base = new Vector3(...e.position),
        distance = base.distanceTo(flight.position);
      if (distance > range + 2) continue;
      if (e.kind !== "flora" && e.kind !== "mineral") continue;
      const r = random(e.seed + 9182),
        n = new Vector3(...e.normal),
        { east, north } = tangentFrame(n);
      for (let j = 0; j < 12; j++) {
        const point = base
            .clone()
            .addScaledVector(east, (r() - 0.5) * 4)
            .addScaledVector(north, (r() - 0.5) * 4),
          nn = radial(p, point),
          at = groundPoint(p, nn);
        const d = at.distanceTo(flight.position);
        if (d > range || (d > range * 0.6 && j % 3 !== 0)) continue;
        if (
          (p.type === "Ocean" || p.type === "Lush") &&
          at.distanceTo(new Vector3(...p.position)) < p.radius + 0.7
        )
          continue;
        object.position.copy(at).sub(new Vector3(...p.position));
        object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), nn);
        object.rotateY(r() * 6.28);
        if (e.kind === "flora" && gi < budget && gi < CAP) {
          object.scale.setScalar(0.4 + r() * 0.6);
          object.updateMatrix();
          grass.current?.setMatrixAt(gi, object.matrix);
          grass.current?.setColorAt(
            gi++,
            new Color(e.species?.color || "#91a57a").multiplyScalar(
              0.8 + r() * 0.4,
            ),
          );
        } else if (e.kind === "mineral" && si < budget && si < CAP) {
          object.scale.set(
            0.015 + r() * 0.06,
            0.01 + r() * 0.04,
            0.015 + r() * 0.05,
          );
          object.updateMatrix();
          stones.current?.setMatrixAt(si, object.matrix);
          stones.current?.setColorAt(
            si++,
            new Color(
              p.type === "Ice"
                ? "#cadde0"
                : p.type === "Desert"
                  ? "#b39e7d"
                  : "#73766c",
            ),
          );
        }
      }
    }
    for (const [ref, count] of [
      [grass, gi],
      [stones, si],
    ] as const) {
      if (ref.current) {
        ref.current.count = count;
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor)
          ref.current.instanceColor.needsUpdate = true;
        ref.current.computeBoundingSphere();
      }
    }
    microStats.grass = gi;
    microStats.stones = si;
  });
  return (
    <group ref={root}>
      <instancedMesh ref={grass} args={[blade, material, CAP]} />
      <instancedMesh
        ref={stones}
        args={[undefined, undefined, CAP]}
        receiveShadow
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}
