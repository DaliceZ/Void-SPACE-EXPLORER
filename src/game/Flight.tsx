import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { flight, SPEEDS } from "./runtime";
import { useGame } from "../stores/game";
import { world } from "./Universe";
import { telemetry } from "./telemetry";
import { surfaceHeight } from "./terrain";
import { chime, updateAudio } from "./audio";
import { Spacecraft } from "./Spacecraft";
import { surface } from "./surface/state";
import {
  beginLanding,
  takeOff,
  updateLandingStatus,
  updateTraversal,
} from "./surface/traversal";
import { startSurfaceScan } from "./surface/actions";
import { placePiece } from "./surface/building";
import { currentShip } from "./surface/fleet";
import { pressInteraction, updateInteraction } from "./surface/interaction";
import { feedback, impact, groundMaterial, vehicleFeedback } from "./feedback";
import { groundPoint, radial } from "./surface/ground";
const axisX = new Vector3(1, 0, 0),
  axisY = new Vector3(0, 1, 0),
  axisZ = new Vector3(0, 0, 1);
const q = new Quaternion(),
  thrust = new Vector3(),
  offset = new Vector3(),
  relative = new Vector3(),
  forward = new Vector3(),
  normal = new Vector3(),
  projected = new Vector3();
export function Flight() {
  const ship = useRef<Group>(null);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select")) return;
      const s = useGame.getState();
      if (
        e.code === "F3" ||
        ((s.screen === "flight" || s.screen === "journal") &&
          ["Tab", "Space"].includes(e.code))
      )
        e.preventDefault();
      if (e.code === "Escape") {
        if (s.screen === "flight") s.setScreen("pause");
        else if (
          ["pause", "journal", "inventory", "fleet", "map"].includes(s.screen)
        )
          s.setScreen("flight");
        else s.setScreen("menu");
        return;
      }
      if (
        e.code === "Tab" &&
        (s.screen === "flight" ||
          s.screen === "journal" ||
          s.screen === "inventory")
      ) {
        s.setScreen(
          s.screen !== "flight"
            ? "flight"
            : surface.data.mode === "foot"
              ? "inventory"
              : "journal",
        );
        return;
      }
      if (e.code === "F3") s.setDebug();
      if (s.screen !== "flight" || e.repeat) return;
      flight.keys.add(e.code);
      if (e.code === "KeyJ") {
        s.setScreen("journal");
        return;
      }
      if (e.code === "KeyM" && surface.data.mode !== "flight") {
        s.setScreen("map");
        return;
      }
      if (e.code === "KeyK" && surface.data.mode !== "flight") {
        s.setScreen("fleet");
        return;
      }
      if (e.code === "KeyB" && surface.data.mode === "foot") {
        surface.building = !surface.building;
        surface.mouseDown = false;
        return;
      }
      if (e.code === "KeyR" && surface.building) {
        surface.buildRotation = (surface.buildRotation + 1) % 4;
        return;
      }
      if (e.code === "KeyE" && surface.building) {
        placePiece();
        return;
      }
      if (e.code === "KeyL") {
        if (surface.data.mode === "landed") takeOff();
        else if (surface.data.mode === "flight")
          beginLanding(telemetry.target || world.planets[0]);
        return;
      }
      if (e.code === "KeyE" && surface.data.mode !== "flight") {
        pressInteraction();
        return;
      }
      if (e.code === "KeyF" && surface.data.mode === "foot") {
        startSurfaceScan();
        return;
      }
      if (surface.data.mode !== "flight") return;
      if (e.code === "KeyR") flight.mode = (flight.mode + 1) % 3;
      if (e.code === "KeyV") flight.view = (flight.view + 1) % 2;
      if (e.code === "KeyF") {
        if (telemetry.target && telemetry.distance < 14000) {
          flight.scanId = telemetry.target.id;
          flight.scan = 0.001;
        } else
          s.notify("No target in scanner range. Approach within 14,000 km.");
      }
    };
    const up = (e: KeyboardEvent) => flight.keys.delete(e.code);
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        flight.mouse.x += e.movementX;
        flight.mouse.y += e.movementY;
      }
    };
    const blur = () => {
      surface.mouseDown = false;
      flight.keys.clear();
      if (useGame.getState().screen === "flight")
        useGame.getState().setScreen("pause");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    window.addEventListener("blur", blur);
    const mouseUp = () => {
      surface.mouseDown = false;
    };
    window.addEventListener("mouseup", mouseUp);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("blur", blur);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, []);
  useFrame(({ camera, gl }, delta) => {
    const dt = Math.min(delta, 0.05),
      state = useGame.getState(),
      active = state.screen === "flight";
    let altitude = Infinity;
    let nearest = world.planets[0];
    for (const p of world.planets) {
      const distance =
        relative.set(...p.position).distanceTo(flight.position) - p.radius;
      if (distance < altitude) {
        altitude = distance;
        nearest = p;
      }
    }
    telemetry.atmosphere = !!nearest && altitude < nearest.radius * 0.12;
    telemetry.altitude = Math.max(0, altitude);
    updateLandingStatus(nearest);
    if (surface.data.mode !== "flight") {
      if (active) updateInteraction(dt);
      updateTraversal(dt, camera as PerspectiveCamera, active);
      telemetry.fps =
        telemetry.fps * 0.95 + (1 / Math.max(delta, 0.001)) * 0.05;
      telemetry.drawCalls = gl.info.render.calls;
      telemetry.triangles = gl.info.render.triangles;
      telemetry.geometries = gl.info.memory.geometries;
      if (ship.current) {
        ship.current.visible = true;
        ship.current.position.copy(
          surface.data.mode === "foot"
            ? new Vector3(...surface.data.shipPosition).sub(flight.position)
            : new Vector3(),
        );
        ship.current.quaternion.copy(
          surface.data.mode === "foot"
            ? new Quaternion(...surface.data.shipRotation)
            : flight.rotation,
        );
      }
      updateAudio(
        surface.data.mode === "landing" ? 30 : 0,
        state.settings.volume,
        active && surface.data.mode === "landing",
      );
      return;
    }
    if (active) {
      const k = flight.keys;
      const vessel = currentShip();
      surface.data.elapsed += dt;
      flight.rotation.multiply(
        q.setFromAxisAngle(
          axisY,
          -flight.mouse.x * 0.0015 * state.settings.sensitivity,
        ),
      );
      flight.rotation.multiply(
        q.setFromAxisAngle(
          axisX,
          -flight.mouse.y *
            0.0015 *
            state.settings.sensitivity *
            (state.settings.invertY ? -1 : 1),
        ),
      );
      flight.rotation.multiply(
        q.setFromAxisAngle(
          axisY,
          ((k.has("ArrowLeft") ? 1 : 0) - (k.has("ArrowRight") ? 1 : 0)) * dt,
        ),
      );
      flight.rotation.multiply(
        q.setFromAxisAngle(
          axisX,
          ((k.has("ArrowUp") ? 1 : 0) - (k.has("ArrowDown") ? 1 : 0)) * dt,
        ),
      );
      flight.rotation.multiply(
        q.setFromAxisAngle(
          axisZ,
          ((k.has("KeyQ") ? 1 : 0) - (k.has("KeyE") ? 1 : 0)) * dt,
        ),
      );
      thrust.set(
        Number(k.has("KeyD")) - Number(k.has("KeyA")),
        Number(k.has("Space")) - Number(k.has("KeyC")),
        Number(k.has("KeyS")) - Number(k.has("KeyW")),
      );
      const boost =
        k.has("ShiftLeft") && flight.energy > 5 && thrust.lengthSq() > 0;
      if (boost && !feedback.boost)
        impact("boost", flight.position, axisY, "metal", 0.7);
      feedback.boost = boost;
      surface.throttle +=
        (Number(thrust.lengthSq() > 0) * (boost ? 1.8 : 1) - surface.throttle) *
        (1 - Math.exp(-dt * 6));
      const speed = Math.min(
        SPEEDS[flight.mode] * vessel.speed * (boost ? 1.8 : 1),
        Math.max(35, altitude * 0.8),
      );
      flight.energy = Math.max(
        0,
        Math.min(
          100,
          flight.energy + (boost ? -9 / vessel.efficiency : 5) * dt,
        ),
      );
      if (thrust.lengthSq() > 0)
        thrust
          .normalize()
          .multiplyScalar(speed)
          .applyQuaternion(flight.rotation);
      flight.velocity.lerp(
        thrust,
        1 - Math.exp(-dt * (k.has("KeyX") ? 8 : 1.4 * vessel.handling)),
      );
      flight.velocity.clampLength(0, speed);
      if (k.has("KeyX")) flight.velocity.multiplyScalar(Math.exp(-dt * 6));
      flight.position.addScaledVector(flight.velocity, dt);
      for (const p of world.planets) {
        normal.copy(flight.position).sub(relative.set(...p.position));
        const distance = normal.length();
        normal.normalize();
        const surface =
          p.radius * (1 + surfaceHeight(normal.x, normal.y, normal.z, p)) + 8;
        if (distance < surface) {
          flight.position.copy(relative).addScaledVector(normal, surface);
          const inward = flight.velocity.dot(normal);
          if (inward < -4 && feedback.kick < 0.003)
            impact(
              "collision",
              flight.position,
              normal,
              groundMaterial(p),
              Math.min(2, -inward / 30),
            );
          if (inward < 0) flight.velocity.addScaledVector(normal, -inward);
        }
      }
      for (const star of world.systems) {
        normal.copy(flight.position).sub(relative.set(...star.position));
        if (normal.length() < star.radius * 1.2) {
          flight.position
            .copy(relative)
            .addScaledVector(normal.normalize(), star.radius * 1.2);
          flight.velocity.set(0, 0, 0);
          state.notify("Stellar exclusion zone · flight safety engaged");
        }
      }
      flight.time += dt;
      if (flight.time > 10) {
        flight.time = 0;
        state.save();
      }
    } else flight.keys.clear();
    flight.mouse.x = flight.mouse.y = 0;
    camera.quaternion.slerp(flight.rotation, 1 - Math.exp(-dt * 9));
    offset
      .set(
        0,
        flight.view === 0 ? 2 : 0,
        flight.view === 0 ? 9 + surface.throttle * 0.7 : 0,
      )
      .applyQuaternion(flight.rotation);
    camera.position.copy(offset);
    const cam = camera as PerspectiveCamera;
    cam.fov +=
      (state.settings.fov +
        surface.throttle * 2 +
        (flight.mode === 2 && active
          ? Math.min(15, flight.velocity.length() / 200)
          : 0) -
        cam.fov) *
      (1 - Math.exp(-dt * 3));
    cam.updateProjectionMatrix();
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    let best = 0.72;
    telemetry.target = null;
    for (const p of world.planets) {
      relative.set(...p.position).sub(flight.position);
      const distance = relative.length(),
        alignment = relative.dot(forward) / distance;
      const score = alignment + (p.radius / distance) * 0.5;
      if (alignment > 0.72 && score > best) {
        best = score;
        telemetry.target = p;
        telemetry.distance = Math.max(0, distance - p.radius);
      }
    }
    const target = telemetry.target;
    telemetry.targetVisible = false;
    if (target) {
      projected
        .set(...target.position)
        .sub(flight.position)
        .project(camera);
      telemetry.targetX = (projected.x * 0.5 + 0.5) * 100;
      telemetry.targetY = (-projected.y * 0.5 + 0.5) * 100;
      telemetry.targetVisible =
        projected.z < 1 &&
        Math.abs(projected.x) < 0.96 &&
        Math.abs(projected.y) < 0.86;
    }
    if (active && flight.scan > 0) {
      if (
        !target ||
        target.id !== flight.scanId ||
        telemetry.distance > 14000
      ) {
        flight.scan = 0;
        state.notify("Scan interrupted · keep target in view");
      } else {
        flight.scan += (dt * currentShip().scanner) / 4;
        if (flight.scan >= 1) {
          state.record({ ...target, time: Date.now() });
          chime(state.settings.volume);
          flight.scan = 0;
        }
      }
    }
    telemetry.speed = flight.velocity.length();
    if (nearest && active) {
      const n = radial(nearest, flight.position),
        density = Math.max(0, 1 - altitude / (nearest.radius * 0.12)),
        entry = Math.max(0, -flight.velocity.clone().normalize().dot(n));
      vehicleFeedback.heat +=
        (Math.min(
          1,
          density * Math.max(0, (telemetry.speed - 35) / 60) * entry,
        ) -
          vehicleFeedback.heat) *
        (1 - Math.exp(-dt * 3));
      vehicleFeedback.engineClock += dt;
      if (
        altitude < 20 &&
        surface.throttle > 0.1 &&
        vehicleFeedback.engineClock > 0.2
      ) {
        impact(
          "engine",
          groundPoint(nearest, n),
          n,
          groundMaterial(nearest),
          Math.min(1, surface.throttle),
        );
        vehicleFeedback.engineClock = 0;
      }
    }
    telemetry.fps = telemetry.fps * 0.95 + (1 / Math.max(delta, 0.001)) * 0.05;
    telemetry.drawCalls = gl.info.render.calls;
    telemetry.triangles = gl.info.render.triangles;
    telemetry.geometries = gl.info.memory.geometries;
    updateAudio(telemetry.speed, state.settings.volume, active);
    if (active && nearest) {
      const systemId = nearest.id.split("/")[0];
      if (!state.systems.includes(systemId))
        useGame.setState({ systems: [...state.systems, systemId] });
    }
    if (ship.current) {
      ship.current.position.set(0, 0, 0);
      ship.current.quaternion.copy(flight.rotation);
      ship.current.visible = flight.view === 0 && active;
    }
  });
  return (
    <group ref={ship}>
      <Spacecraft />
    </group>
  );
}
