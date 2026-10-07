import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  Points,
  Vector3,
} from "three";
import { surface } from "./state";
import { surfaceWorld } from "./ecology";
import { flight } from "../runtime";
import { random } from "../universe";
import { feedback, MATERIALS, resourceMaterial } from "../feedback";
import { useGame } from "../../stores/game";
export function SurfaceEffects() {
  const beam = useRef<Mesh>(null),
    glow = useRef<Mesh>(null),
    impact = useRef<Mesh>(null),
    tool = useRef<Group>(null),
    particles = useRef<Points>(null);
  const geometry = useMemo(() => {
    const r = random(774),
      array = new Float32Array(240 * 3);
    for (let i = 0; i < array.length; i++) array[i] = (r() - 0.5) * 22;
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(array, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const a = new Vector3(),
    b = new Vector3(),
    up = new Vector3(0, 1, 0);
  useFrame(({ camera, clock }, delta) => {
    const foot = surface.data.mode === "foot",
      target = surfaceWorld.target,
      show = foot && feedback.beam > 0.025 && !!target?.resource;
    if (tool.current) {
      tool.current.visible = foot;
      tool.current.quaternion.copy(camera.quaternion);
      tool.current.position
        .set(
          0.09 +
            (feedback.reducedMotion
              ? 0
              : Math.sin(feedback.time * 53) * feedback.beam * 0.0015),
          -0.065 + Math.sin(feedback.time * 1.8) * 0.001,
          -0.16 + feedback.beam * 0.005,
        )
        .applyQuaternion(camera.quaternion);
    }
    if (beam.current && impact.current) {
      beam.current.visible = impact.current.visible = show;
      if (show && target) {
        a.set(0.09, -0.05, -0.22).applyQuaternion(camera.quaternion);
        b.set(...target.position)
          .sub(flight.position)
          .addScaledVector(new Vector3(...target.normal), target.size * 0.45);
        beam.current.position.copy(a).lerp(b, 0.5);
        beam.current.quaternion.setFromUnitVectors(
          up,
          b.clone().sub(a).normalize(),
        );
        beam.current.scale.set(
          0.003 * feedback.beam,
          a.distanceTo(b),
          0.003 * feedback.beam,
        );
        if (glow.current) {
          glow.current.position.copy(beam.current.position);
          glow.current.quaternion.copy(beam.current.quaternion);
          glow.current.scale.set(
            0.012 * feedback.beam,
            a.distanceTo(b),
            0.012 * feedback.beam,
          );
        }
        impact.current.position.copy(b);
        impact.current.scale.setScalar(
          (0.04 + Math.sin(clock.elapsedTime * 25) * 0.006) * feedback.beam,
        );
        (
          impact.current.material as import("three").MeshBasicMaterial
        ).color.set(MATERIALS[resourceMaterial(target.resource)].color);
      }
    }
    if (glow.current) glow.current.visible = show;
    if (particles.current) {
      particles.current.visible =
        (surface.weather > 0.1 && foot) ||
        (surface.data.mode === "landing" && surface.landingTime > 6);
      const n = surface.planet
        ? flight.position
            .clone()
            .sub(new Vector3(...surface.planet.position))
            .normalize()
        : up;
      particles.current.quaternion.setFromUnitVectors(up, n);
      const attr = geometry.getAttribute("position") as BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        let y =
          attr.getY(i) -
          (useGame.getState().screen === "flight" ? Math.min(delta, 0.05) : 0) *
            (1 + surface.weather * 8);
        if (y < -10) y = 10;
        attr.setY(i, y);
      }
      attr.needsUpdate = true;
    }
  });
  return (
    <>
      <mesh ref={beam}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial
          color="#b9e9c6"
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={impact}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ecf0c1" />
      </mesh>
      <mesh ref={glow}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial
          color="#a0e5c8"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      <group ref={tool}>
        <mesh scale={[0.035, 0.025, 0.1]}>
          <boxGeometry />
          <meshStandardMaterial
            color="#9caea9"
            metalness={0.4}
            roughness={0.38}
          />
        </mesh>
        <mesh
          position={[0, -0.022, 0.022]}
          scale={[0.018, 0.05, 0.022]}
          rotation={[0.25, 0, 0]}
        >
          <boxGeometry />
          <meshStandardMaterial color="#344c48" />
        </mesh>
        <mesh position={[0, 0, -0.05]}>
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshBasicMaterial color="#b8e5cc" />
        </mesh>
      </group>
      <points ref={particles} geometry={geometry}>
        <pointsMaterial
          size={0.025}
          color="#b8cbd0"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </points>
    </>
  );
}
