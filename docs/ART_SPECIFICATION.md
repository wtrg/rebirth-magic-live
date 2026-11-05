# Measured prototype art specification

Status: Codex specification of the implemented prototype, pending Gemini art direction and Leader review. No Gemini report or approval has been received. These are original procedural meshes, not images standing in for models. This document describes current assets and the contract for a future replacement; it does not approve production art.

## Source, units and proportions

The self-contained [raid.glb](../public/models/raid.glb) is generated from [models.ts](../apps/game/models.ts). [manifest.json](../assets/manifest.json) records its SHA-256, byte length, measured bounds, geometry/material counts, articulation tags and animation tracks. Reproduce with `node scripts/export-models.ts` and `node scripts/inspect-models.ts`. Measurements use the committed GLB, meters, +Y up and +Z actor forward. Bounds include accessories in the exported rest pose, before arena placement and the boss's 2.05 scale. Pet rotation is included. Bounds are not anatomical height or animated motion envelopes.

| Template | Bounds X × Y × Z (m) | Mesh occurrences | Triangles |
| --- | --- | ---: | ---: |
| Varkhazar | 2.493452 × 2.570046 × 0.900000 | 20 | 268 |
| Fire | 1.713477 × 2.365000 × 0.910000 | 17 | 246 |
| Ice | 1.634734 × 2.375000 × 0.880000 | 18 | 252 |
| Thunder | 1.817820 × 2.365000 × 0.880000 | 19 | 264 |
| Knight | 1.867391 × 2.405000 × 0.880000 | 17 | 260 |
| Healer | 1.796334 × 2.770600 × 0.880000 | 17 | 468 |
| Summon | 1.724734 × 2.365000 × 1.067062 | 17 | 244 |
| Hỏa Hồ / pet-0 | 0.460000 × 0.700000 × 1.131206 | 9 | 160 |
| Băng Vũ / pet-1 | 1.300000 × 0.570000 × 1.131206 | 5 | 112 |
| Lôi Miêu / pet-2 | 0.460000 × 0.700000 × 1.073060 | 9 | 160 |

The bundle is 50,364 bytes with 148 mesh occurrences and 2,434 triangles across all ten templates. These sums do not describe a rendered frame or unique GPU allocations. It contains no textures, embedded images or skinned meshes. Materials use flat facets with roughness 0.79 and selective emissive accents. Shared primitives/materials are reused by the authoring factory. No external asset or texture license is required beyond the repository MIT license.

The common torso is an octahedron with local scale (0.55,0.75,0.36), giving bounds 1.10 × 1.50 × 0.72 m, centered at Y=1.05. Hip pivots sit at X=±0.22, Y=0.77; shoulder pivots at X=±0.55, Y=1.30. Each leg is 0.70 m long. The head center is Y=1.78; the hair crest starts near Y=2.00. Feet reach approximately Y=0.005. The weapon pivot is (0.68,0.98,0.12), with knight Y=0.86. The boss shares the articulation scheme, adds horns and broad armor, and reaches approximately 5.269 m after scene scaling. The healer's halo contributes to its greater template height.

## Character, boss and pet direction

| Role | Accent | Recognizable silhouette |
| --- | --- | --- |
| Fire | #ff7953 | Flame-tipped staff, tapered back crest |
| Ice | #7ce2ff | Crystal spear and two elevated fins |
| Thunder | #d6a6ff | Split staff and outward lightning fins |
| Knight | #fb9cb8 | Wide blade and hexagonal shield |
| Healer | #ffe289 | Ring staff and raised halo |
| Summon | #87f0be | Open tome and broad mantle |
| Varkhazar | #272537 armor, #ff526d accents | Horns, broad wing-like armor and oversized weapon |
| Hỏa Hồ | #ff985c | Four paws and pointed tail |
| Băng Vũ | #83dcff | Two wide wings |
| Lôi Miêu | #d49bff | Four paws and a differently angled tail |

Keep these silhouettes readable at the eight-actor low-quality cap. Shape and weapon distinguish classes alongside color. The models are intentionally faceted prototypes; production facial, clothing and hair detail remains an art-review decision. [Six-class arena reference](reports/evidence/portrait-six-classes.png) and the [P6 action captures](reports/PHASE_REPORT_P6.md#six-class-and-three-pet-action-verification) show actual rendered meshes. They are runtime references, not Gemini concept art or orthographic production sheets.

## Animation contract

All seven actors have `part=body`, `part=weapon`, two hip pivots and two shoulder pivots tagged by limb and side. Pets have four paw tags or two wing tags. This is rigid hierarchy articulation, with no skeletal skinning. Client procedural animation supplies body bob, approach, recoil, collapse and pet gait/follow-through for both GLB and fallback models.

| Exported boss clip | Seconds | Track |
| --- | ---: | --- |
| Idle | 1.80 | bossWeapon.quaternion |
| Run | 0.65 | bossWeapon.quaternion |
| Attack | 0.48 | bossWeapon.quaternion |
| Hit | 0.32 | bossWeapon.quaternion |
| Defeat | 0.58 | bossWeapon.quaternion |

Idle repeats; Attack/Hit restart on each new event; Defeat clamps once. Run is exported but unused by the stationary boss encounter. These clips animate the boss weapon only. Actor approach uses a 520 ms strike window, up to 1.15 m lunge, limb swing and weapon rotation; damage recoil lasts 450 ms. Defeat eases toward a 1.4-radian body pose. Pet paws/wings follow the owner's strike. Server pause freezes the motion clock and pet expiry reference. The animation harness verifies all six classes and three pets in GLB and forced-load-failure paths; it is separate from combat and FPS tests.

Replacement assets must retain root IDs and body/weapon pivots validated by the loader, plus limb/pet motion tags checked by the inspector and animation harness, or ship an explicitly reviewed loader/animation change. Verify idle, approach/run, attack, hit, defeat, pause and recovery on both paths. Do not describe the current weapon-only clips as complete skeletal character animation.

## Arena, camera and light

The arena is generated in [scene.ts](../apps/game/scene.ts), outside the GLB. The outer 12-sided basalt platform has top/bottom radius 7.7/8.3 m, thickness 0.55 m and center Y=-0.34. The playable surface has radius 6.9 m and thickness 0.08 m. Runes circle radii 6.5 and 4.7 m; the boss ring has radius 2.3 m at Z=-1.4. Eight tall crystal columns and 24 background gems surround the platform. A torus gate of radius 2 m sits at (0,3,-7.4), scaled 1.25 on Y. The boss stands at Z=-1.45; players occupy the front arc, with horizontal radius 5 m and depth 4.7 m. Two summoned wraiths flank the boss at X=±2.75, Z=-1.25.

The high three-quarter perspective camera uses position (6,8,20) in portrait and (6,8,16) on desktop, looking at (0,1.2,0), near/far 0.1/100. At aspect below 0.88 either mode uses 48° FOV; otherwise portrait uses 43° and desktop 38°. The 9:16 overlay reserves HUD space around the scene. Landscape operator controls use the separate desktop layout. [Layout QA](reports/PHASE_REPORT_P6.md) covers both orientations and long content.

Background and exponential fog use #141123, fog density 0.026. Hemisphere lighting uses #c5c7ff sky and #443053 ground at intensity 2.3. A warm directional light #ffb99e at (-4,8,3), intensity 3, separates silhouettes. There are no dynamic shadows or bloom/post-processing. Preserve warm ivory text, rose boss health, lavender runes and the magenta gate against violet terrain.

## Magic effects and resource constraints

Directional torus flashes and instanced sparks use the element accents. Ordinary bursts last 420 ms; ultimate/gift bursts 690 ms. Spark counts are six in low quality and twelve in high quality. Keep damage numbers and HP readable; effects must not replace server-authoritative damage or conceal the actors.

Low quality uses render scale 0.66, an eight-actor cap and approximately 30 render submissions/s; high quality uses scale 1, twelve actors and a 60-submission/s cap. Antialiasing is disabled and the renderer requests low power. The [native benchmark](reports/PHASE_REPORT_P7.md#native-browser-render-submissions-and-resource-counts) reports measured CPU submissions and allocation counts with their limits; these caps are not guaranteed presentation FPS. Unsupported WebGL retains the text HUD and operator controls.

Future meshes should fit within the current measured resource envelope unless a target-machine benchmark justifies a change. Introduce textures, skinning or post-processing only with a manifest/license update and measured memory/render cost. Gemini's original concept, orthographic references and review remain pending; the original procedural bundle is the executable fallback.
