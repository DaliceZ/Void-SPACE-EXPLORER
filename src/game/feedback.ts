import { Vector3 } from "three";
import type { Planet } from "./universe";
import type { ItemId } from "./surface/types";
export type SurfaceMaterial =
  "stone" | "metal" | "crystal" | "ice" | "sand" | "snow" | "grass" | "organic";
export type FeedbackSource =
  | "step"
  | "jump"
  | "landing"
  | "mining"
  | "fracture"
  | "collect"
  | "scan"
  | "discovery"
  | "boost"
  | "collision"
  | "engine"
  | "creature";
export const MATERIALS: Record<
  SurfaceMaterial,
  { color: string; pitch: number; dust: number }
> = {
  stone: { color: "#b4aa90", pitch: 190, dust: 1 },
  metal: { color: "#ffd6a0", pitch: 730, dust: 0.3 },
  crystal: { color: "#a4dce8", pitch: 1050, dust: 0.4 },
  ice: { color: "#cce7ec", pitch: 580, dust: 0.8 },
  sand: { color: "#c5a479", pitch: 120, dust: 1.6 },
  snow: { color: "#e0e8e9", pitch: 150, dust: 1.2 },
  grass: { color: "#98ac78", pitch: 220, dust: 0.5 },
  organic: { color: "#b0bd83", pitch: 280, dust: 0.4 },
};
export function groundMaterial(p?: Planet | null): SurfaceMaterial {
  return p?.type === "Ice"
    ? "snow"
    : p?.type === "Desert"
      ? "sand"
      : p?.type === "Crystal"
        ? "crystal"
        : p?.type === "Lush" || p?.type === "Ocean"
          ? "grass"
          : "stone";
}
export function resourceMaterial(id?: ItemId): SurfaceMaterial {
  return id === "prism"
    ? "crystal"
    : id === "rime"
      ? "ice"
      : id === "mycel"
        ? "organic"
        : id === "veyrite"
          ? "metal"
          : "stone";
}
export type ImpactEvent = {
  position: Vector3;
  normal: Vector3;
  material: SurfaceMaterial;
  source: FeedbackSource;
  force: number;
};
export const feedback = {
  queue: [] as ImpactEvent[],
  counts: {} as Partial<Record<FeedbackSource, number>>,
  time: 0,
  kick: 0,
  stepPhase: 0,
  stepDistance: 0,
  beam: 0,
  miningClock: 0,
  damageStage: 0,
  pulseAge: 99,
  pulseOrigin: new Vector3(),
  noiseAge: 99,
  noisePosition: new Vector3(),
  boost: false,
  particles: 0,
  particleBudget: 160,
  reducedMotion: false,
};
export function impact(
  source: FeedbackSource,
  position: Vector3,
  normal: Vector3,
  material: SurfaceMaterial,
  force = 1,
) {
  if (feedback.queue.length === 64) feedback.queue.shift();
  feedback.queue.push({
    source,
    position: position.clone(),
    normal: normal.clone().normalize(),
    material,
    force: Math.max(0, Math.min(force, 3)),
  });
  feedback.counts[source] = (feedback.counts[source] || 0) + 1;
  if (["mining", "fracture", "engine", "landing"].includes(source)) {
    feedback.noiseAge = 0;
    feedback.noisePosition.copy(position);
  }
  if (source === "landing" || source === "collision")
    feedback.kick = Math.max(feedback.kick, Math.min(0.028, force * 0.012));
  if (source === "boost") feedback.kick = 0.09;
  if (source === "scan") {
    feedback.pulseAge = 0;
    feedback.pulseOrigin.copy(position);
  }
}
export function resetFeedback() {
  feedback.queue.length = 0;
  feedback.kick = 0;
  feedback.stepDistance = 0;
  feedback.beam = 0;
  feedback.pulseAge = 99;
  feedback.noiseAge = 99;
  feedback.damageStage = 0;
  feedback.boost = false;
}
export const vehicleFeedback = { engineClock: 0, heat: 0 };

export const PARTICLE_LIMIT = 384;
export type Particle = {
  position: Vector3;
  velocity: Vector3;
  normal: Vector3;
  origin: Vector3;
  age: number;
  life: number;
  size: number;
  material: SurfaceMaterial;
  collect: boolean;
  bounce: boolean;
  seed: number;
};
export function createParticlePool() {
  return Array.from({ length: PARTICLE_LIMIT }, (_, i): Particle => ({
    position: new Vector3(),
    velocity: new Vector3(),
    normal: new Vector3(0, 1, 0),
    origin: new Vector3(),
    age: 99,
    life: 0,
    size: 0,
    material: "stone",
    collect: false,
    bounce: false,
    seed: i,
  }));
}
export function stepParticle(p: Particle, dt: number, player: Vector3) {
  if (p.age >= p.life) return;
  p.age += dt;
  if (p.collect && p.age > 0.25) {
    const blend = Math.min(1, dt * 9);
    p.velocity.x += ((player.x - p.position.x) * 7 - p.velocity.x) * blend;
    p.velocity.y += ((player.y - p.position.y) * 7 - p.velocity.y) * blend;
    p.velocity.z += ((player.z - p.position.z) * 7 - p.velocity.z) * blend;
  } else p.velocity.addScaledVector(p.normal, -dt * 0.9);
  p.position.addScaledVector(p.velocity, dt);
  const height =
    (p.position.x - p.origin.x) * p.normal.x +
    (p.position.y - p.origin.y) * p.normal.y +
    (p.position.z - p.origin.z) * p.normal.z;
  if (p.bounce && height < 0) {
    p.position.addScaledVector(p.normal, -height);
    const inward = p.velocity.dot(p.normal);
    if (inward < 0) p.velocity.addScaledVector(p.normal, -inward * 1.35);
    p.velocity.multiplyScalar(0.65);
  }
}
