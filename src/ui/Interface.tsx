import { useEffect, useRef, useState } from "react";
import { useGame } from "../stores/game";
import { flight, MODES } from "../game/runtime";
import { telemetry } from "../game/telemetry";
import { sectorAt } from "../game/universe";
import { world } from "../game/Universe";
import { activateAudio } from "../game/audio";
const format = (v: number) =>
  Number.isFinite(v) ? Math.round(v).toLocaleString("en-US") : "—";
export function Interface() {
  const screen = useGame((s) => s.screen),
    setScreen = useGame((s) => s.setScreen),
    hasSave = useGame((s) => s.hasSave),
    start = useGame((s) => s.start),
    notice = useGame((s) => s.notice),
    universeSeed = useGame((s) => s.seed);
  const [seed, setSeed] = useState("483920183"),
    [confirmReset, setConfirmReset] = useState(false);
  const returnTo = useRef<"menu" | "pause">("menu");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (screen !== "flight")
      panel.current?.querySelector<HTMLElement>("button,input")?.focus();
  }, [screen]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useGame.getState().notify(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  const launch = (value?: string) => {
    activateAudio();
    start(value);
  };
  const openSettings = () => {
    returnTo.current = screen === "pause" ? "pause" : "menu";
    setScreen("settings");
  };
  return (
    <div className={`interface ${screen === "flight" ? "in-flight" : ""}`}>
      <header>
        <a
          className="wordmark"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setScreen(
              screen === "flight" || screen === "journal" ? "pause" : "menu",
            );
          }}
          aria-label="VOID menu"
        >
          <span className="orbit-mark">◌</span> VOID{" "}
          <span className="header-divider" /> <small>SPACE EXPLORER</small>
        </a>
        <div className="header-right">
          <span className="status-dot" /> ALL SYSTEMS NOMINAL{" "}
          <span className="version">EXP. 001 / ALPHA</span>
        </div>
      </header>
      {screen === "flight" ? (
        <HUD />
      ) : (
        <div
          className={`menu-content ${screen === "menu" ? "home" : ""}`}
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={screen + " interface"}
          onKeyDown={(e) => {
            if (e.key !== "Tab") return;
            const items = panel.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input,select",
            );
            if (!items?.length) return;
            const first = items[0],
              last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }}
        >
          {screen === "menu" && (
            <>
              <div className="eyebrow">
                <span className="short-line" /> AN EXPEDITION INTO THE UNKNOWN
              </div>
              <h1>
                VOID<span className="title-dot">.</span>
              </h1>
              <div className="subtitle">SPACE EXPLORER</div>
              <p className="intro">
                Beyond the familiar.
                <br />
                Into the infinite.
              </p>
              <div className="menu-actions">
                {hasSave && (
                  <button className="primary" onClick={() => launch()}>
                    CONTINUE EXPEDITION <span>↗</span>
                  </button>
                )}
                <button
                  className={hasSave ? "text-action" : "primary"}
                  onClick={() => setScreen("new")}
                >
                  NEW UNIVERSE <span>↗</span>
                </button>
                <button className="text-action" onClick={openSettings}>
                  <span>SETTINGS</span>
                  <small>02</small>
                </button>
                <button
                  className="text-action"
                  onClick={() => setScreen("about")}
                >
                  <span>ABOUT THE EXPEDITION</span>
                  <small>03</small>
                </button>
              </div>
              <div className="menu-note">
                <span className="tiny-orbit" /> EVERY COORDINATE. A NEW
                POSSIBILITY.
              </div>
            </>
          )}
          {screen === "new" && (
            <>
              <div className="eyebrow">EXPEDITION / INITIALIZE</div>
              <h2>
                A universe
                <br />
                of your own.
              </h2>
              <p className="panel-copy">
                One seed. Uncharted worlds.
                <br />
                The same coordinates will always lead you home.
              </p>
              <label className="field">
                UNIVERSE SEED
                <input
                  maxLength={64}
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Enter a seed"
                />
              </label>
              <button
                className="text-action"
                onClick={() =>
                  setSeed(String(crypto.getRandomValues(new Uint32Array(1))[0]))
                }
              >
                ↻ RANDOM SEED
              </button>
              {hasSave && (
                <p className="muted">
                  Starting replaces your current expedition save.
                </p>
              )}
              <button
                className="primary"
                disabled={!seed.trim()}
                onClick={() => launch(seed.trim())}
              >
                BEGIN EXPEDITION <span>↗</span>
              </button>
              <button className="text-action" onClick={() => setScreen("menu")}>
                ← BACK
              </button>
            </>
          )}
          {screen === "pause" && (
            <>
              <div className="eyebrow">FLIGHT / STANDBY</div>
              <h2>Take a breath.</h2>
              <p className="panel-copy">
                The universe can wait.
                <br />
                Your expedition has been saved locally.
              </p>
              <button className="primary" onClick={() => setScreen("flight")}>
                RESUME FLIGHT <span>↗</span>
              </button>
              <button
                className="text-action"
                onClick={() => setScreen("journal")}
              >
                DISCOVERY JOURNAL <span>↗</span>
              </button>
              <button className="text-action" onClick={openSettings}>
                SETTINGS <span>↗</span>
              </button>
              <button
                className="text-action"
                onClick={() => {
                  useGame.getState().save();
                  setScreen("menu");
                }}
              >
                SAVE & MAIN MENU <span>↗</span>
              </button>
            </>
          )}
          {screen === "settings" && (
            <>
              <div className="eyebrow">SYSTEM / CONFIGURATION</div>
              <h2>Flight settings.</h2>
              <Settings />
              <button
                className="primary"
                onClick={() => setScreen(returnTo.current)}
              >
                DONE <span>↗</span>
              </button>
              {hasSave && (
                <button
                  className="text-action danger"
                  onClick={() => {
                    if (confirmReset) {
                      useGame.getState().reset();
                      setConfirmReset(false);
                    } else setConfirmReset(true);
                  }}
                >
                  {confirmReset
                    ? "CONFIRM RESET — ERASE EXPEDITION"
                    : "RESET EXPEDITION SAVE"}
                </button>
              )}
            </>
          )}
          {screen === "about" && (
            <>
              <div className="eyebrow">THE EXPEDITION / FIELD NOTES</div>
              <h2>
                Leave the
                <br />
                known behind.
              </h2>
              <p className="panel-copy">
                A quiet exploration of a procedural universe. Pilot your ship,
                follow distant lights, and record what you find.
              </p>
              <p className="panel-copy">
                Every world grows from a seed. Space streams around you. Your
                discoveries remain on this device.
              </p>
              <Controls />
              <button className="text-action" onClick={() => setScreen("menu")}>
                ← BACK TO THE VOID
              </button>
            </>
          )}
          {screen === "journal" && <Journal />}
        </div>
      )}
      {screen === "menu" && (
        <div className="world-caption">
          <div className="caption-rule" />
          <span>UNCHARTED TERRITORY</span>
          <h3>Somewhere, beyond.</h3>
          <p>
            SECTOR 000 : 000 : 000 <span>◎</span>
          </p>
        </div>
      )}
      {screen !== "flight" && (
        <footer>
          <span>
            <span className="status-dot" /> PROCEDURAL UNIVERSE <b> / </b> SEED{" "}
            {universeSeed}
          </span>
          <span>
            HEADPHONES RECOMMENDED <b>·</b> KEYBOARD + MOUSE{" "}
            <span className="footer-cross">+</span>
          </span>
        </footer>
      )}
      <div className="notification" role="status" aria-live="polite">
        {notice && (
          <>
            <span className="status-dot" />
            {notice}
          </>
        )}
      </div>
      <div className="mobile-notice">
        <span className="orbit-mark">◌</span>
        <h2>
          The universe
          <br />
          needs a little room.
        </h2>
        <p>
          Open VOID on a desktop or laptop with a keyboard and mouse to begin
          your expedition.
        </p>
      </div>
    </div>
  );
}
function Settings() {
  const settings = useGame((s) => s.settings),
    configure = useGame((s) => s.configure);
  return (
    <div className="settings-fields">
      <label>
        GRAPHICS QUALITY
        <select
          value={settings.quality}
          onChange={(e) => configure({ quality: +e.target.value })}
        >
          <option value={1}>Low</option>
          <option value={2}>Medium</option>
          <option value={3}>High</option>
        </select>
      </label>
      {(
        [
          {
            key: "sensitivity",
            name: "MOUSE SENSITIVITY",
            min: 0.2,
            max: 2,
            step: 0.1,
          },
          { key: "fov", name: "FIELD OF VIEW", min: 50, max: 90, step: 1 },
          { key: "volume", name: "AUDIO VOLUME", min: 0, max: 1, step: 0.05 },
        ] as const
      ).map((v) => (
        <label key={v.key}>
          {v.name}
          <output>{settings[v.key]}</output>
          <input
            type="range"
            min={v.min}
            max={v.max}
            step={v.step}
            value={settings[v.key]}
            onChange={(e) => configure({ [v.key]: +e.target.value })}
          />
        </label>
      ))}
      <label className="checkbox-label">
        INVERT MOUSE Y
        <input
          type="checkbox"
          checked={settings.invertY}
          onChange={(e) => configure({ invertY: e.target.checked })}
        />
      </label>
      <p className="muted">Quality controls terrain detail and star density.</p>
    </div>
  );
}
function Controls() {
  return (
    <div className="controls-grid">
      <span>
        <kbd>W S</kbd> Thrust
      </span>
      <span>
        <kbd>A D</kbd> Strafe
      </span>
      <span>
        <kbd>Q E</kbd> Roll
      </span>
      <span>
        <kbd>SPACE C</kbd> Rise / descend
      </span>
      <span>
        <kbd>SHIFT</kbd> Boost
      </span>
      <span>
        <kbd>R</kbd> Travel mode
      </span>
      <span>
        <kbd>F</kbd> Scan target
      </span>
      <span>
        <kbd>X</kbd> Brake
      </span>
      <span>
        <kbd>V</kbd> Camera
      </span>
      <span>
        <kbd>TAB</kbd> Journal
      </span>
      <span>
        <kbd>↑ ↓ ← →</kbd> Steer
      </span>
      <span>
        <kbd>ESC</kbd> Pause
      </span>
    </div>
  );
}
function Journal() {
  const discoveries = useGame((s) => s.discoveries),
    systems = useGame((s) => s.systems),
    setScreen = useGame((s) => s.setScreen);
  return (
    <>
      <div className="eyebrow">EXPEDITION / ARCHIVE</div>
      <h2>Discovery journal.</h2>
      <p className="panel-copy">
        {discoveries.length.toString().padStart(2, "0")} WORLDS CATALOGUED{" "}
        <span className="muted"> / {systems.length} SYSTEMS VISITED</span>
      </p>
      <div className="discovery-list">
        {discoveries.length ? (
          discoveries.map((d, i) => (
            <article key={d.id}>
              <div className="eyebrow">
                {String(i + 1).padStart(2, "0")} / {d.type.toUpperCase()} WORLD
              </div>
              <h3>{d.name}</h3>
              <dl>
                <div>
                  <dt>Temperature</dt>
                  <dd>{d.temperature}°C</dd>
                </div>
                <div>
                  <dt>Atmosphere</dt>
                  <dd>{d.atmosphere}</dd>
                </div>
                <div>
                  <dt>Resource</dt>
                  <dd>{d.resource}</dd>
                </div>
                <div>
                  <dt>Hazard</dt>
                  <dd>{d.hazard} / 5</dd>
                </div>
                {d.anomaly && (
                  <div>
                    <dt>Rare signature</dt>
                    <dd>Resonant monolith</dd>
                  </div>
                )}
              </dl>
              <small>DISCOVERY ID / {d.seed.toString(16).toUpperCase()}</small>
            </article>
          ))
        ) : (
          <div className="empty-journal">
            <div className="orbit-mark">◎</div>
            <h3>A blank page. An infinite sky.</h3>
            <p>
              Keep a planet in view and press <kbd>F</kbd>.<br />A four-second
              scan records your discovery.
            </p>
          </div>
        )}
      </div>
      <button className="primary" onClick={() => setScreen("flight")}>
        RETURN TO FLIGHT <span>↗</span>
      </button>
    </>
  );
}
function HUD() {
  const [, tick] = useState(0);
  const debug = useGame((s) => s.debug),
    discoveries = useGame((s) => s.discoveries);
  useEffect(() => {
    const id = setInterval(() => tick((n) => (n + 1) % 1000), 100);
    return () => clearInterval(id);
  }, []);
  const t = telemetry,
    target = t.target,
    known = target && discoveries.some((d) => d.id === target.id),
    scan = flight.scan,
    sector = sectorAt(flight.position.toArray());
  return (
    <>
      <div className="flight-top">
        <span className="eyebrow">
          {t.atmosphere ? "ATMOSPHERIC FLIGHT" : "DEEP SPACE"} / SECTOR{" "}
          {sector.join(" : ")}
        </span>
        <button
          className="hud-button"
          onClick={() => useGame.getState().setScreen("pause")}
        >
          ESC <span>PAUSE</span>
        </button>
      </div>
      <div className="reticle">
        <i />
        <i />
        <i />
        <i />
        <b>+</b>
      </div>
      {target && t.targetVisible && (
        <div
          className={`target-marker ${scan ? "scanning" : ""}`}
          style={{ left: t.targetX + "%", top: t.targetY + "%" }}
        >
          <div className="target-bracket" />
          <div className="target-label">
            <span>{known ? target.name : "UNIDENTIFIED WORLD"}</span>
            <small>
              {format(t.distance)} km <b> / </b>{" "}
              {known ? target.type : "F · SCAN"}
            </small>
          </div>
        </div>
      )}
      <div className="hud-left">
        <div className="eyebrow">VELOCITY / KM S⁻¹</div>
        <div className="speed" data-testid="speed">
          {format(t.speed)}
          <small>{MODES[flight.mode]}</small>
        </div>
        <div className="speed-track">
          <i style={{ width: Math.min((t.speed / 6000) * 100, 100) + "%" }} />
        </div>
        <p>
          ALT {format(t.altitude)} km <span> / </span>{" "}
          {flight.view === 0 ? "CHASE CAM" : "FLIGHT CAM"}
        </p>
      </div>
      <div className="hud-right">
        <div className="eyebrow">
          {scan ? "SPECTRAL ANALYSIS" : "SCANNER / STANDBY"}
        </div>
        <h3>
          {scan
            ? scan < 0.33
              ? "Classifying surface"
              : scan < 0.65
                ? "Sampling atmosphere"
                : "Mapping resources"
            : target
              ? known
                ? target.name
                : "Unknown world"
              : "No object targeted"}
        </h3>
        {scan ? (
          <>
            <div className="scan-track">
              <i style={{ width: scan * 100 + "%" }} />
            </div>
            <p>
              {Math.round(scan * 100)}% {scan > 0.33 && target?.type}{" "}
              {scan > 0.65 && `${target?.temperature}°C`}
            </p>
          </>
        ) : (
          <p>
            {target
              ? `${format(t.distance)} km · ETA ${t.speed > 1 ? format(t.distance / t.speed) + " s" : "—"}`
              : "Point the ship toward a planet"}
          </p>
        )}
        <div className="energy">
          SHIP ENERGY <span>{Math.round(flight.energy)}%</span>
          <i style={{ width: flight.energy + "%" }} />
        </div>
      </div>
      <div className="flight-bottom">
        <span>
          <kbd>WASD</kbd> THRUST <kbd>R</kbd> MODE <kbd>F</kbd> SCAN{" "}
          <kbd>X</kbd> BRAKE
        </span>
        <span>
          CLICK SKY TO STEER <b>·</b> <kbd>TAB</kbd> JOURNAL
        </span>
      </div>
      {debug && (
        <pre className="debug">{`FPS ${Math.round(t.fps)} | DRAW ${t.drawCalls}\nTRIANGLES ${format(t.triangles)}\nSECTORS ${world.sectors} | PLANETS ${world.planets.length}\nTERRAIN FACES ${world.planets.length*6} | TARGET LOD ${t.lod}\nGPU GEOMETRIES ${t.geometries}\nXYZ ${flight.position.toArray().map(Math.round).join(" / ")}\nSEED ${useGame.getState().seed}`}</pre>
      )}
    </>
  );
}
