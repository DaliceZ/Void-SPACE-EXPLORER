import { useMemo, useEffect, useRef, useState } from "react";
import {
  BufferGeometry,
  BufferAttribute,
  DoubleSide,
  Group,
  PointLight,
  Mesh,
  MeshBasicMaterial,
} from "three";
import { useFrame } from "@react-three/fiber";
import { surface } from "./surface/state";
import { currentShip } from "./surface/fleet";
import { flight } from "./runtime";
import { vehicleFeedback } from "./feedback";
export function Spacecraft({
  parked = false,
  paint = "#b1bfc5",
}: {
  parked?: boolean;
  paint?: string;
}) {
  const [vessel, setVessel] = useState(currentShip()),
    chassis = useRef<Group>(null);
  const bodyPaint = parked ? paint : vessel.paint;
  const engineLight = useRef<PointLight>(null),
    jets = useRef<Group>(null),
    plasma = useRef<Mesh>(null);
  const vesselId = useRef(vessel.id);
  useFrame(() => {
    if (!parked) {
      const next = currentShip();
      if (vesselId.current !== next.id) {
        vesselId.current = next.id;
        setVessel(next);
      }
    }
    if (chassis.current)
      chassis.current.scale.set(
        vessel.className === "Hauler"
          ? 1.3
          : vessel.className === "Scout"
            ? 0.85
            : 1,
        1,
        vessel.className === "Surveyor" ? 1.2 : 1,
      );
  });
  const exhaust = useRef<Group>(null),
    gear = useRef<Group>(null),
    lights = useRef<Group>(null);
  useFrame(({ clock }) => {
    const power = parked ? 0 : surface.throttle;
    if (engineLight.current) engineLight.current.intensity = 0.15 + power * 3;
    if (plasma.current) {
      plasma.current.visible =
        !parked &&
        surface.data.mode === "flight" &&
        vehicleFeedback.heat > 0.02;
      (plasma.current.material as MeshBasicMaterial).opacity =
        vehicleFeedback.heat * 0.24;
    }
    if (jets.current) {
      const k = flight.keys;
      jets.current.children.forEach((jet, i) => {
        jet.visible =
          !parked &&
          ((i === 0 && (k.has("KeyD") || k.has("ArrowLeft"))) ||
            (i === 1 && (k.has("KeyA") || k.has("ArrowRight"))) ||
            (i > 1 &&
              (k.has("Space") ||
                k.has("ArrowUp") ||
                surface.data.mode === "landing")));
      });
    }
    if (exhaust.current) {
      const power = parked ? 0 : surface.throttle;
      exhaust.current.scale.z = 0.12 + power * 1.2;
      exhaust.current.visible =
        !parked &&
        surface.data.mode !== "landed" &&
        surface.data.mode !== "foot";
    }
    if (gear.current)
      gear.current.visible = parked || surface.data.mode !== "flight";
    if (lights.current)
      lights.current.visible = Math.sin(clock.elapsedTime * 3) > 0.2;
  });
  const wings = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([
          -2.4, -0.06, 1.15, -0.45, -0.06, -1.1, -0.35, -0.06, 1.5, 0.35, -0.06,
          1.5, 0.45, -0.06, -1.1, 2.4, -0.06, 1.15,
        ]),
        3,
      ),
    );
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => wings.dispose(), [wings]);
  return (
    <group ref={chassis}>
      <mesh rotation={[-Math.PI / 2, Math.PI / 4, 0]} scale={[1, 0.95, 0.45]}>
        <coneGeometry args={[0.68, 3.7, 4]} />
        <meshStandardMaterial
          color={bodyPaint}
          metalness={0.38}
          roughness={0.42}
        />
      </mesh>
      <mesh geometry={wings}>
        <meshStandardMaterial
          color={bodyPaint}
          metalness={0.4}
          roughness={0.35}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.2, -0.25]} scale={[0.34, 0.18, 0.75]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial
          color="#172c3b"
          metalness={0.8}
          roughness={0.18}
          emissive="#174257"
          emissiveIntensity={0.35}
        />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <group key={x} position={[x, -0.05, 1.2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 0.55, 8]} />
            <meshStandardMaterial color="#33424b" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.32]} scale={[1, 1, 1.8]}>
            <sphereGeometry args={[0.115, 12, 8]} />
            <meshBasicMaterial color="#a8e2ef" />
          </mesh>
        </group>
      ))}
      <group ref={exhaust} position={[0, 0, 1.55]}>
        {[-0.55, 0.55].map((v) => (
          <mesh key={v} position={[v, 0, 0.65]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.17, 1.5, 16]} />
            <meshBasicMaterial
              color="#95d6f1"
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        ))}
        {[-0.55, 0.55].map((v) => (
          <mesh
            key={"core" + v}
            position={[v, 0, 0.42]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.07, 0.9, 12]} />
            <meshBasicMaterial
              color="#e3fbff"
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <pointLight
        ref={engineLight}
        position={[0, 0, 1.8]}
        distance={4}
        color="#90d4ff"
        intensity={0}
      />
      <group ref={jets}>
        {[
          [-1.5, 0, 0.2],
          [1.5, 0, 0.2],
          [-0.6, -0.4, 0.5],
          [0.6, -0.4, 0.5],
        ].map(([x, y, z], i) => (
          <mesh
            key={i}
            position={[x, y, z]}
            rotation={[
              0,
              0,
              i === 0 ? -Math.PI / 2 : i === 1 ? Math.PI / 2 : Math.PI,
            ]}
          >
            <coneGeometry args={[0.045, 0.3, 7]} />
            <meshBasicMaterial
              color="#cceeff"
              transparent
              opacity={0.65}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <mesh ref={plasma} position={[0, 0, -0.8]} scale={[1.2, 0.45, 1.5]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshBasicMaterial
          color="#eda972"
          transparent
          opacity={0}
          wireframe
          depthWrite={false}
        />
      </mesh>
      <group ref={gear}>
        {[
          [-0.8, 0.7],
          [0.8, 0.7],
          [0, -1.1],
        ].map(([a, b]) => (
          <group key={`${a}/${b}`} position={[a, -0.55, b]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.07, 0.7, 8]} />
              <meshStandardMaterial color="#84919a" metalness={0.5} />
            </mesh>
            <mesh position={[0, -0.32, 0]} scale={[0.36, 0.06, 0.3]}>
              <boxGeometry />
              <meshStandardMaterial color="#34454d" />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={lights}>
        {[-2.3, 2.3].map((v, i) => (
          <mesh key={v} position={[v, 0, 1.12]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshBasicMaterial color={i ? "#b3cbb9" : "#dd8f71"} />
          </mesh>
        ))}
      </group>
      {[
        [-0.5, 0, -0.5],
        [0.5, 0, -0.5],
      ].map(([a, b, c]) => (
        <mesh key={a} position={[a, b, c]} scale={[0.04, 0.025, 0.7]}>
          <boxGeometry />
          <meshStandardMaterial color="#d2b789" metalness={0.35} />
        </mesh>
      ))}
      {!parked && (
        <pointLight
          position={[0, 3, 3]}
          intensity={6}
          distance={12}
          decay={1.5}
          color="#abc5d6"
        />
      )}
    </group>
  );
}
