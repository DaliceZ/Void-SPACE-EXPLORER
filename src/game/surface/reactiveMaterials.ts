import { MeshStandardMaterial, Vector3 } from "three";
export function reactiveUniforms() {
  return {
    uLifeTime: { value: 0 },
    uWind: { value: 0.2 },
    uPlayer: { value: new Vector3() },
    uShip: { value: new Vector3() },
    uEngine: { value: 0 },
    uRadius: { value: 2 },
    uDamageCenter: { value: new Vector3(1e8, 0, 0) },
    uDamageRadius: { value: 0 },
    uDamage: { value: 0 },
  };
}
export function vegetationMaterial(
  material: MeshStandardMaterial,
  uniforms: ReturnType<typeof reactiveUniforms>,
  strength = 1,
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      "uniform float uLifeTime,uWind,uEngine,uRadius;uniform vec3 uPlayer,uShip;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec3 center=instanceMatrix[3].xyz;
  float tip=clamp((position.y+.45)*.7+length(position.xz),0.,1.);
  vec3 away=transpose(mat3(instanceMatrix))*(center-uPlayer);
  float push=1.-smoothstep(.1,uRadius,length(center-uPlayer));
  vec3 jet=transpose(mat3(instanceMatrix))*(center-uShip);
  float exhaust=(1.-smoothstep(0.,8.,length(center-uShip)))*uEngine;
  transformed.xz+=${strength.toFixed(2)}*tip*tip*(vec2(sin(uLifeTime*1.3+center.x*.7),cos(uLifeTime*.9+center.z*.8))*uWind*.035+normalize(away.xz+vec2(.0001))*push*.14+normalize(jet.xz+vec2(.0001))*exhaust*.25);
  #endif`,
    );
  };
  material.customProgramCacheKey = () => `vegetation-${strength}`;
}
export function damageMaterial(
  material: MeshStandardMaterial,
  uniforms: ReturnType<typeof reactiveUniforms>,
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = "varying vec3 vDamagePoint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
  vDamagePoint=position;
  #ifdef USE_INSTANCING
  vDamagePoint=(instanceMatrix*vec4(position,1.)).xyz;
  #endif`,
    );
    shader.fragmentShader =
      "varying vec3 vDamagePoint;uniform vec3 uDamageCenter;uniform float uDamageRadius,uDamage;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
  float zone=1.-smoothstep(uDamageRadius*.7,uDamageRadius,length(vDamagePoint-uDamageCenter));
  float vein=abs(sin(dot(vDamagePoint,vec3(27.,41.,19.))+sin(vDamagePoint.y*61.)*.7));
  float crack=(1.-smoothstep(.025,.045+uDamage*.12,vein))*zone*smoothstep(.15,.8,uDamage);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.015,.01,.008),crack*.9);`,
    );
  };
  material.customProgramCacheKey = () => "mineral-damage";
}
