export const planetVertex = `varying vec3 vP; varying vec3 vN; varying vec3 vColor; void main(){vP=normalize(position);vN=normalize(mat3(modelMatrix)*normal);vColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const planetFragment = `
varying vec3 vP;varying vec3 vN;varying vec3 vColor;uniform float seed;uniform float ocean;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7))+seed)*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.;float a=.5;for(int i=0;i<3;i++){v+=noise(p)*a;p=p*2.07+vec3(1.3,4.7,2.9);a*=.5;}return v;}
void main(){vec3 p=normalize(vP);float detail=fbm(p*110.);vec3 col=vColor*(.65+detail*.7);float cloud=pow(smoothstep(.48,.72,fbm(p*5.+fbm(p*15.)*1.8)),1.6)*ocean;col=mix(col,vec3(.65,.72,.73),cloud*.75);vec3 sun=normalize(vec3(-.8,.5,.75));float day=max(dot(normalize(vN),sun),0.);float light=.035+day*.95;vec3 result=col*light;float spec=pow(max(dot(reflect(-sun,normalize(vN)),normalize(vec3(0.,0.,1.))),0.),35.);result+=vec3(.1,.18,.2)*spec*ocean*(1.-cloud);gl_FragColor=vec4(result,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
