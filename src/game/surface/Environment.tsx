import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DirectionalLight, FogExp2, HemisphereLight, Vector3 } from "three";
import { surface, touchSurface } from "./state";
import { surfaceWorld, planetProfile } from "./ecology";
import { flight } from "../runtime";
import { useGame } from "../../stores/game";
import { radial, groundPoint, EYE_HEIGHT, surfaceRotation } from "./ground";
import { poweredShelter } from "./building";
export const environment = { sun: new Vector3(-0.8, 0.5, 0.75).normalize() };
export function Environment() {
  const sun = useRef<DirectionalLight>(null),
    fill = useRef<HemisphereLight>(null),
    fog = useMemo(() => new FogExp2("#253b3f", 0.009), []);
  useFrame(({ scene }, delta) => {
    const dt = Math.min(delta, 0.05),
      p = surface.planet,
      d = surface.data,
      active = useGame.getState().screen === "flight",
      onSurface = !!p && d.mode !== "flight";
    if (onSurface && p) {
      const profile = surfaceWorld.profile || planetProfile(p),
        phase = (d.elapsed / profile.cycle) * Math.PI * 2;
      environment.sun
        .set(Math.cos(phase) * -0.8, 0.5, Math.sin(phase) * 0.8 + 0.75)
        .normalize();
      const n = radial(p, flight.position);
      surface.daylight = Math.max(0.04, n.dot(environment.sun) * 0.6 + 0.4);
      const weatherPhase = d.elapsed / 75 + (p.seed % 30);
      const target = Math.max(0, (Math.sin(weatherPhase) - 0.55) / 0.45);
      surface.weather += (target - surface.weather) * Math.min(1, dt * 0.2);
      surface.weatherName =
        surface.weather > 0.35
          ? profile.weather
          : surface.weather > 0.08
            ? "Weather shifting"
            : "Clear";
      fog.density = 0.003 + surface.weather * 0.025;
      scene.fog = fog;
      if (fill.current) {
        fill.current.position.copy(n);
        fill.current.intensity = 0.55 + surface.daylight * 0.35;
      }
      if (sun.current) {
        sun.current.position.copy(environment.sun).multiplyScalar(100);
        sun.current.intensity = 1.1 + surface.daylight * 1.7;
      }
      surface.sheltered = poweredShelter(flight.position, active ? dt : 0);
      if (active && d.mode === "foot") {
        const nearShip =
          flight.position.distanceTo(new Vector3(...d.shipPosition)) < 5;
        const hostile =
          (Math.abs(p.temperature - 20) / 110 +
            p.hazard * 0.1 +
            surface.weather * 0.7) *
          0.16;
        d.suit = Math.max(
          0,
          Math.min(
            100,
            d.suit + dt * (nearShip || surface.sheltered ? 8 : -hostile),
          ),
        );
        if (d.suit <= 0) d.health = Math.max(0, d.health - dt * 2);
        else if (nearShip || surface.sheltered)
          d.health = Math.min(100, d.health + dt * 4);
        if (d.health <= 0) {
          const ship = new Vector3(...d.shipPosition),
            right = new Vector3(1, 0, 0).applyQuaternion(flight.rotation),
            n = radial(p, ship.addScaledVector(right, 3.4));
          flight.position.copy(groundPoint(p, n, EYE_HEIGHT));
          flight.rotation.copy(surfaceRotation(n));
          flight.velocity.set(0, 0, 0);
          d.health = 100;
          d.suit = 75;
          surface.vertical = 0;
          touchSurface();
          useGame
            .getState()
            .notify("SUIT RECOVERY · returned to ship · discoveries retained");
          useGame.getState().save();
        }
      } else if (active && d.mode === "landed") {
        d.suit = Math.min(100, d.suit + dt * 8);
        d.health = Math.min(100, d.health + dt * 4);
      }
    } else {
      scene.fog = null;
      surface.weather = 0;
      surface.weatherName = "Clear";
      if (fill.current) fill.current.intensity = 0.24;
      if (sun.current) {
        sun.current.intensity = 2.6;
        sun.current.position.set(-5000, 2500, 5000);
      }
    }
  });
  return (
    <>
      <directionalLight
        ref={sun}
        position={[-5000, 2500, 5000]}
        intensity={2.6}
        color="#fff0dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-far={250}
        shadow-bias={-0.0005}
      />
      <hemisphereLight ref={fill} args={["#bbd8e0", "#45504b", 0.28]} />
    </>
  );
}
