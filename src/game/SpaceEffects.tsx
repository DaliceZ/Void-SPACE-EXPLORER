import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  Object3D,
  AdditiveBlending,
  Vector3,
  Mesh,
  ShaderMaterial,
} from "three";
import { flight } from "./runtime";
import { random } from "./universe";
import { useGame } from "../stores/game";
import { telemetry } from "./telemetry";
import { world } from "./Universe";
import { surface } from "./surface/state";
const skyVertex = `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.9999;}`;
const skyFragment = `varying vec3 vP;uniform float air;uniform vec3 up;float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){vec3 p=normalize(vP);float cloud=n(p*5.)*.5+n(p*12.)*.3+n(p*30.)*.15;float band=pow(max(0.,1.-abs(p.y+p.x*.35-.15)),7.);vec3 c=mix(vec3(.005,.009,.018),vec3(.035,.028,.065),cloud*band);float horizon=pow(1.-abs(dot(p,up)),3.);vec3 sky=mix(vec3(.055,.12,.17),vec3(.24,.32,.34),horizon);c=mix(c,sky,air);gl_FragColor=vec4(c,1.);}`;
export function SpaceEffects() {
  const simpleShaders = useGame((s) => s.simpleShaders);
  const rocks = useRef<InstancedMesh>(null),
    sky = useRef<Mesh>(null),
    field = useRef<Group>(null),
    streaks = useRef<Group>(null);
  const skyUniforms = useMemo(
    () => ({ air: { value: 0 }, up: { value: new Vector3(0, 1, 0) } }),
    [],
  );
  const geometry = useMemo(() => {
    const r = random(941),
      a = new Float32Array(260 * 6);
    for (let i = 0; i < 260; i++) {
      const angle = r() * Math.PI * 2,
        rad = 6 + r() * 100,
        z = -r() * 350;
      a.set(
        [
          Math.cos(angle) * rad,
          Math.sin(angle) * rad,
          z,
          Math.cos(angle) * rad,
          Math.sin(angle) * rad,
          z + 2 + r() * 12,
        ],
        i * 6,
      );
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(a, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!rocks.current) return;
    const r = random(841),
      o = new Object3D();
    for (let i = 0; i < 100; i++) {
      o.position.set((r() - 0.5) * 1000, (r() - 0.5) * 160, (r() - 0.5) * 500);
      o.rotation.set(r() * 6, r() * 6, r() * 6);
      o.scale.setScalar(2 + r() * 12);
      o.updateMatrix();
      rocks.current.setMatrixAt(i, o.matrix);
    }
    rocks.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(() => {
    field.current?.position.set(-1500, -800, -1000).sub(flight.position);
    skyUniforms.air.value =
      surface.data.mode !== "flight" &&
      surface.planet?.atmosphere !== "Trace argon"
        ? 0.95
        : telemetry.atmosphere
          ? Math.max(0, 1 - telemetry.altitude / 110)
          : 0;
    if (telemetry.atmosphere) {
      const p = world.planets.find(
        (p) =>
          flight.position.distanceTo(new Vector3(...p.position)) - p.radius <
          110,
      );
      if (p)
        skyUniforms.up.value
          .copy(flight.position)
          .sub(new Vector3(...p.position))
          .normalize();
    }
    if (sky.current && sky.current.material instanceof ShaderMaterial) {
      sky.current.material.uniforms.air.value = skyUniforms.air.value;
      sky.current.material.uniforms.up.value.copy(skyUniforms.up.value);
    }
    if (streaks.current) {
      streaks.current.quaternion.copy(flight.rotation);
      streaks.current.visible =
        useGame.getState().screen === "flight" &&
        flight.velocity.length() > 700;
      streaks.current.scale.z = 1 + flight.velocity.length() / 2500;
    }
  });
  return (
    <>
      <mesh ref={sky} renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[110000, 24, 16]} />
        {simpleShaders ? (
          <meshBasicMaterial color="#040a15" side={BackSide} />
        ) : (
          <shaderMaterial
            side={BackSide}
            depthWrite={false}
            depthTest={false}
            vertexShader={skyVertex}
            fragmentShader={skyFragment}
            uniforms={skyUniforms}
          />
        )}
      </mesh>
      <group ref={field}>
        <instancedMesh ref={rocks} args={[undefined, undefined, 100]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7c7774" roughness={1} />
        </instancedMesh>
      </group>
      <group ref={streaks}>
        <lineSegments geometry={geometry}>
          <lineBasicMaterial
            color="#adcbdc"
            transparent
            opacity={0.24}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      </group>
    </>
  );
}
