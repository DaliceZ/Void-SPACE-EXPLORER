import { telemetry } from "../game/telemetry";
import { surface } from "../game/surface/state";
import { surfaceWorld } from "../game/surface/ecology";
import { flight } from "../game/runtime";
import { pendingTerrainJobs } from "../game/terrainService";
import { feedback } from "../game/feedback";
import { microStats } from "../game/surface/MicroDetails";
export function SurfaceDebug() {
  const t = telemetry;
  return (
    <pre className="debug">{`FPS ${Math.round(t.fps)} | ${(1000 / t.fps).toFixed(1)} ms\nDRAW ${t.drawCalls} | TRIANGLES ${t.triangles}\nCHUNKS ${surface.chunkCount} | FLORA ${surface.floraCount}\nFAUNA / AI ${surface.creatureCount} | WORKERS ${pendingTerrainJobs()}\nGEOMETRIES ${t.geometries} | SEED ${surface.planet?.seed}\nBIOME ${surfaceWorld.profile?.biome}\nXYZ / ORIGIN ${flight.position
      .toArray()
      .map((v) => v.toFixed(2))
      .join(
        " / ",
      )}\nPARTICLES ${feedback.particles}/${feedback.particleBudget} | MICRO ${microStats.grass + microStats.stones}`}</pre>
  );
}
