import {useEffect,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferAttribute,BufferGeometry,Group,Vector3} from 'three';
import {surface} from './state';
import {radial} from './ground';
import {flight} from '../runtime';
import {requestTerrain} from '../terrainService';
export function SurfaceTerrain(){const group=useRef<Group>(null),[geometry,setGeometry]=useState<BufferGeometry|null>(null);const previous=useRef(new Vector3(Infinity,0,0)),busy=useRef(false),alive=useRef(true),version=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;version.current++;surface.patchRadius=0;};},[]);useEffect(()=>()=>geometry?.dispose(),[geometry]);
 useFrame(()=>{const p=surface.planet;if(group.current){group.current.visible=!!p&&surface.data.mode!=='flight';if(p)group.current.position.set(...p.position).sub(flight.position);}if(!p||surface.data.mode==='flight'){surface.patchRadius=0;return;}const n=radial(p,flight.position);if(!busy.current&&previous.current.distanceTo(n)>12/p.radius){busy.current=true;const current=++version.current;requestTerrain(p,96,n.toArray()).then(data=>{busy.current=false;if(!alive.current||current!==version.current)return;const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(data.positions,3));g.setAttribute('color',new BufferAttribute(data.colors,3));g.setIndex(new BufferAttribute(data.indices,1));g.computeVertexNormals();g.computeBoundingSphere();setGeometry(g);previous.current.copy(n);surface.patchCenter.copy(n);surface.patchRadius=42/p.radius;});}});
 return <group ref={group}>{geometry&&<mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={.94} metalness={.03} polygonOffset polygonOffsetFactor={-3}/></mesh>}</group>;
}
