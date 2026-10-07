import type { Planet } from "./universe";
export const telemetry = {
  speed: 0,
  target: null as Planet | null,
  distance: 0,
  altitude: 0,
  atmosphere: false,
  fps: 60,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  lod: 0,
  targetX: 50,
  targetY: 50,
  targetVisible: false,
};
