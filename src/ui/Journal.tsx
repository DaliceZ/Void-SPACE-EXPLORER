import { useMemo, useState } from "react";
import { useGame } from "../stores/game";
import { surface } from "../game/surface/state";
import { planetProfile } from "../game/surface/ecology";
import { resolvePlanet } from "../game/surface/ground";
import type { CatalogEntry } from "../game/surface/types";
export function DiscoveryJournal() {
  const discoveries = useGame((s) => s.discoveries),
    systems = useGame((s) => s.systems),
    seed = useGame((s) => s.seed);
  const [category, setCategory] = useState("All"),
    [search, setSearch] = useState(""),
    [rarity, setRarity] = useState("All"),
    [planet, setPlanet] = useState("All"),
    [system, setSystem] = useState("All"),
    [sort, setSort] = useState("recent"),
    [selected, setSelected] = useState<CatalogEntry | null>(null);
  const entries = useMemo(
    () => [
      ...surface.data.catalog,
      ...discoveries.map((d) => ({
        id: d.id,
        name: d.name,
        category: "Planets",
        planetId: d.id,
        planetName: d.name,
        system: d.id.split("/")[0],
        rarity: "Common" as const,
        description: `${d.type} world. ${d.atmosphere} atmosphere.`,
        position: [0, 0, 0] as [number, number, number],
        time: d.time,
        details: {
          Temperature: `${d.temperature}°C`,
          Atmosphere: d.atmosphere,
          Resource: d.resource,
          Hazard: `${d.hazard}/5`,
          Seed: d.seed.toString(16),
        },
      })),
      ...systems.map((id) => ({
        id: "system:" + id,
        name: "Sector " + id,
        category: "Systems",
        planetId: "",
        planetName: "",
        system: id,
        rarity: "Common" as const,
        description: "Star system visited during this expedition.",
        position: [0, 0, 0] as [number, number, number],
        time: 0,
        details: { Coordinates: id },
      })),
    ],
    [discoveries, systems],
  );
  const filtered = entries
    .filter(
      (e) =>
        (category === "All" || e.category === category) &&
        (rarity === "All" || e.rarity === rarity) &&
        (planet === "All" || e.planetId === planet) &&
        (system === "All" || e.system === system) &&
        `${e.name} ${e.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "rarity"
          ? ["Common", "Uncommon", "Rare", "Exotic", "Anomalous"].indexOf(
              b.rarity,
            ) -
            ["Common", "Uncommon", "Rare", "Exotic", "Anomalous"].indexOf(
              a.rarity,
            )
          : b.time - a.time,
    );
  const planets = Array.from(
    new Map(
      entries.filter((e) => e.planetId).map((e) => [e.planetId, e.planetName]),
    ).entries(),
  );
  const p = planet !== "All" ? resolvePlanet(seed, planet) : surface.planet,
    profile = p ? planetProfile(p) : null;
  return (
    <>
      <div className="eyebrow">EXPEDITION / DISCOVERY ARCHIVE</div>
      <h2>Discovery journal.</h2>
      <p className="panel-copy">
        {entries.length} RECORDS{" "}
        <span className="muted">
          {" "}
          / {systems.length} SYSTEMS / {discoveries.length} WORLDS
        </span>
      </p>
      <div className="database-tabs">
        {[
          "All",
          "Systems",
          "Planets",
          "Flora",
          "Fauna",
          "Minerals",
          "Structures",
          "Artifacts",
          "Spacecraft",
          "Anomalies",
        ].map((c) => (
          <button
            key={c}
            className={category === c ? "selected" : ""}
            onClick={() => {
              setCategory(c);
              setSelected(null);
            }}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="journal-filters">
        <label>
          SEARCH
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, species, classification…"
          />
        </label>
        <label>
          RARITY
          <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
            {["All", "Common", "Uncommon", "Rare", "Exotic", "Anomalous"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          PLANET
          <select value={planet} onChange={(e) => setPlanet(e.target.value)}>
            <option>All</option>
            {planets.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          SYSTEM
          <select value={system} onChange={(e) => setSystem(e.target.value)}>
            <option>All</option>
            {[...new Set(entries.map((e) => e.system))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          SORT
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
          </select>
        </label>
      </div>
      {profile && (
        <div className="catalog-progress">
          {profile.life} · Flora{" "}
          {
            surface.data.catalog.filter(
              (e) =>
                e.planetId === p?.id &&
                e.category === "Flora" &&
                e.rarity !== "Anomalous",
            ).length
          }
          /{profile.flora.filter((s) => s.rarity !== "Anomalous").length} ·
          Fauna{" "}
          {
            surface.data.catalog.filter(
              (e) =>
                e.planetId === p?.id &&
                e.category === "Fauna" &&
                e.rarity !== "Anomalous",
            ).length
          }
          /{profile.fauna.filter((s) => s.rarity !== "Anomalous").length}
        </div>
      )}
      <div
        className="discovery-list"
        tabIndex={0}
        aria-label="Discovery records"
      >
        {selected ? (
          <article>
            <button className="text-action" onClick={() => setSelected(null)}>
              ← ALL RECORDS
            </button>
            <div className="eyebrow">
              {selected.category} / {selected.rarity}
            </div>
            <h3>{selected.name}</h3>
            <p className="panel-copy">{selected.description}</p>
            <dl>
              {Object.entries(selected.details).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div>
                <dt>Planet</dt>
                <dd>{selected.planetName || "Deep space"}</dd>
              </div>
              <div>
                <dt>System</dt>
                <dd>{selected.system}</dd>
              </div>
              {selected.time > 0 && (
                <div>
                  <dt>Recorded</dt>
                  <dd>{new Date(selected.time).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </article>
        ) : filtered.length ? (
          filtered.map((e) => (
            <article className="journal-record" key={e.id}>
              <div className="record-symbol">
                {e.category === "Flora"
                  ? "⌁"
                  : e.category === "Fauna"
                    ? "⋈"
                    : e.category === "Spacecraft"
                      ? "△"
                      : "◉"}
              </div>
              <div>
                <div className="eyebrow">
                  {e.category} / {e.rarity}
                </div>
                <button className="record-name" onClick={() => setSelected(e)}>
                  {e.name}
                </button>
                <p>
                  {e.planetName || "Deep space"} · {e.system}
                </p>
              </div>
              <button
                className="hud-button"
                aria-label={"Inspect " + e.name}
                onClick={() => setSelected(e)}
              >
                ↗
              </button>
            </article>
          ))
        ) : (
          <div className="empty-journal">
            <h3>Your next discovery is out there.</h3>
            <p>
              Scan a world or a surface object with F. Matching discoveries
              appear here.
            </p>
          </div>
        )}
      </div>
      <button
        className="primary"
        onClick={() => useGame.getState().setScreen("flight")}
      >
        RETURN TO FLIGHT <span>↗</span>
      </button>
    </>
  );
}
