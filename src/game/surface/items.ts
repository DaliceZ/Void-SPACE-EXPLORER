import type { Inventory, ItemId, PieceType } from "./types";
export const ITEMS: Record<
  ItemId,
  {
    name: string;
    category: string;
    rarity: string;
    color: string;
    description: string;
  }
> = {
  veyrite: {
    name: "Veyrite",
    category: "Resources",
    rarity: "Common",
    color: "#a6b5be",
    description: "Load-bearing metallic mineral. Used for base structures.",
  },
  mycel: {
    name: "Mycel fiber",
    category: "Resources",
    rarity: "Common",
    color: "#9daf79",
    description: "Resilient organic filaments from alien flora.",
  },
  silica: {
    name: "Silica",
    category: "Resources",
    rarity: "Common",
    color: "#d3bb92",
    description: "Thermal ceramic feedstock.",
  },
  prism: {
    name: "Prism salt",
    category: "Resources",
    rarity: "Uncommon",
    color: "#b5a3d5",
    description: "Charge-storing crystalline mineral.",
  },
  rime: {
    name: "Rime",
    category: "Resources",
    rarity: "Common",
    color: "#9dcddd",
    description: "Volatile ice from frozen terrain.",
  },
  alloy: {
    name: "Tempered alloy",
    category: "Materials",
    rarity: "Uncommon",
    color: "#d5dacf",
    description: "Refined construction material and repair stock.",
  },
  cell: {
    name: "Energy cell",
    category: "Materials",
    rarity: "Uncommon",
    color: "#bad5a8",
    description: "Restores 60 suit protection. Consume from inventory.",
  },
  module: {
    name: "Survey module",
    category: "Technology",
    rarity: "Rare",
    color: "#d8b994",
    description: "Permanent scanner and mining range upgrade.",
  },
  relic: {
    name: "Echo relic",
    category: "Artifacts",
    rarity: "Exotic",
    color: "#d7b5d9",
    description:
      "An ancient memory lattice recovered from a resonance archive.",
  },
};
export const RECIPES: {
  id: string;
  name: string;
  result: ItemId;
  count: number;
  cost: Inventory;
  requires?: string;
}[] = [
  {
    id: "alloy",
    name: "Temper alloy",
    result: "alloy",
    count: 1,
    cost: { veyrite: 8, silica: 3 },
  },
  {
    id: "cell",
    name: "Assemble energy cell",
    result: "cell",
    count: 1,
    cost: { silica: 3, prism: 2 },
  },
  {
    id: "module",
    name: "Build survey module",
    result: "module",
    count: 1,
    cost: { alloy: 2, prism: 8 },
    requires: "first-scan",
  },
];
export const BUILD_COSTS: Record<PieceType, Inventory> = {
  foundation: { veyrite: 20 },
  floor: { veyrite: 10 },
  wall: { veyrite: 8 },
  window: { veyrite: 5, prism: 3 },
  door: { veyrite: 8, silica: 2 },
  roof: { veyrite: 12 },
  ramp: { veyrite: 8 },
  light: { prism: 2, veyrite: 2 },
  storage: { veyrite: 15 },
  power: { silica: 8, prism: 6 },
  beacon: { veyrite: 8, prism: 2 },
};
export function slots(inv: Inventory) {
  return Object.values(inv).reduce((s, n) => s + Math.ceil((n || 0) / 99), 0);
}
export function canAfford(inv: Inventory, cost: Inventory) {
  return Object.entries(cost).every(([k, n]) => (inv[k as ItemId] || 0) >= n);
}
export function addItem(
  inv: Inventory,
  id: ItemId,
  amount: number,
  capacity = 16,
) {
  const next = { ...inv, [id]: (inv[id] || 0) + amount };
  if (slots(next) > capacity) return false;
  inv[id] = next[id];
  return true;
}
export function spend(inv: Inventory, cost: Inventory) {
  if (!canAfford(inv, cost)) return false;
  for (const [id, n] of Object.entries(cost))
    inv[id as ItemId] = (inv[id as ItemId] || 0) - n;
  return true;
}
