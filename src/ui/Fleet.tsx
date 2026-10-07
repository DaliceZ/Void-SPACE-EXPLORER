import { useState } from "react";
import { surface } from "../game/surface/state";
import { surfaceWorld } from "../game/surface/ecology";
import {
  STARTER,
  currentShip,
  claimShip,
  selectShip,
} from "../game/surface/fleet";
import { useGame } from "../stores/game";
export function FleetPanel() {
  const [, render] = useState(0),
    current = currentShip(),
    target = surfaceWorld.target?.ship;
  return (
    <>
      <div className="eyebrow">FLIGHT OPERATIONS / FLEET</div>
      <h2>Your spacecraft.</h2>
      <p className="panel-copy">Active vessel · {current.name}</p>
      {target && !surface.data.ships.some((s) => s.id === target.id) && (
        <article className="ship-comparison">
          <div className="eyebrow">RECOVERY SIGNAL / {target.rarity}</div>
          <h3>{target.name}</h3>
          <table>
            <thead>
              <tr>
                <th>System</th>
                <th>Current</th>
                <th>Recovered</th>
              </tr>
            </thead>
            <tbody>
              {(
                ["speed", "handling", "cargo", "scanner", "efficiency"] as const
              ).map((k) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{current[k]}</td>
                  <td>{target[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Repair: 2 tempered alloy + 1 energy cell</p>
          <button
            className="primary"
            onClick={() => {
              claimShip();
              render((n) => n + 1);
            }}
          >
            REPAIR & CLAIM <span>↗</span>
          </button>
        </article>
      )}
      <div className="fleet-list">
        {[STARTER, ...surface.data.ships].map((ship) => (
          <article key={ship.id}>
            <div>
              <span className="eyebrow">
                {ship.className} / {ship.rarity}
              </span>
              <h3>{ship.name}</h3>
              <p>
                {ship.cargo} cargo slots · {Math.round(ship.speed * 100)}% speed
                · {Math.round(ship.scanner * 100)}% scanner
              </p>
            </div>
            <button
              className="hud-button"
              disabled={ship.id === surface.data.activeShip}
              onClick={() => {
                selectShip(ship.id);
                render((n) => n + 1);
              }}
            >
              {ship.id === surface.data.activeShip ? "ACTIVE" : "SELECT"}
            </button>
          </article>
        ))}
      </div>
      <button
        className="text-action"
        onClick={() => useGame.getState().setScreen("flight")}
      >
        RETURN TO EXPEDITION →
      </button>
    </>
  );
}
