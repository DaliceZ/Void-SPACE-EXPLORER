# VOID — Space Explorer / Planetfall V2

A playable browser space and surface exploration alpha built with React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei, and Zustand. V2 extends the existing deterministic universe and migrates V1 saves. All geometry, ships and audio are generated in code. No commercial game assets or downloaded fonts are used.

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

### Planetfall controls

Approach a solid planet and press **L** for assisted landing. The landing search checks dry terrain, slope and footprint. Gas giants cannot be landed on. At touchdown, press **E** to exit. Walk back within 60 m of your ship and press **E** to board, then **L** to launch.

| On foot | Action |
| --- | --- |
| WASD / Shift | Walk / sprint |
| Space | Jump; hold while airborne for jetpack thrust |
| Mouse / arrows | Look |
| F | Scan the object in the reticle |
| Hold left mouse | Mine a mineral or harvest flora; click sky first to capture mouse |
| Tab | Suit inventory, ship cargo and crafting |
| J | Searchable discovery journal |
| B / R / E | Build menu / rotate / place |
| E near a site | Recover an archive or inspect a derelict ship |
| M / K | Local map / fleet |

The scanner and extraction controls also have clickable HUD buttons. Surface HUD distances use a gameplay scale of ten metres per world unit; space travel uses a different presentation scale.

### V2 systems

- Seamless assisted descent, landing gear, ship exit/boarding, radial gravity, ground collision, sprint and rechargeable jetpack. A worker-generated local terrain patch samples the original planet height function.
- Seeded nine-chunk surface streaming: minerals, flora, and bounded nearby creature simulation. Temperature, atmosphere, water, gravity and hazards affect the species pool. Barren and volcanic worlds can be sterile. Creatures wander, graze, flee, investigate or glide; nocturnal species appear at night.
- Scanning records unique species and sites, including classification, adaptations and resources. Mining depletes individual deposits persistently. Suit inventory, cargo transfer, atomic crafting recipes, energy cells and a survey upgrade are connected.
- Eleven construction shapes with costs, snapped placement previews and obstruction checks. Foundations, ramps and floors support walking; walls block movement and doorways permit entry. A roof plus four sides and a charged nearby power unit provide shelter. Daylight recharges power; darkness drains it.
- Day/night lighting, seeded weather intensity, weather particles, protection loss and recovery at ship or powered shelter. Suit failure returns the player to their ship while preserving discoveries.
- Resonance archives yield persistent artifacts. Eligible planets can contain rare repairable ships. Repair spends materials; owned vessels can be selected nearby, with actual speed, handling, cargo, scanner and efficiency differences.
- Local map shows ship, discoveries and bases; beacons can be renamed. Journal has categories, search, rarity/planet/system filters, sorting and details. Native system fonts and custom scrollbars.
- Brighter ship materials, navigation lights and throttle-dependent exhaust/camera feedback. Seeded asteroid belts, volumetric point nebulae, comets and ancient debris supplement the original space scene.

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

`save.ts` stores expedition state, inventories, mined-object changes, base pieces, catalogs and owned ships, never generated meshes. Saves remain under `void.expedition.v1`; the payload is version 2. Loading a valid V1 save preserves its seed, position and discoveries; the first overwrite retains an exact `void.expedition.v1.backup`. Saves are local to the browser origin and made every ten simulated seconds, on pause and meaningful actions, and before unload. A new expedition replaces the current save. Storage failure is reported in the UI.

## Verification

```sh
npm run build
npm test
# With the development server running at localhost:5174:
node scripts/smoke.mjs
node scripts/resilience.mjs
node scripts/landing.mjs
node scripts/surface.mjs
```

Browser scripts use Playwright Chromium. If Chromium is absent, run `npx playwright install chromium`. Run them sequentially. They exercise flight, scanning, persistence, settings, journal, pause, mobile guidance, atmosphere entry, collision safety, streaming, corrupt saves, worker fallback, landing, walking, boarding, launch, mining, crafting, construction and ship recovery. Surface tests use authored resource and derelict fixtures to make rare-content transactions reproducible; naturally finding a derelict is not guaranteed at spawn. Screenshots are written into ignored `test-results/`.

Validated in the current workspace: production build, 15 unit tests, all four browser scripts, and V1 backup migration. The surface fixture streamed nine chunks with 77 plants and 12 active creatures. Browser runs reported no JavaScript or console errors. These are functional checks under software WebGL, not hardware performance certification.

## Alpha boundaries

This is a connected V2 alpha, not completion of every feature in the 131-part specification. Globe LOD still rebuilds six cube-sphere faces together; the local walking patch does not implement a complete stitched quadtree. Resolution changes can pop. Orbits are seeded static layouts and day/night lighting is art-directed. Ecological behavior and procedural anatomy are simplified, with bounded local simulation rather than a persistent planet-wide food web. Weather particles share a simple renderer. Flora is low-poly and current building storage pieces are visual structures; inventory transfer currently targets the ship. Construction does not yet support demolition/refunds or automatic multi-storey interiors.

Caves, swimming, aquatic creatures, giant animals, full ship interiors, comprehensive ambient soundscapes, meteor showers, stations, black holes, photo mode and advanced settlement simulation remain future work. Cosmic phenomena are visual 3D entities but are not yet scanner targets. Landings check terrain safety but do not yet reserve a vegetation-free footprint. Render distance remains bounded to 27 sectors. No bloom pass is used.

The F3 overlay reports actual draw calls, triangles, geometry count, and sampled FPS. Browser tests use software WebGL and do not establish a 60 FPS target on physical desktop GPUs. Profile representative hardware before expanding the terrain budget.
