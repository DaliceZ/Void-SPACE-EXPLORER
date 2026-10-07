import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Vector3,
  AdditiveBlending,
} from "three";
import { requestTerrain } from "./terrainService";
import { flight } from "./runtime";
import type { Planet as PlanetData } from "./universe";
import { planetVertex, planetFragment } from "./shaders";
import { telemetry } from "./telemetry";
import { useGame } from "../stores/game";
const atmosphereVertex = `varying vec3 vNormal; varying vec3 vPosition; void main(){vec4 world=modelMatrix*vec4(position,1.); vPosition=world.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`;
const atmosphereFragment = `uniform vec3 tint; varying vec3 vNormal; varying vec3 vPosition; void main(){vec3 view=normalize(cameraPosition-vPosition);float rim=pow(1.-abs(dot(normalize(vNormal),view)),3.2);float sun=.3+.7*max(dot(normalize(vNormal),normalize(vec3(-.8,.5,.8))),0.);gl_FragColor=vec4(tint*sun,rim*.55);}`;
export const PlanetMesh = memo(function PlanetMesh({
  planet,
  quality,
}: {
  planet: PlanetData;
  quality: number;
}) {
  const simpleShaders = useGame((s) => s.simpleShaders);
  const group = useRef<Group>(null),
    [lod, setLod] = useState(16),
    [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    let cancelled = false;
    requestTerrain(planet, lod).then((data) => {
      if (cancelled) return;
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(data.positions, 3));
      g.setAttribute("color", new BufferAttribute(data.colors, 3));
      g.setIndex(new BufferAttribute(data.indices, 1));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      setGeometry(g);
    });
    return () => {
      cancelled = true;
    };
  }, [planet, lod]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({ tint: { value: new Color(planet.color) } }),
    [planet.color],
  );
  const surfaceUniforms = useMemo(
    () => ({
      seed: { value: planet.seed % 1000 },
      ocean: {
        value: planet.type === "Ocean" || planet.type === "Lush" ? 1 : 0,
      },
    }),
    [planet],
  );
  useFrame((_, dt) => {
    if (group.current)
      group.current.position.set(...planet.position).sub(flight.position);
    if (telemetry.target?.id === planet.id) telemetry.lod = lod;
    elapsed.current += dt;
    if (elapsed.current > 0.5) {
      elapsed.current = 0;
      const d =
        flight.position.distanceTo(new Vector3(...planet.position)) /
        planet.radius;
      setLod(d < 1.5 ? quality * 32 : d < 3 ? quality * 16 : d < 7 ? 32 : 16);
    }
  });
  return (
    <group ref={group}>
      {geometry ? (
        <mesh geometry={geometry}>
          {simpleShaders ? (
            <meshStandardMaterial vertexColors roughness={0.9} />
          ) : (
            <shaderMaterial
              vertexColors
              vertexShader={planetVertex}
              fragmentShader={planetFragment}
              uniforms={surfaceUniforms}
            />
          )}
        </mesh>
      ) : (
        <mesh>
          <sphereGeometry args={[planet.radius, 24, 16]} />
          <meshStandardMaterial color={planet.color} />
        </mesh>
      )}
      {!simpleShaders && planet.atmosphere !== "Trace argon" && (
        <mesh scale={1.045}>
          <sphereGeometry args={[planet.radius, 48, 32]} />
          <shaderMaterial
            vertexShader={atmosphereVertex}
            fragmentShader={atmosphereFragment}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
      {planet.rings && (
        <group rotation={[1.12, 0.18, 0.15]}>
          {[1.48, 1.62, 1.76, 1.91, 2.06].map((n, i) => (
            <mesh key={n}>
              <ringGeometry
                args={[planet.radius * n, planet.radius * (n + 0.09), 160]}
              />
              <meshStandardMaterial
                color={i % 2 ? "#92867c" : "#bdb4a6"}
                transparent
                opacity={0.17 + i * 0.05}
                side={DoubleSide}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}
      {planet.anomaly && (
        <group position={[0, planet.radius * 1.1, 0]}>
          <mesh rotation={[0, 0, 0.4]}>
            <octahedronGeometry args={[planet.radius * 0.035]} />
            <meshStandardMaterial
              color="#c4b7e4"
              emissive="#5b3688"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      )}
    </group>
  );
});
