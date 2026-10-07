import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Vector3,
  MeshStandardMaterial,
} from "three";
import { surface } from "./state";
import { radial } from "./ground";
import { flight } from "../runtime";
import { requestTerrain } from "../terrainService";
export function SurfaceTerrain() {
  const wet = useMemo(() => ({ value: 0 }), []);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.03,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uWet = wet;
      shader.vertexShader = "varying vec3 vGround;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvGround=position;",
      );
      shader.fragmentShader =
        "varying vec3 vGround;uniform float uWet;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float grain=sin(dot(vGround,vec3(19.,23.,17.)))*sin(dot(vGround,vec3(31.,13.,29.)));
float patch=sin(vGround.x*.8+sin(vGround.z*.6))*sin(vGround.y*.9);
diffuseColor.rgb*=.87+grain*.07+patch*.09-uWet*.10;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor=max(.45,roughnessFactor-uWet*.28);",
      );
    };
    return m;
  }, [wet]);
  useEffect(() => () => material.dispose(), [material]);
  const group = useRef<Group>(null),
    [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const previous = useRef(new Vector3(Infinity, 0, 0)),
    busy = useRef(false),
    alive = useRef(true),
    planetId = useRef(""),
    version = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current++;
      surface.patchRadius = 0;
    };
  }, []);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useFrame(() => {
    const p = surface.planet;
    wet.value = p && ["Ocean", "Lush"].includes(p.type) ? surface.weather : 0;
    const id = surface.data.mode === "flight" ? "" : p?.id || "";
    if (planetId.current !== id) {
      planetId.current = id;
      version.current++;
      busy.current = false;
      previous.current.set(Infinity, 0, 0);
      surface.patchRadius = 0;
      setGeometry(null);
    }
    if (group.current) {
      group.current.visible = !!p && surface.data.mode !== "flight";
      if (p) group.current.position.set(...p.position).sub(flight.position);
    }
    if (!p || surface.data.mode === "flight") {
      surface.patchRadius = 0;
      return;
    }
    const n = radial(p, flight.position);
    if (!busy.current && previous.current.distanceTo(n) > 12 / p.radius) {
      busy.current = true;
      const current = ++version.current;
      requestTerrain(p, 96, n.toArray()).then((data) => {
        if (!alive.current || current !== version.current) return;
        busy.current = false;
        const g = new BufferGeometry();
        g.setAttribute("position", new BufferAttribute(data.positions, 3));
        g.setAttribute("color", new BufferAttribute(data.colors, 3));
        g.setIndex(new BufferAttribute(data.indices, 1));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        setGeometry(g);
        previous.current.copy(n);
        surface.patchCenter.copy(n);
        surface.patchRadius = 42 / p.radius;
      });
    }
  });
  return (
    <group ref={group}>
      {geometry && (
        <mesh geometry={geometry} material={material} receiveShadow />
      )}
    </group>
  );
}
