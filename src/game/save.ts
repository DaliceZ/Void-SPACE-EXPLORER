import type { Vec3, Planet } from "./universe";
import {initialExpansion,type ExpansionSave} from './surface/types';
export type Settings = {
  quality: number;
  sensitivity: number;
  invertY: boolean;
  volume: number;
  fov: number;
};
export type Discovery = Pick<
  Planet,
  | "id"
  | "name"
  | "seed"
  | "type"
  | "temperature"
  | "atmosphere"
  | "resource"
  | "hazard"
  | "anomaly"
> & { time: number };
export type Save = {
  version: 1|2;
  expansion?: ExpansionSave;
  seed: string;
  position: Vec3;
  rotation: [number, number, number, number];
  energy: number;
  mode: number;
  discoveries: Discovery[];
  systems: string[];
  settings: Settings;
};
export const defaults: Settings = {
  quality: 2,
  sensitivity: 1,
  invertY: false,
  volume: 0.25,
  fov: 65,
};
export const SAVE_KEY = "void.expedition.v1";
const finiteArray = (v: unknown, n: number): v is number[] =>
  Array.isArray(v) &&
  v.length === n &&
  v.every(
    (x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 1e13,
  );
export function validateSave(v: unknown): v is Save {
  if (!v || typeof v !== "object") return false;
  const s = v as Save;
  return (
    (s.version === 1 || (s.version===2 && validateExpansion(s.expansion))) &&
    typeof s.seed === "string" &&
    s.seed.length > 0 &&
    s.seed.length <= 64 &&
    finiteArray(s.position, 3) &&
    finiteArray(s.rotation, 4) &&
    Math.hypot(...s.rotation) > 0.9 &&
    Math.hypot(...s.rotation) < 1.1 &&
    Number.isFinite(s.energy) &&
    s.energy >= 0 &&
    s.energy <= 100 &&
    [0, 1, 2].includes(s.mode) &&
    Array.isArray(s.discoveries) &&
    s.discoveries.length <= 10000 &&
    s.discoveries.every(
      (d) =>
        d &&
        typeof d.id === "string" &&
        typeof d.name === "string" &&
        typeof d.type === "string" &&
        typeof d.atmosphere === "string" &&
        typeof d.resource === "string" &&
        Number.isFinite(d.temperature) &&
        Number.isFinite(d.hazard) &&
        Number.isFinite(d.seed) &&
        Number.isFinite(d.time),
    ) &&
    Array.isArray(s.systems) &&
    s.systems.every((x) => typeof x === "string") &&
    !!s.settings &&
    [1, 2, 3].includes(s.settings.quality) &&
    s.settings.sensitivity >= 0.2 &&
    s.settings.sensitivity <= 2 &&
    s.settings.fov >= 50 &&
    s.settings.fov <= 90 &&
    s.settings.volume >= 0 &&
    s.settings.volume <= 1 &&
    typeof s.settings.invertY === "boolean"
  );
}
export function loadSave(): Save | null {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return validateSave(v) ? {...v,version:2,expansion:v.expansion||initialExpansion()} : null;
  } catch {
    return null;
  }
}
export function writeSave(save: Save) {
  try {
    const previous=localStorage.getItem(SAVE_KEY);
    if(previous&&!localStorage.getItem('void.expedition.v1.backup')){try{if(JSON.parse(previous).version===1)localStorage.setItem('void.expedition.v1.backup',previous);}catch{/* invalid saves are not migrated */}}
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
function validateExpansion(value:unknown):value is ExpansionSave{if(!value||typeof value!=='object')return false;const d=value as ExpansionSave;const inventory=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>['veyrite','mycel','silica','prism','rime','alloy','cell','module','relic'].includes(k)&&Number.isInteger(n)&&n>=0&&n<=99999);return ['flight','landing','landed','foot'].includes(d.mode)&&(d.planetId===null||typeof d.planetId==='string'&&/^-?\d+:-?\d+:-?\d+\/[0-9]$/.test(d.planetId))&&(d.mode==='flight'||d.planetId!==null)&&finiteArray(d.shipPosition,3)&&finiteArray(d.shipRotation,4)&&[d.health,d.suit,d.jetpack].every(n=>Number.isFinite(n)&&n>=0&&n<=100)&&Number.isFinite(d.elapsed)&&d.elapsed>=0&&inventory(d.inventory)&&inventory(d.shipCargo)&&!!d.changes&&typeof d.changes==='object'&&!Array.isArray(d.changes)&&Object.entries(d.changes).length<=20000&&Object.values(d.changes).every(Number.isFinite)&&Array.isArray(d.bases)&&d.bases.length<=500&&d.bases.every(b=>b&&typeof b.id==='string'&&typeof b.planetId==='string'&&['foundation','floor','wall','window','door','roof','ramp','light','storage','power','beacon'].includes(b.type)&&finiteArray(b.position,3)&&finiteArray(b.rotation,4))&&Array.isArray(d.catalog)&&d.catalog.length<=10000&&d.catalog.every(e=>e&&typeof e.id==='string'&&typeof e.name==='string'&&typeof e.category==='string'&&typeof e.planetId==='string'&&finiteArray(e.position,3)&&typeof e.details==='object')&&Array.isArray(d.ships)&&d.ships.length<=100&&d.ships.every(s=>s&&typeof s.id==='string'&&Number.isFinite(s.seed)&&typeof s.name==='string'&&Number.isFinite(s.speed)&&Number.isFinite(s.handling)&&Number.isFinite(s.cargo))&&typeof d.activeShip==='string'&&Array.isArray(d.upgrades)&&d.upgrades.every(u=>typeof u==='string');}
