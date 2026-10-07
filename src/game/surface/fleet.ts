import { Vector3 } from "three";
import { surface, touchSurface } from "./state";
import { surfaceWorld } from "./ecology";
import { spend } from "./items";
import { flight } from "../runtime";
import { useGame } from "../../stores/game";
import { catalog } from "./actions";
import type { ShipData } from "./types";
import { radial, surfaceRotation } from "./ground";
export const STARTER: ShipData = {
  id: "starter",
  seed: 0,
  name: "VEIL-01 “Pathfinder”",
  className: "Explorer",
  rarity: "Common",
  speed: 1,
  handling: 1,
  cargo: 48,
  scanner: 1,
  efficiency: 1,
  paint: "#b1bfc5",
  planetId: "",
  damaged: false,
};
export function currentShip() {
  return (
    surface.data.ships.find((s) => s.id === surface.data.activeShip) || STARTER
  );
}
export function inspectShip() {
  const t = surfaceWorld.target;
  if (
    t?.kind === "ship" &&
    new Vector3(...t.position).distanceTo(flight.position) < 7
  ) {
    useGame.getState().setScreen("fleet");
    return true;
  }
  return false;
}
export function claimShip() {
  const t = surfaceWorld.target,
    p = surface.planet,
    d = surface.data;
  if (
    !t?.ship ||
    !p ||
    new Vector3(...t.position).distanceTo(flight.position) > 7
  )
    return;
  if (d.ships.some((s) => s.id === t.ship!.id)) return;
  if (!spend(d.inventory, { alloy: 2, cell: 1 }))
    return useGame
      .getState()
      .notify("Repair requires 2 tempered alloy and 1 energy cell.");
  const ship = { ...t.ship, damaged: false, position: t.position };
  d.ships.push(ship);
  d.changes[t.id] = 2;
  catalog({
    id: ship.id,
    name: ship.name,
    category: "Spacecraft",
    planetId: p.id,
    planetName: p.name,
    system: p.id.split("/")[0],
    rarity: ship.rarity,
    position: t.position,
    time: Date.now(),
    description: "Recovered and repaired. Available in your owned fleet.",
    details: {
      Class: ship.className,
      Speed: `${Math.round(ship.speed * 100)}%`,
      Cargo: `${ship.cargo} slots`,
      Scanner: `${Math.round(ship.scanner * 100)}%`,
    },
  });
  touchSurface();
  useGame.getState().save();
  useGame
    .getState()
    .notify("SPACECRAFT CLAIMED · select it in your fleet to fly");
}
export function selectShip(id: string) {
  const d = surface.data,
    ship = id === "starter" ? STARTER : d.ships.find((s) => s.id === id);
  if (!ship) return;
  const nearOriginal =
    flight.position.distanceTo(new Vector3(...d.shipPosition)) < 8;
  const nearNew =
    ship.position &&
    ship.planetId === surface.planet?.id &&
    flight.position.distanceTo(new Vector3(...ship.position)) < 8;
  if (d.mode !== "landed" && !nearOriginal && !nearNew)
    return useGame
      .getState()
      .notify(
        "Fleet switching requires your landed ship or the recovered craft.",
      );
  if (nearNew && ship.position && surface.planet) {
    d.shipPosition = new Vector3(...ship.position)
      .addScaledVector(
        new Vector3(...ship.position)
          .sub(new Vector3(...surface.planet.position))
          .normalize(),
        0.92,
      )
      .toArray();
    d.shipRotation = surfaceRotation(
      radial(surface.planet, new Vector3(...d.shipPosition)),
    ).toArray();
  }
  d.activeShip = id;
  touchSurface();
  useGame.getState().save();
  useGame.getState().notify(`${ship.name} · ACTIVE SPACECRAFT`);
}
