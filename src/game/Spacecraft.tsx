import { useMemo, useEffect } from "react";
import { BufferGeometry, BufferAttribute, DoubleSide } from "three";
export function Spacecraft() {
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
    <>
      <mesh rotation={[-Math.PI / 2, Math.PI / 4, 0]} scale={[1, 0.95, 0.45]}>
        <coneGeometry args={[0.68, 3.7, 4]} />
        <meshStandardMaterial
          color="#849299"
          metalness={0.7}
          roughness={0.35}
        />
      </mesh>
      <mesh geometry={wings}>
        <meshStandardMaterial
          color="#6a797f"
          metalness={0.75}
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
    </>
  );
}
