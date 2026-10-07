import { useState } from "react";
import { surface } from "../game/surface/state";
import { ITEMS, RECIPES, slots, canAfford } from "../game/surface/items";
import { craft, consume, transfer } from "../game/surface/actions";
import { useGame } from "../stores/game";
import type { ItemId } from "../game/surface/types";
import { currentShip } from "../game/surface/fleet";
export function InventoryPanel() {
  const [tab, setTab] = useState<"suit" | "ship" | "craft">("suit"),
    [, refresh] = useState(0);
  const d = surface.data,
    inv = tab === "ship" ? d.shipCargo : d.inventory;
  const act = (fn: () => void) => {
    fn();
    refresh((v) => v + 1);
  };
  return (
    <>
      <div className="eyebrow">EXOSUIT / LOGISTICS</div>
      <h2>Field inventory.</h2>
      <div className="database-tabs">
        {(["suit", "ship", "craft"] as const).map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t === "craft"
              ? "CRAFTING"
              : t === "ship"
                ? "SHIP CARGO"
                : "EXOSUIT"}
          </button>
        ))}
      </div>
      {tab === "craft" ? (
        <div className="recipe-list">
          {RECIPES.map((r) => (
            <article key={r.id}>
              <div>
                <h3>{r.name}</h3>
                <p>
                  {Object.entries(r.cost)
                    .map(([id, n]) => `${ITEMS[id as ItemId].name} ×${n}`)
                    .join(" / ")}
                </p>
                {r.requires && !d.catalog.length && (
                  <p>Unlock: complete one surface scan</p>
                )}
              </div>
              <button
                className="hud-button"
                disabled={
                  !canAfford(d.inventory, r.cost) ||
                  (!!r.requires && !d.catalog.length)
                }
                onClick={() => act(() => craft(r.id))}
              >
                CRAFT
              </button>
            </article>
          ))}
        </div>
      ) : (
        <>
          <p className="muted">
            {slots(inv)} / {tab === "suit" ? 16 : currentShip().cargo} SLOTS ·
            STACK LIMIT 99
          </p>
          <div className="inventory-grid">
            {Object.entries(inv)
              .filter(([, n]) => n > 0)
              .map(([key, count]) => {
                const id = key as ItemId,
                  item = ITEMS[id];
                return (
                  <article key={id} title={item.description}>
                    <div className="item-symbol" style={{ color: item.color }}>
                      ◇
                    </div>
                    <span className="eyebrow">{item.rarity}</span>
                    <h3>{item.name}</h3>
                    <strong>{count}</strong>
                    <p>{item.category}</p>
                    {tab === "suit" && (id === "cell" || id === "module") && (
                      <button onClick={() => act(() => consume(id))}>
                        {id === "cell" ? "RECHARGE" : "INSTALL"}
                      </button>
                    )}
                    <button
                      onClick={() => act(() => transfer(id, tab === "suit"))}
                    >
                      {tab === "suit" ? "TO SHIP ↗" : "TO SUIT ↙"}
                    </button>
                  </article>
                );
              })}
            {!Object.values(inv).some((n) => n > 0) && (
              <p className="empty-state">
                Your storage is empty. Aim at a mineral deposit and hold the
                mining beam to extract materials.
              </p>
            )}
          </div>
        </>
      )}
      <button
        className="primary"
        onClick={() => useGame.getState().setScreen("flight")}
      >
        RETURN TO EXPEDITION <span>↗</span>
      </button>
    </>
  );
}
