import { surface } from "../game/surface/state";
import { flight } from "../game/runtime";
import { useGame } from "../stores/game";
import { beginLanding, exitOrBoard, takeOff } from "../game/surface/traversal";
import { telemetry } from "../game/telemetry";
import { world } from "../game/Universe";
import { surfaceWorld } from "../game/surface/ecology";
import { startSurfaceScan } from "../game/surface/actions";
import { BuildHUD } from "./BuildHUD";
import { getInteraction, interaction } from "../game/surface/interaction";
export function LandingHUD() {
  const mode = surface.data.mode;
  return (
    <div className="landing-prompt">
      <div className="eyebrow">
        {mode === "flight"
          ? "SURFACE NAVIGATION"
          : mode === "landing"
            ? "LANDING SEQUENCE"
            : "ENGINE STATUS / STANDBY"}
      </div>
      <p>
        {mode === "flight"
          ? surface.landingMessage
          : mode === "landing"
            ? `Gear deployed · stabilizing ${Math.round((surface.landingTime / 8) * 100)}%`
            : "Landed on " + surface.planet?.name}
      </p>
      {mode === "landed" ? (
        <>
          <button onClick={exitOrBoard}>E · EXIT SHIP</button>
          <button onClick={takeOff}>L · LAUNCH</button>
        </>
      ) : mode === "flight" && surface.landingAvailable ? (
        <button
          onClick={() => beginLanding(telemetry.target || world.planets[0])}
        >
          L · LANDING ASSIST
        </button>
      ) : null}
    </div>
  );
}
export function SurfaceHUD() {
  const d = surface.data,
    p = surface.planet,
    target = surfaceWorld.target;
  return (
    <>
      <div className="flight-top">
        <span className="eyebrow">
          ON FOOT / {p?.name} / {surface.weatherName}
        </span>
        <button
          className="hud-button"
          onClick={() => useGame.getState().setScreen("pause")}
        >
          ESC · PAUSE
        </button>
      </div>
      <div className="reticle">
        <b>+</b>
      </div>
      {surface.building && <BuildHUD />}
      {!surface.building && target && (
        <div className="surface-target">
          <div className="eyebrow">
            {target.kind.toUpperCase()} / {target.rarity.toUpperCase()}
          </div>
          <h3>{target.name}</h3>
          {surface.scan > 0 ? (
            <>
              <p>
                {surface.scan < 0.4
                  ? "Analyzing signature"
                  : surface.scan < 0.75
                    ? "Classifying environment"
                    : "Recording discovery"}{" "}
                · {Math.round(surface.scan * 100)}%
              </p>
              <progress max={1} value={surface.scan} />
            </>
          ) : (
            <button onClick={startSurfaceScan}>F · SCAN</button>
          )}
          {target.resource && (
            <button
              onPointerDown={() => (surface.mouseDown = true)}
              onPointerUp={() => (surface.mouseDown = false)}
              onPointerLeave={() => (surface.mouseDown = false)}
            >
              HOLD · EXTRACT {Math.round(surface.mining * 100)}%
            </button>
          )}
          {getInteraction() && <p>{getInteraction()?.prompt}</p>}
          {interaction.progress > 0 && (
            <progress max={1} value={interaction.progress} />
          )}
        </div>
      )}
      <div className="hud-left">
        <div className="eyebrow">EXOSUIT / ONLINE</div>
        {[
          ["HEALTH", d.health],
          ["PROTECTION", d.suit],
          ["JETPACK", d.jetpack],
        ].map(([label, value]) => (
          <div className="suit-meter" key={label}>
            {label}
            <span>{Math.round(Number(value))}%</span>
            <i style={{ width: value + "%" }} />
          </div>
        ))}
      </div>
      <div className="hud-right">
        <div className="eyebrow">
          {surfaceWorld.profile?.biome || "PLANETARY CONDITIONS"}
        </div>
        <h3>
          {p?.temperature}°C · {p?.type}
        </h3>
        <p>
          {surfaceWorld.profile?.life} · {surfaceWorld.profile?.biodiversity}%
          biodiversity
        </p>
        <p>
          {surface.sheltered
            ? "Powered shelter · protection restoring"
            : `Hazard ${p?.hazard}/5 · ${Math.round(surface.daylight * 100)}% daylight`}
        </p>
        <p>
          Ship:{" "}
          {Math.round(
            Math.hypot(
              ...d.shipPosition.map(
                (v, i) => v - flight.position.getComponent(i),
              ),
            ) * 10,
          )}{" "}
          m
        </p>
        <button className="hud-button" onClick={exitOrBoard}>
          E · BOARD NEARBY SHIP
        </button>
      </div>
      <div className="flight-bottom">
        <span>
          <kbd>WASD</kbd> WALK <kbd>SPACE</kbd> JETPACK <kbd>F</kbd> SCAN{" "}
          <kbd>TAB</kbd> INVENTORY
        </span>
        <span>
          <kbd>J</kbd> JOURNAL · <kbd>B</kbd> BUILD · <kbd>M</kbd> MAP ·{" "}
          <kbd>K</kbd> FLEET
        </span>
      </div>
    </>
  );
}
