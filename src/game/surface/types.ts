import type { Vec3 } from '../universe';
export type QuaternionTuple=[number,number,number,number];
export type SurfaceMode='flight'|'landing'|'landed'|'foot';
export type Rarity='Common'|'Uncommon'|'Rare'|'Exotic'|'Anomalous';
export type ItemId='veyrite'|'mycel'|'silica'|'prism'|'rime'|'alloy'|'cell'|'module'|'relic';
export type Inventory=Partial<Record<ItemId,number>>;
export type PieceType='foundation'|'floor'|'wall'|'window'|'door'|'roof'|'ramp'|'light'|'storage'|'power'|'beacon';
export type BasePiece={id:string;planetId:string;type:PieceType;position:Vec3;rotation:QuaternionTuple;name?:string};
export type CatalogEntry={id:string;name:string;category:string;planetId:string;planetName:string;system:string;rarity:Rarity;description:string;position:Vec3;time:number;details:Record<string,string>};
export type ShipData={id:string;seed:number;name:string;className:string;rarity:Rarity;speed:number;handling:number;cargo:number;scanner:number;efficiency:number;paint:string;planetId:string;damaged:boolean};
export type ExpansionSave={mode:SurfaceMode;planetId:string|null;shipPosition:Vec3;shipRotation:QuaternionTuple;health:number;suit:number;jetpack:number;inventory:Inventory;shipCargo:Inventory;changes:Record<string,number>;bases:BasePiece[];catalog:CatalogEntry[];ships:ShipData[];activeShip:string;elapsed:number;upgrades:string[]};
export function initialExpansion():ExpansionSave{return{mode:'flight',planetId:null,shipPosition:[0,0,1900],shipRotation:[0,0,0,1],health:100,suit:100,jetpack:100,inventory:{},shipCargo:{},changes:{},bases:[],catalog:[],ships:[],activeShip:'starter',elapsed:0,upgrades:[]};}
