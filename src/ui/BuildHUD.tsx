import { surface } from "../game/surface/state";
import { buildState, PIECES, placePiece } from "../game/surface/building";
import { BUILD_COSTS, ITEMS } from "../game/surface/items";
import type { ItemId } from "../game/surface/types";
export function BuildHUD() {
  return (
    <div className="build-hud">
      <div className="eyebrow">FABRICATION / SNAP GRID</div>
      <div className="build-pieces">
        {PIECES.map((type) => (
          <button
            className={surface.piece === type ? "selected" : ""}
            key={type}
            onClick={() => (surface.piece = type)}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>
      <p>
        {Object.entries(BUILD_COSTS[surface.piece])
          .map(([id, n]) => `${ITEMS[id as ItemId].name} ×${n}`)
          .join(" / ")}
      </p>
      <p className={buildState.valid ? "valid" : "invalid"}>
        {buildState.reason} · Rotation {surface.buildRotation * 90}°
      </p>
      <button disabled={!buildState.valid} onClick={placePiece}>
        E · PLACE
      </button>
      <button
        onClick={() =>
          (surface.buildRotation = (surface.buildRotation + 1) % 4)
        }
      >
        R · ROTATE
      </button>
      <button onClick={() => (surface.building = false)}>B · CLOSE</button>
    </div>
  );
}
