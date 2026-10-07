import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
  PointLight,
} from "three";
import {
  feedback,
  createParticlePool,
  stepParticle,
  PARTICLE_LIMIT,
  MATERIALS,
} from "./feedback";
import { flight } from "./runtime";
import { surface } from "./surface/state";
import { useGame } from "../stores/game";
import { feedbackSound, miningAudio } from "./audio";
import { resourceMaterial } from "./feedback";
import { surfaceWorld } from "./surface/ecology";

export function FeedbackEffects() {
  const mesh = useRef<InstancedMesh>(null),
    pulse = useRef<Mesh>(null),
    flash = useRef<PointLight>(null);
  const pool = useMemo(createParticlePool, []),
    cursor = useRef(0),
    object = useMemo(() => new Object3D(), []),
    v = useMemo(() => new Vector3(), []),
    color = useMemo(() => new Color(), []),
    light = useRef(0);
  const reduced = useRef(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = media.matches;
      feedback.reducedMotion = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      miningAudio(0, 0, 0);
    };
  }, []);
  useFrame(({ camera }, delta) => {
    const state = useGame.getState(),
      active = state.screen === "flight",
      dt = active ? Math.min(delta, 0.05) : 0,
      foot = surface.data.mode === "foot";
    feedback.time += dt;
    feedback.pulseAge += dt;
    feedback.noiseAge += dt;
    const budget = state.settings.quality * 112;
    feedback.particleBudget = budget;
    for (let i = budget; i < pool.length; i++) pool[i].age = pool[i].life;
    while (feedback.queue.length) {
      const e = feedback.queue.shift()!,
        profile = MATERIALS[e.material];
      if (active)
        feedbackSound(
          e.source,
          e.source === "scan"
            ? 640
            : e.source === "collect"
              ? 880
              : e.source === "creature"
                ? 330
                : profile.pitch,
          e.force,
          state.settings.volume,
        );
      if (
        e.source === "scan" ||
        e.source === "discovery" ||
        e.source === "boost" ||
        e.source === "jump" ||
        e.source === "creature"
      )
        continue;
      const amount = Math.min(
        42,
        Math.ceil(
          ((e.source === "fracture"
            ? 26
            : e.source === "collect"
              ? 12
              : e.source === "engine"
                ? 10
                : e.source === "landing"
                  ? 18
                  : e.source === "step"
                    ? 4
                    : 5) *
            e.force *
            state.settings.quality) /
            2,
        ),
      );
      for (let j = 0; j < amount; j++) {
        const p = pool[cursor.current++ % budget],
          angle = p.seed * 2.399 + feedback.time * 3,
          speed = (0.2 + (p.seed % 7) * 0.075) * e.force;
        p.position.copy(e.position).addScaledVector(e.normal, 0.025);
        p.origin.copy(e.position);
        p.normal.copy(e.normal);
        v.set(Math.sin(angle), Math.cos(angle * 1.7), Math.cos(angle))
          .addScaledVector(e.normal, 0.7)
          .normalize();
        p.velocity.copy(v).multiplyScalar(speed);
        p.age = 0;
        p.life =
          e.source === "fracture"
            ? 2.2
            : e.source === "collect"
              ? 0.85
              : e.source === "step"
                ? 0.45
                : 1.1;
        p.size =
          e.source === "fracture"
            ? 0.025 + (p.seed % 5) * 0.008
            : e.source === "engine"
              ? 0.06
              : e.source === "step"
                ? 0.012
                : 0.02;
        p.material = e.material;
        p.collect = e.source === "collect";
        p.bounce = e.source === "fracture";
      }
      if (["mining", "fracture"].includes(e.source)) {
        light.current = Math.min(1, e.force);
        flash.current?.position.copy(e.position).sub(flight.position);
        flash.current?.color.set(profile.color);
      }
    }
    let count = 0;
    for (let i = 0; i < budget; i++) {
      const p = pool[i];
      stepParticle(p, dt, flight.position);
      if (p.age >= p.life) continue;
      object.position.copy(p.position).sub(flight.position);
      object.rotation.set(p.age * (p.seed % 5), p.age * 2, p.seed);
      object.scale.setScalar(p.size * Math.min(1, (p.life - p.age) * 3));
      object.updateMatrix();
      mesh.current?.setMatrixAt(count, object.matrix);
      mesh.current?.setColorAt(count, color.set(MATERIALS[p.material].color));
      count++;
    }
    feedback.particles = count;
    if (mesh.current) {
      mesh.current.count = count;
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor)
        mesh.current.instanceColor.needsUpdate = true;
      mesh.current.computeBoundingSphere();
    }
    light.current *= Math.exp(-dt * 10);
    if (flash.current)
      flash.current.intensity = active ? light.current * 0.7 : 0;
    if (pulse.current) {
      pulse.current.visible = foot && feedback.pulseAge < 1.5;
      pulse.current.position.copy(feedback.pulseOrigin).sub(flight.position);
      pulse.current.scale.setScalar(0.2 + feedback.pulseAge * 14);
      (pulse.current.material as MeshBasicMaterial).opacity = Math.max(
        0,
        0.22 * (1 - feedback.pulseAge / 1.5),
      );
    }
    const mining = active && foot && surface.mouseDown && surface.mining > 0;
    feedback.beam +=
      (Number(mining) - feedback.beam) *
      (1 - Math.exp(-dt * (mining ? 24 : 15)));
    miningAudio(
      active ? feedback.beam : 0,
      MATERIALS[resourceMaterial(surfaceWorld.target?.resource)].pitch,
      state.settings.volume,
    );
    if (active && !reduced.current) {
      const bob =
        foot && surface.grounded
          ? Math.sin(feedback.stepPhase * 2) *
            0.0025 *
            Math.min(1, flight.velocity.length() * 2)
          : 0;
      const kick =
        -feedback.kick *
        Math.sin(Math.min(1, feedback.kick * 30) * Math.PI * 0.5);
      v.set(
        mining ? Math.sin(feedback.time * 61) * 0.0005 : 0,
        bob + kick,
        0,
      ).applyQuaternion(camera.quaternion);
      camera.position.add(v);
    }
    feedback.kick *= Math.exp(-dt * 10);
  });
  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, PARTICLE_LIMIT]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshBasicMaterial
          color="#b4dfd5"
          wireframe
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <pointLight ref={flash} distance={3} intensity={0} />
    </>
  );
}
