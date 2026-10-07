import { Vector3 } from "three";
import { flight } from "../runtime";
import { surface } from "./state";
import { surfaceWorld } from "./ecology";
import { collectArtifact } from "./actions";
import { inspectShip } from "./fleet";
import { exitOrBoard } from "./traversal";
export const interaction = { target: "", progress: 0 };
export function getInteraction() {
  const t = surfaceWorld.target,
    d = surface.data;
  if (d.mode === "landed")
    return {
      id: "exit",
      prompt: "E · EXIT SHIP",
      duration: 0,
      interact: exitOrBoard,
    };
  if (
    t?.kind === "structure" &&
    new Vector3(...t.position).distanceTo(flight.position) < 5
  )
    return {
      id: t.id,
      prompt: "HOLD E · ANALYZE ARCHIVE",
      duration: 0.9,
      interact: collectArtifact,
    };
  if (
    t?.kind === "ship" &&
    new Vector3(...t.position).distanceTo(flight.position) < 7
  )
    return {
      id: t.id,
      prompt: "E · INSPECT SPACECRAFT",
      duration: 0,
      interact: inspectShip,
    };
  if (
    d.mode === "foot" &&
    new Vector3(...d.shipPosition).distanceTo(flight.position) < 6
  )
    return {
      id: "board",
      prompt: "E · BOARD SHIP",
      duration: 0,
      interact: exitOrBoard,
    };
  return null;
}
export function pressInteraction() {
  const task = getInteraction();
  if (task?.duration === 0) task.interact();
}
export function updateInteraction(dt: number) {
  const task = getInteraction();
  if (!task || !task.duration || !flight.keys.has("KeyE") || surface.building) {
    interaction.progress = 0;
    interaction.target = "";
    return;
  }
  if (interaction.target !== task.id) {
    interaction.progress = 0;
    interaction.target = task.id;
  }
  interaction.progress += dt / task.duration;
  if (interaction.progress >= 1) {
    task.interact();
    interaction.progress = 0;
    flight.keys.delete("KeyE");
  }
}
