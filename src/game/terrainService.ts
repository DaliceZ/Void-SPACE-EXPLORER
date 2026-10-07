import { buildTerrain } from "./terrain";
import {buildSurfacePatch} from './surface/ground';
import type { Planet } from "./universe";
type Terrain = ReturnType<typeof buildTerrain>;
let worker: Worker | null = null,
  id = 0,
  failed = false;
const pending = new Map<
  number,
  { resolve: (value: Terrain) => void; planet: Planet; resolution: number;center?:[number,number,number] }
>();
export function requestTerrain(
  planet: Planet,
  resolution: number,
  center?:[number,number,number],
): Promise<Terrain> {
  if (failed || typeof Worker === "undefined")
    return Promise.resolve(center?buildSurfacePatch(planet,center,48):buildTerrain(planet, Math.min(resolution, 24)));
  if (!worker) {
    try {
      worker = new Worker(
        new URL("../workers/terrain.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (e) => {
        pending.get(e.data.id)?.resolve(e.data);
        pending.delete(e.data.id);
      };
      worker.onerror = () => {
        failed = true;
        worker?.terminate();
        worker = null;
        for (const job of pending.values())
          job.resolve(job.center?buildSurfacePatch(job.planet,job.center,48):buildTerrain(job.planet, Math.min(job.resolution, 24)));
        pending.clear();
      };
    } catch {
      failed = true;
      return Promise.resolve(center?buildSurfacePatch(planet,center,48):buildTerrain(planet, 24));
    }
  }
  return new Promise((resolve) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, planet, resolution,center });
    worker!.postMessage({ id: requestId, planet, resolution,center });
  });
}
export function pendingTerrainJobs(){return pending.size;}
