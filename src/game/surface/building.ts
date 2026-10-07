import { Quaternion, Vector3 } from "three";
import { flight } from "../runtime";
import { useGame } from "../../stores/game";
import { surface, touchSurface } from "./state";
import {
  groundPoint,
  radial,
  safeGround,
  surfaceRotation,
  tangentFrame,
} from "./ground";
import { BUILD_COSTS, spend, canAfford } from "./items";
import { surfaceWorld } from "./ecology";
import type { BasePiece, PieceType } from "./types";
export const PIECES: PieceType[] = [
  "foundation",
  "floor",
  "wall",
  "window",
  "door",
  "roof",
  "ramp",
  "light",
  "storage",
  "power",
  "beacon",
];
export const buildState = {
  preview: null as BasePiece | null,
  valid: false,
  reason: "",
  charge: 0,
};
export function updateBuildPreview() {
  if (!surface.building || !surface.planet) {
    buildState.preview = null;
    return;
  }
  const p = surface.planet,
    d = surface.data,
    n = radial(p, flight.position),
    { east, north } = tangentFrame(n);
  const forward = new Vector3(0, 0, -1).applyQuaternion(flight.rotation);
  forward.addScaledVector(n, -forward.dot(n)).normalize();
  const at = flight.position.clone().addScaledVector(forward, 2.5);
  const anchor =
    d.bases.find(
      (b) =>
        b.planetId === p.id &&
        b.type === "foundation" &&
        new Vector3(...b.position).distanceTo(at) < 40,
    )?.position || d.shipPosition;
  const delta = at.clone().sub(new Vector3(...anchor));
  const snapped = new Vector3(...anchor)
    .addScaledVector(east, Math.round(delta.dot(east) / 2) * 2)
    .addScaledVector(north, Math.round(delta.dot(north) / 2) * 2);
  const nn = radial(p, snapped),
    position = groundPoint(p, nn, 0.06),
    rotation = surfaceRotation(nn).multiply(
      new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        (surface.buildRotation * Math.PI) / 2,
      ),
    );
  const type = surface.piece;
  const localForward = new Vector3(0, 0, -1).applyQuaternion(rotation);
  if (["wall", "window", "door"].includes(type))
    position.addScaledVector(localForward, 1).addScaledVector(nn, 0.6);
  if (type === "roof") position.addScaledVector(nn, 1.2);
  if (type === "light") position.addScaledVector(nn, 1.05);
  const id = `base-${p.id}-${d.bases.length}-${Math.floor(d.elapsed * 100)}`;
  buildState.preview = {
    id,
    planetId: p.id,
    type,
    position: position.toArray(),
    rotation: rotation.toArray() as [number, number, number, number],
    ...(type === "beacon"
      ? {
          name:
            "Field beacon " +
            (d.bases.filter((b) => b.type === "beacon").length + 1),
        }
      : {}),
  };
  const overlaps = d.bases.some(
    (b) =>
      b.planetId === p.id &&
      b.type === type &&
      new Vector3(...b.position).distanceTo(position) < 0.35,
  );
  const obstructed = surfaceWorld.entities.some(
    (e) =>
      (e.kind === "mineral" || e.kind === "structure" || e.kind === "ship") &&
      new Vector3(...e.position).distanceTo(position) < e.size + 0.6,
  );
  const ship = position.distanceTo(new Vector3(...d.shipPosition)) < 3;
  buildState.reason =
    d.bases.length >= 120
      ? "Base piece limit reached"
      : !safeGround(p, nn)
        ? "Unsafe terrain"
        : overlaps
          ? "Occupied socket"
          : obstructed
            ? "Natural obstruction · clear the site"
            : ship
              ? "Ship exclusion area"
              : !canAfford(d.inventory, BUILD_COSTS[type])
                ? "Missing materials"
                : "Placement available";
  buildState.valid = buildState.reason === "Placement available";
}
export function placePiece() {
  updateBuildPreview();
  if (!buildState.valid || !buildState.preview)
    return useGame.getState().notify(buildState.reason);
  const d = surface.data,
    piece = buildState.preview;
  if (!spend(d.inventory, BUILD_COSTS[piece.type])) return;
  d.bases.push(structuredClone(piece));
  if (piece.type === "power") d.changes[piece.id + ":charge"] = 60;
  touchSurface();
  useGame.getState().notify(`${piece.type.toUpperCase()} PLACED`);
  useGame.getState().save();
}
export function poweredShelter(position: Vector3, dt = 0) {
  const d = surface.data,
    pid = surface.planet?.id;
  const nearby = d.bases.filter(
    (b) =>
      b.planetId === pid &&
      new Vector3(...b.position).distanceTo(position) < 12,
  );
  let powered = false;
  for (const power of nearby.filter((b) => b.type === "power")) {
    const key = power.id + ":charge";
    d.changes[key] = Math.max(
      0,
      Math.min(
        100,
        (d.changes[key] ?? 60) + dt * (surface.daylight > 0.35 ? 3 : -0.4),
      ),
    );
    if (d.changes[key] > 0) powered = true;
    buildState.charge = d.changes[key];
  }
  if (!powered) return false;
  return nearby
    .filter((b) => b.type === "foundation")
    .some((f) => {
      const center = new Vector3(...f.position),
        local = position
          .clone()
          .sub(center)
          .applyQuaternion(new Quaternion(...f.rotation).invert());
      if (Math.abs(local.x) > 1 || Math.abs(local.z) > 1 || local.y > 1.3)
        return false;
      const roof = nearby.some(
        (b) =>
          b.type === "roof" &&
          new Vector3(...b.position).distanceTo(center) < 1.5,
      );
      const edges = nearby.filter(
        (b) =>
          ["wall", "window", "door"].includes(b.type) &&
          new Vector3(...b.position).distanceTo(center) < 1.5,
      );
      const sides = new Set(
        edges.map((b) => {
          const v = new Vector3(...b.position)
            .sub(center)
            .applyQuaternion(new Quaternion(...f.rotation).invert());
          return Math.abs(v.x) > Math.abs(v.z)
            ? v.x > 0
              ? "east"
              : "west"
            : v.z > 0
              ? "south"
              : "north";
        }),
      );
      return roof && sides.size === 4;
    });
}
export function blockedByBase(position: Vector3) {
  return surface.data.bases.some((b) => {
    if (
      b.planetId !== surface.planet?.id ||
      !["wall", "window", "door", "storage", "power"].includes(b.type)
    )
      return false;
    const local = position
      .clone()
      .sub(new Vector3(...b.position))
      .applyQuaternion(new Quaternion(...b.rotation).invert());
    if (b.type === "door" && Math.abs(local.x) < 0.34) return false;
    return (
      Math.abs(local.x) <
        (b.type === "storage" || b.type === "power" ? 0.4 : 1.04) &&
      Math.abs(local.y) < 0.67 &&
      Math.abs(local.z) < 0.16
    );
  });
}

// The surface controller uses the same radial coordinate as terrain collision.
export function baseFloorRadius(position: Vector3, terrainRadius: number) {
  const p = surface.planet;
  if (!p) return terrainRadius;
  let floor = terrainRadius;
  for (const b of surface.data.bases) {
    if (
      b.planetId !== p.id ||
      !["foundation", "floor", "roof", "ramp"].includes(b.type)
    )
      continue;
    const center = new Vector3(...b.position);
    const local = position
      .clone()
      .sub(center)
      .applyQuaternion(new Quaternion(...b.rotation).invert());
    const top = b.type === "ramp" ? Math.sin(0.3) * local.z + 0.06 : 0.06;
    if (
      Math.abs(local.x) > 1 ||
      Math.abs(local.z) > (b.type === "ramp" ? 1.15 : 1) ||
      local.y < top - 0.05
    )
      continue;
    floor = Math.max(
      floor,
      center.distanceTo(new Vector3(...p.position)) + top,
    );
  }
  return floor;
}
