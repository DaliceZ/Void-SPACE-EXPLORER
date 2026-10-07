import { Vector3,Quaternion } from 'three';
import { initialExpansion,type ExpansionSave } from './types';
import type { Planet } from '../universe';
export const surface={data:initialExpansion(),planet:null as Planet|null,revision:0,landingAvailable:false,landingMessage:'Approach a world to land',landingTarget:new Vector3(),landingStart:new Vector3(),landingRotation:new Quaternion(),landingTime:0,vertical:0,grounded:true,jumpReleased:true,jetDelay:0,scan:0,scanId:'',mining:0,miningId:'',mouseDown:false,building:false,piece:'foundation' as import('./types').PieceType,buildRotation:0,weather:0,weatherName:'Clear',daylight:1,sheltered:false,signal:'',targetId:'',floraCount:0,creatureCount:0,chunkCount:0,patchCenter:new Vector3(),patchRadius:0,throttle:0};
export function touchSurface(){surface.revision++;}
export function restoreExpansion(data?:ExpansionSave){surface.data=data?structuredClone(data):initialExpansion();if(surface.data.mode==='landing')surface.data.mode='flight';surface.planet=null;surface.vertical=0;surface.scan=0;surface.mining=0;surface.mouseDown=false;surface.building=false;surface.patchRadius=0;surface.throttle=0;touchSurface();}
