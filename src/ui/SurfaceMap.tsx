import { useState } from "react";
import { Vector3 } from "three";
import { surface, touchSurface } from "../game/surface/state";
import { radial, tangentFrame } from "../game/surface/ground";
import { flight } from "../game/runtime";
import { useGame } from "../stores/game";
export function SurfaceMap() {
  const [zoom, setZoom] = useState(50),
    [, refresh] = useState(0),
    p = surface.planet,
    d = surface.data;
  if (!p)
    return (
      <>
        <h2>Surface map.</h2>
        <p>Land on a world to establish a local survey.</p>
        <button
          className="primary"
          onClick={() => useGame.getState().setScreen("flight")}
        >
          RETURN
        </button>
      </>
    );
  const origin = new Vector3(...d.shipPosition),
    { east, north } = tangentFrame(radial(p, origin)),
    markers = [
      { id: "ship", name: "YOUR SHIP", position: d.shipPosition },
      { id: "you", name: "YOU", position: flight.position.toArray() },
      ...d.bases
        .filter(
          (b) =>
            b.planetId === p.id &&
            (b.type === "beacon" || b.type === "foundation"),
        )
        .map((b) => ({
          id: b.id,
          name: b.name || "BASE",
          position: b.position,
        })),
      ...d.catalog
        .filter(
          (e) =>
            e.planetId === p.id &&
            ["Structures", "Spacecraft", "Minerals"].includes(e.category),
        )
        .map((e) => ({ id: e.id, name: e.name, position: e.position })),
    ];
  return (
    <>
      <div className="eyebrow">LOCAL SURVEY / {p.name}</div>
      <h2>Known terrain.</h2>
      <label className="muted">
        SURVEY RADIUS{" "}
        <select value={zoom} onChange={(e) => setZoom(+e.target.value)}>
          <option value={50}>500 m</option>
          <option value={200}>2 km</option>
        </select>
      </label>
      <svg
        className="surface-map"
        viewBox="0 0 600 400"
        aria-label="Local map of discovered locations"
      >
        <circle cx="300" cy="200" r="175" />
        <circle cx="300" cy="200" r="87" />
        <path d="M300 20V380M120 200H480" />
        <text x="294" y="15">
          N
        </text>
        {markers.map((m) => {
          const delta = new Vector3(...m.position).sub(origin),
            x = 300 + (delta.dot(east) / zoom) * 175,
            y = 200 - (delta.dot(north) / zoom) * 175;
          if (Math.hypot(x - 300, y - 200) > 180) return null;
          return (
            <g key={m.id}>
              <circle
                className={m.id === "you" ? "map-you" : "map-marker"}
                cx={x}
                cy={y}
                r={m.id === "you" ? 4 : 3}
              />
              <text x={x + 8} y={y - 5}>
                {m.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="beacon-list">
        {d.bases
          .filter((b) => b.planetId === p.id && b.type === "beacon")
          .map((b) => (
            <label key={b.id}>
              BEACON
              <input
                maxLength={32}
                value={b.name || ""}
                onChange={(e) => {
                  b.name = e.target.value;
                  touchSurface();
                  refresh((v) => v + 1);
                  useGame.getState().save();
                }}
              />
            </label>
          ))}
      </div>
      <p className="muted">
        Only your ship, placed beacons, bases, and recorded discoveries are
        shown.
      </p>
      <button
        className="primary"
        onClick={() => useGame.getState().setScreen("flight")}
      >
        RETURN TO EXPEDITION <span>↗</span>
      </button>
    </>
  );
}
