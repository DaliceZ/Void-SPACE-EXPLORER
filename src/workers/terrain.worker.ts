import { buildTerrain } from "../game/terrain";
import {buildSurfacePatch} from '../game/surface/ground';
self.onmessage = (event) => {
  const { id, planet, resolution,center } = event.data;
  const result = center?buildSurfacePatch(planet,center,resolution):buildTerrain(planet, resolution);
  self.postMessage(
    { id, ...result },
    {
      transfer: [
        result.positions.buffer,
        result.colors.buffer,
        result.indices.buffer,
      ],
    },
  );
};
