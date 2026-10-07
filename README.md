# VOID — Space Explorer

A playable browser space exploration alpha built with React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei, and Zustand. All world geometry, surface detail, stars, ship, and audio are generated in code. No commercial game assets are used.

## Run

Use Node.js 22.12 or newer (an `.nvmrc` is included).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. It normally uses port 5173 and chooses the next free port if necessary. The current workspace session is running at **http://localhost:5174**.

Choose **New Universe**, enter or randomize a seed, and begin. Click the sky to capture the mouse. Arrow keys provide steering without mouse capture. Keep the first planet in view and press F to record a discovery. Press R to switch travel speed. Flight safety reduces speed near a surface; fly away from a planet to reach full pulse speed.

| Input | Action |
| --- | --- |
| W / S | Forward / reverse thrust |
| A / D | Strafe |
| Mouse / arrow keys | Pitch and yaw |
| Q / E | Roll |
| Space / C | Rise / descend |
| Shift | Boost; consumes regenerating ship energy |
| R | Precision → cruise → pulse |
| X | Brake |
| F | Start a four-second scan; keep target in view |
| V | Chase / first-person camera |
| Tab | Discovery journal |
| Esc | Pause / resume |
| F3 | Performance and streaming diagnostics |

## Implemented vertical slice

- Inertial six-axis flight, smooth camera rotation/FOV, energy, safety limits, and terrain collision.
- Deterministic 3D sectors with a bounded 3×3×3 neighborhood. Star metadata is inexpensive; planet metadata and meshes are generated only within system range and unloaded after leaving.
- Eight planet classes; seeded names, orbits, resources, climate, hazards, rings, and rare monolith signatures.
- Six-face cube-sphere terrain with distance-based resolution, domain-warped continents, ridged mountains, detail noise, latitude and moisture coloring.
- Terrain generation in a transferable-buffer Web Worker, with a reduced-resolution synchronous fallback.
- Procedural surface/cloud shaders, atmospheric limb glow and a fading local sky, star corona sprites, layered stars/nebula, instanced asteroids, and pulse streaks.
- Projected targeting, progressive scans, discovery journal, local versioned saves, validation, and save recovery.
- Quality, sensitivity, inversion, FOV, and volume settings; desktop controls and mobile guidance.
- Synthesized engine audio and discovery tones, without downloaded audio assets.

## Architecture

`src/game/universe.ts` contains pure seed/sector/system generation. `Universe.tsx` owns the current streamed neighborhood. The simulation's global position stays in JavaScript double precision; every visible object's global center is subtracted from the ship position before reaching the GPU. The ship and camera remain close to the render origin.

`Flight.tsx` updates mutable simulation and telemetry rather than React state each frame. HUD sampling is limited to 10 Hz. `Planet.tsx` requests new terrain only when LOD changes; old geometries are explicitly disposed. Asteroids use one instanced draw, and pulse particles reuse a fixed buffer. Terrain buffers and discovery/save schemas are independently tested.

`save.ts` stores only the current expedition state and discovery metadata, never generated meshes. Saves are local to the browser origin and made every ten simulated seconds, on pause, on discovery, and before unload. A new expedition replaces the previous save. Storage failure is reported in the UI.

## Verification

```sh
npm run build
npm test
# With the development server running at localhost:5174:
node scripts/smoke.mjs
node scripts/resilience.mjs
```

Browser scripts use Playwright Chromium. If Chromium is absent, run `npx playwright install chromium`. They exercise flight, scanning, persistence, settings, journal, pause, mobile guidance, atmosphere entry, collision safety, streaming, corrupt saves, and worker fallback. Screenshots are written into ignored `test-results/`.

## Alpha boundaries

This is the first playable vertical slice, not completion of the full eight-phase roadmap. Planet LOD currently rebuilds six cube-sphere faces together, with up to 96 subdivisions per face on High. It is not yet a per-face quadtree with local terrain tiles or stitched/morphed LOD boundaries; resolution changes can pop. Surface flight is supported, but there is no landing or walking. Orbits are seeded static layouts. Lighting uses a shared art-directed sun vector, rather than a separate physical light for every system. Rare content currently consists of monolith signatures; moons, stations, black holes, and more varied points of interest are future work. Render distance is fixed at 27 sectors; no bloom pass is used.

The F3 overlay reports actual draw calls, triangles, geometry count, and sampled FPS. Browser tests use software WebGL and do not establish a 60 FPS target on physical desktop GPUs. Profile representative hardware before expanding the terrain budget.
