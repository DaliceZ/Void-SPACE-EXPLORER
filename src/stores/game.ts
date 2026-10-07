import { create } from "zustand";
import {
  defaults,
  loadSave,
  writeSave,
  SAVE_KEY,
  type Settings,
  type Discovery,
} from "../game/save";
import { flight } from "../game/runtime";
import { surface, restoreExpansion } from "../game/surface/state";
export type Screen =
  | "menu"
  | "flight"
  | "pause"
  | "settings"
  | "journal"
  | "new"
  | "about"
  | "inventory"
  | "fleet"
  | "map";
const saved = loadSave();
let sessionStarted = false;
type State = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  debug: boolean;
  simpleShaders: boolean;
  setDebug: () => void;
  seed: string;
  settings: Settings;
  configure: (v: Partial<Settings>) => void;
  discoveries: Discovery[];
  systems: string[];
  hasSave: boolean;
  notice: string;
  notify: (text: string) => void;
  start: (seed?: string) => void;
  save: () => void;
  record: (d: Discovery) => void;
  reset: () => void;
};
export const useGame = create<State>((set, get) => ({
  screen: "menu",
  setScreen: (screen) => {
    flight.keys.clear();
    surface.mouseDown = false;
    flight.mouse.x = flight.mouse.y = 0;
    if (screen !== "flight" && document.pointerLockElement)
      document.exitPointerLock();
    set({ screen });
    if (screen === "pause") get().save();
  },
  debug: false,
  simpleShaders: false,
  setDebug: () => set((s) => ({ debug: !s.debug })),
  seed: saved?.seed || "483920183",
  settings: saved?.settings || defaults,
  discoveries: saved?.discoveries || [],
  systems: saved?.systems || [],
  hasSave: !!saved,
  notice: "",
  notify: (notice) => set({ notice }),
  configure: (values) => {
    set((s) => ({ settings: { ...s.settings, ...values } }));
    if (sessionStarted) get().save();
    else {
      const previous = loadSave();
      if (previous) writeSave({ ...previous, settings: get().settings });
    }
  },
  start: (seed) => {
    sessionStarted = true;
    const save = seed ? null : loadSave();
    restoreExpansion(save?.expansion);
    flight.position.fromArray(save?.position || [0, 0, 1900]);
    flight.rotation.fromArray(save?.rotation || [0, 0, 0, 1]).normalize();
    flight.velocity.set(0, 0, 0);
    flight.energy = save?.energy ?? 100;
    flight.mode = save?.mode ?? 1;
    flight.scan = 0;
    flight.scanId = "";
    flight.keys.clear();
    set({
      seed: seed || save?.seed || get().seed,
      discoveries: save?.discoveries || [],
      systems: save?.systems || [],
      screen: "flight",
      hasSave: true,
      notice: "EXPEDITION ONLINE · Click the sky to steer",
    });
    get().save();
  },
  save: () => {
    const s = get();
    if (!s.hasSave || !sessionStarted) return;
    const ok = writeSave({
      version: 2,
      expansion: surface.data,
      seed: s.seed,
      position: flight.position.toArray(),
      rotation: flight.rotation.toArray() as [number, number, number, number],
      energy: flight.energy,
      mode: flight.mode,
      discoveries: s.discoveries,
      systems: s.systems,
      settings: s.settings,
    });
    if (!ok)
      set({ notice: "Storage unavailable. This expedition will not persist." });
  },
  record: (d) => {
    if (get().discoveries.some((x) => x.id === d.id)) return;
    set((s) => ({
      discoveries: [d, ...s.discoveries].slice(0, 10000),
      notice: `DISCOVERY RECORDED · ${d.name}`,
    }));
    get().save();
  },
  reset: () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* storage may be unavailable */
    }
    set({
      hasSave: false,
      discoveries: [],
      systems: [],
      screen: "menu",
      notice: "Expedition save cleared",
    });
  },
}));
