import { Quaternion, Vector3 } from "three";
export const flight = {
  position: new Vector3(0, 0, 1900),
  velocity: new Vector3(),
  rotation: new Quaternion(),
  keys: new Set<string>(),
  mouse: { x: 0, y: 0 },
  mode: 1,
  view: 0,
  energy: 100,
  scan: 0,
  scanId: "",
  time: 0,
};
export const MODES = ["PRECISION", "CRUISE", "PULSE"] as const;
export const SPEEDS = [65, 480, 6000];
