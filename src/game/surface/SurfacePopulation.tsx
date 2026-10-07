import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  Group,
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { flight } from "../runtime";
import { surface, touchSurface } from "./state";
import {
  nearbySurfaceEntities,
  planetProfile,
  surfaceWorld,
  type SurfaceEntity,
} from "./ecology";
import {
  groundPoint,
  radial,
  tangentFrame,
  safeGround,
  surfaceRotation,
} from "./ground";
import { useGame } from "../../stores/game";
import { updateTools } from "./actions";
import { Spacecraft } from "../Spacecraft";
import { createDetailAssets } from "./detailAssets";
import {
  reactiveUniforms,
  vegetationMaterial,
  damageMaterial,
} from "./reactiveMaterials";
import { feedback, impact, groundMaterial } from "../feedback";
const MAX_PLANTS = 300,
  MAX_ROCKS = 160,
  MAX_FAUNA = 16;
export function SurfacePopulation() {
  const root = useRef<Group>(null),
    rocks = useRef<InstancedMesh>(null),
    stems = useRef<InstancedMesh>(null),
    crowns = useRef<InstancedMesh>(null),
    fungi = useRef<InstancedMesh>(null),
    bulbs = useRef<InstancedMesh>(null),
    crystals = useRef<InstancedMesh>(null),
    eyes = useRef<InstancedMesh>(null),
    bodies = useRef<InstancedMesh>(null),
    heads = useRef<InstancedMesh>(null),
    legs = useRef<InstancedMesh>(null),
    wings = useRef<InstancedMesh>(null);
  const reactive = useMemo(reactiveUniforms, []);
  const detail = useMemo(() => {
    const a = createDetailAssets();
    vegetationMaterial(a.materials[2].material, reactive);
    vegetationMaterial(a.materials[1].material, reactive, 0.25);
    damageMaterial(a.materials[0].material, reactive);
    return a;
  }, [reactive]);
  useEffect(() => () => detail.dispose(), [detail]);
  const [sites, setSites] = useState<SurfaceEntity[]>([]);
  const elapsed = useRef(0),
    key = useRef(""),
    profilePlanet = useRef(""),
    revision = useRef(-1);
  const o = useMemo(() => new Object3D(), []),
    up = useMemo(() => new Vector3(0, 1, 0), []),
    position = useMemo(() => new Vector3(), []),
    direction = useMemo(() => new Vector3(), []),
    cameraForward = useMemo(() => new Vector3(), []),
    project = useMemo(() => new Vector3(), []);
  useEffect(
    () => () => {
      surfaceWorld.entities = [];
      surfaceWorld.target = null;
      surfaceWorld.creatures.clear();
    },
    [],
  );
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05),
      p = surface.planet,
      enabled = !!p && surface.data.mode !== "flight";
    if (root.current) root.current.visible = enabled;
    if (!enabled || !p) {
      key.current = "";
      surfaceWorld.target = null;
      return;
    }
    root.current?.position.set(...p.position).sub(flight.position);
    reactive.uLifeTime.value = feedback.time;
    reactive.uWind.value = 0.35 + surface.weather * 2.2;
    reactive.uPlayer.value
      .copy(flight.position)
      .sub(new Vector3(...p.position));
    reactive.uShip.value
      .fromArray(
        surface.data.mode === "landing"
          ? flight.position.toArray()
          : surface.data.shipPosition,
      )
      .sub(new Vector3(...p.position));
    reactive.uEngine.value =
      surface.data.mode === "landing" && surface.landingTime > 6 ? 1 : 0;
    reactive.uRadius.value =
      useGame.getState().settings.quality === 1 ? 1.2 : 2.2;
    const miningTarget = surfaceWorld.target;
    reactive.uDamage.value = surface.mining;
    if (miningTarget) {
      reactive.uDamageCenter.value
        .set(...miningTarget.position)
        .sub(new Vector3(...p.position));
      reactive.uDamageRadius.value = miningTarget.size * 2;
    }
    elapsed.current += dt;
    const active = useGame.getState().screen === "flight";
    if (elapsed.current > 0.3) {
      elapsed.current = 0;
      const profile =
        profilePlanet.current === p.id && surfaceWorld.profile
          ? surfaceWorld.profile
          : planetProfile(p);
      profilePlanet.current = p.id;
      surfaceWorld.profile = profile;
      const nearby = nearbySurfaceEntities(p, flight.position, profile);
      if (nearby.key !== key.current || surface.revision !== revision.current) {
        key.current = nearby.key;
        revision.current = surface.revision;
        surfaceWorld.entities = nearby.entities.filter(
          (e) => e.kind === "structure" || !surface.data.changes[e.id],
        );
        surfaceWorld.chunks = nearby.chunks;
        surface.chunkCount = nearby.chunks;
        surfaceWorld.creatures.clear();
        setSites(
          surfaceWorld.entities.filter(
            (e) => e.kind === "structure" || e.kind === "ship",
          ),
        );
        let ci = 0,
          fernCount = 0,
          fungusCount = 0,
          bulbCount = 0;
        let ri = 0,
          fi = 0;
        for (const e of surfaceWorld.entities) {
          const n = new Vector3(...e.normal);
          o.position.set(...e.position).sub(new Vector3(...p.position));
          o.quaternion.setFromUnitVectors(up, n);
          if (e.kind === "mineral" && ri < MAX_ROCKS && rocks.current) {
            o.position.addScaledVector(n, e.size * 0.35);
            o.scale.set(
              e.size,
              e.size * (e.resource === "prism" ? 1.8 : 0.75),
              e.size,
            );
            o.updateMatrix();
            rocks.current.setMatrixAt(ri, o.matrix);
            rocks.current.setColorAt(
              ri,
              new Color(
                e.resource === "prism"
                  ? "#b8a3cf"
                  : e.resource === "silica"
                    ? "#c1ab8a"
                    : "#8d9c9c",
              ),
            );
            ri++;
            if (
              (e.resource === "prism" || e.resource === "rime") &&
              crystals.current
            ) {
              o.updateMatrix();
              crystals.current.setMatrixAt(ci++, o.matrix);
            }
          } else if (
            e.kind === "flora" &&
            fi < MAX_PLANTS &&
            stems.current &&
            crowns.current
          ) {
            o.position.addScaledVector(n, e.size * 0.5);
            o.scale.setScalar(e.size);
            o.updateMatrix();
            stems.current.setMatrixAt(fi, o.matrix);
            o.position.addScaledVector(n, e.size * 0.45);
            o.scale.setScalar(e.size);
            o.updateMatrix();
            const archetype = e.species?.archetype;
            const ref =
              archetype === "Fungal tower"
                ? fungi
                : archetype === "Crown fern"
                  ? crowns
                  : bulbs;
            const index =
              ref === fungi
                ? fungusCount++
                : ref === crowns
                  ? fernCount++
                  : bulbCount++;
            ref.current?.setMatrixAt(index, o.matrix);
            ref.current?.setColorAt(index, new Color(e.species?.color));
            fi++;
          }
        }
        for (const [ref, count] of [
          [rocks, ri],
          [stems, fi],
          [crowns, fernCount],
          [fungi, fungusCount],
          [bulbs, bulbCount],
          [crystals, ci],
        ] as const) {
          if (ref.current) {
            ref.current.count = count;
            ref.current.instanceMatrix.needsUpdate = true;
            if (ref.current.instanceColor)
              ref.current.instanceColor.needsUpdate = true;
            ref.current.computeBoundingSphere();
          }
        }
        surface.floraCount = fi;
        touchSurface();
        revision.current = surface.revision;
      }
    }
    let ai = 0,
      li = 0,
      wi = 0;
    surfaceWorld.creatures.clear();
    for (const e of surfaceWorld.entities) {
      if (e.kind !== "fauna" || !e.species || ai >= MAX_FAUNA) continue;
      const sp = e.species;
      if (sp.activity === "Night" && surface.daylight > 0.4) continue;
      const base = new Vector3(...e.position),
        n = new Vector3(...e.normal),
        { east, north } = tangentFrame(n),
        distance = base.distanceTo(flight.position);
      if (distance > 25) continue;
      const time = surface.data.elapsed,
        phase = e.seed % 100,
        walk = Math.sin(time * 0.22 + phase);
      let state =
        sp.archetype === "Glider"
          ? "GLIDE"
          : distance < 3 && sp.temperament === "Skittish"
            ? "FLEE"
            : distance < 5 && sp.temperament === "Curious"
              ? "INVESTIGATE"
              : walk > 0.65
                ? "GRAZE"
                : "WANDER";
      const alarm =
        feedback.noiseAge < 1.6 && feedback.noisePosition.distanceTo(base) < 9;
      const scanned = surface.scanId === e.id && surface.scan > 0;
      if (alarm || surface.weather > 0.7)
        state = sp.temperament === "Curious" ? "ALERT" : "FLEE";
      else if (scanned)
        state = sp.temperament === "Skittish" ? "FLEE" : "OBSERVE";
      else if (walk < -0.85 && distance > 5) state = "REST";
      const radius = ["GRAZE", "REST", "OBSERVE", "ALERT"].includes(state)
        ? 0.05
        : state === "FLEE"
          ? 2.4
          : 1.2;
      position
        .copy(base)
        .addScaledVector(east, Math.sin(time * 0.18 + phase) * radius)
        .addScaledVector(north, Math.cos(time * 0.13 + phase) * radius);
      if (state === "FLEE") {
        const away = base
          .clone()
          .sub(alarm ? feedback.noisePosition : flight.position);
        away.addScaledVector(n, -away.dot(n)).normalize();
        position.addScaledVector(away, 2);
      }
      const nn = radial(p, position);
      if (!safeGround(p, nn)) nn.copy(n);
      position.copy(
        groundPoint(
          p,
          nn,
          sp.archetype === "Glider"
            ? 4 + Math.sin(time + phase)
            : sp.archetype === "Floater"
              ? 1.2
              : 0,
        ),
      );
      surfaceWorld.creatures.set(e.id, {
        position: position.clone(),
        phase: time,
        state,
      });
      const rel = position.clone().sub(new Vector3(...p.position));
      const heading = east
        .clone()
        .multiplyScalar(Math.cos(time * 0.18 + phase) * 0.18)
        .addScaledVector(north, -Math.sin(time * 0.13 + phase) * 0.13)
        .normalize();
      const bodyUp = surfaceRotation(nn, heading);
      east.set(1, 0, 0).applyQuaternion(bodyUp);
      north.set(0, 0, 1).applyQuaternion(bodyUp);
      o.quaternion.copy(bodyUp);
      o.position.copy(rel).addScaledVector(nn, sp.size * 0.38);
      if (state === "REST") o.position.addScaledVector(nn, -sp.size * 0.1);
      o.scale.set(sp.size * 0.35, sp.size * 0.28, sp.size * 0.62);
      o.updateMatrix();
      bodies.current?.setMatrixAt(ai, o.matrix);
      bodies.current?.setColorAt(ai, new Color(sp.color));
      o.position.addScaledVector(north, -sp.size * 0.65);
      if (state === "GRAZE") o.position.addScaledVector(nn, -sp.size * 0.14);
      if (state === "OBSERVE" || state === "INVESTIGATE" || state === "ALERT")
        o.quaternion.copy(
          surfaceRotation(nn, flight.position.clone().sub(position)),
        );
      o.scale.setScalar(sp.size * 0.22);
      o.updateMatrix();
      heads.current?.setMatrixAt(ai, o.matrix);
      eyes.current?.setMatrixAt(ai, o.matrix);
      o.quaternion.copy(bodyUp);
      if (
        active &&
        distance < 8 &&
        Math.floor((time - dt + phase) / 19) !== Math.floor((time + phase) / 19)
      )
        impact("creature", position, nn, groundMaterial(p), 0.3);
      if (sp.archetype === "Glider") {
        for (const side of [-1, 1]) {
          o.position
            .copy(rel)
            .addScaledVector(east, side * sp.size * 0.7)
            .addScaledVector(nn, 0.2 + Math.sin(time * 3 + phase) * 0.15);
          o.scale.set(sp.size * 0.9, 0.04, sp.size * 0.35);
          o.updateMatrix();
          wings.current?.setMatrixAt(wi++, o.matrix);
        }
      } else if (sp.archetype !== "Floater") {
        for (let l = 0; l < sp.limbs; l++) {
          const side = l % 2 ? 1 : -1;
          const swing =
            state === "GRAZE"
              ? 0
              : Math.sin(time * 4 + l * Math.PI * 0.7 + phase) * 0.12;
          o.position
            .copy(rel)
            .addScaledVector(east, side * sp.size * 0.28)
            .addScaledVector(
              north,
              (Math.floor(l / 2) - (sp.limbs / 2 - 1) / 2) * sp.size * 0.36 +
                swing,
            )
            .addScaledVector(nn, sp.size * 0.25);
          o.scale.set(sp.size * 0.65, sp.size * 0.5, sp.size * 0.65);
          o.updateMatrix();
          legs.current?.setMatrixAt(li++, o.matrix);
        }
      }
      ai++;
    }
    for (const [ref, count] of [
      [bodies, ai],
      [heads, ai],
      [eyes, ai],
      [legs, li],
      [wings, wi],
    ] as const) {
      if (ref.current) {
        ref.current.count = count;
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor)
          ref.current.instanceColor.needsUpdate = true;
        ref.current.computeBoundingSphere();
      }
    }
    surface.creatureCount = ai;
    if (active && surface.data.mode === "foot") {
      cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      let best = -Infinity;
      surfaceWorld.target = null;
      for (const e of surfaceWorld.entities) {
        const at = surfaceWorld.creatures.get(e.id)?.position;
        if (e.kind === "fauna" && !at) continue;
        direction.copy(at || position.set(...e.position)).sub(flight.position);
        const distance = direction.length();
        if (distance > 22 || distance < 0.1) continue;
        const cosine = direction.dot(cameraForward) / distance;
        const score =
          cosine + Math.min(0.2, (e.size / distance) * 0.1) - distance * 0.001;
        if (cosine > 0.94 && score > best) {
          best = score;
          surfaceWorld.target = e;
        }
      }
      const target = surfaceWorld.target;
      if (target) {
        project
          .copy(
            surfaceWorld.creatures.get(target.id)?.position ||
              position.set(...target.position),
          )
          .sub(flight.position)
          .project(camera);
        surface.targetId = target.id;
      } else surface.targetId = "";
      updateTools(dt);
    }
  });
  return (
    <group ref={root}>
      <instancedMesh
        ref={rocks}
        args={[detail.geometries.rock, detail.materials[0].material, MAX_ROCKS]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={crystals}
        args={[detail.geometries.crystal, undefined, MAX_ROCKS]}
        castShadow
      >
        <meshStandardMaterial
          color="#aabacf"
          roughness={0.24}
          metalness={0.35}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={stems}
        args={[
          detail.geometries.trunk,
          detail.materials[1].material,
          MAX_PLANTS,
        ]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={crowns}
        args={[
          detail.geometries.fern,
          detail.materials[2].material,
          MAX_PLANTS,
        ]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={fungi}
        args={[
          detail.geometries.fungus,
          detail.materials[2].material,
          MAX_PLANTS,
        ]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={bulbs}
        args={[
          detail.geometries.bulb,
          detail.materials[2].material,
          MAX_PLANTS,
        ]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={bodies}
        args={[detail.geometries.body, detail.materials[3].material, MAX_FAUNA]}
        castShadow
      />
      <instancedMesh
        ref={heads}
        args={[detail.geometries.head, detail.materials[3].material, MAX_FAUNA]}
        castShadow
      />
      <instancedMesh
        ref={eyes}
        args={[detail.geometries.eyes, undefined, MAX_FAUNA]}
      >
        <meshStandardMaterial
          color="#131b17"
          roughness={0.17}
          metalness={0.2}
        />
      </instancedMesh>
      <instancedMesh
        ref={legs}
        args={[
          detail.geometries.leg,
          detail.materials[3].material,
          MAX_FAUNA * 6,
        ]}
        castShadow
      />
      <instancedMesh
        ref={wings}
        args={[
          detail.geometries.wing,
          detail.materials[2].material,
          MAX_FAUNA * 2,
        ]}
        castShadow
      />
      {sites.map((e) => (
        <group
          key={e.id}
          position={new Vector3(...e.position).sub(
            new Vector3(...(surface.planet?.position || [0, 0, 0])),
          )}
          quaternion={new Quaternion().setFromUnitVectors(
            up,
            new Vector3(...e.normal),
          )}
        >
          {e.kind === "ship" ? (
            <group position={[0, 0.92, 0]}>
              <Spacecraft parked paint={e.ship?.paint} />
            </group>
          ) : (
            <>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[2.2, 2.4, 0.1, 6]} />
                <meshStandardMaterial color="#657476" roughness={0.85} />
              </mesh>
              {[-1.4, 1.4].map((x) => (
                <mesh key={x} position={[x, 1, 0]}>
                  <boxGeometry args={[0.3, 2, 0.5]} />
                  <meshStandardMaterial color="#758080" roughness={0.7} />
                </mesh>
              ))}
              <mesh position={[0, 1.95, 0]}>
                <boxGeometry args={[3.2, 0.25, 0.65]} />
                <meshStandardMaterial color="#858d86" />
              </mesh>
              <mesh position={[0, 0.9, 0]}>
                <octahedronGeometry args={[0.28]} />
                <meshStandardMaterial
                  color="#92c9c2"
                  emissive="#4b919a"
                  emissiveIntensity={1.3}
                />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
