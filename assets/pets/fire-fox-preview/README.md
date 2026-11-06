# Hỏa Hồ preview

Codex created this standalone P9 candidate. The tall ember tail, pointed ears and four dark paws distinguish it from winged or floating companions. The GLB has 400 triangles, four material primitives, seven skin joints, no textures and three animation clips: idle, move and attack.

Run the generator with Blender 4.5 Python and bpy available:

    python generate.py -- --output fire-fox.glb

[idle pose rendered from the exported GLB](idle.png)

The preview has no runtime integration. In-game scale, readability and Intel UHD performance still need validation alongside a representative non-Fire class.

Run `python inspect-motion.py` in the same Blender Python environment to sample each exported clip. Each clip moves the skinned mesh and keeps its lowest vertex within 0.01 m of the ground at the sampled integer frames. This check does not evaluate foot sliding, mesh intersections, or legibility in the game camera.
All sampled floor contacts belong to paw bones.

Run `node scripts/fox-portrait-qa.mjs` for the standalone 1080 × 1920 fixture with the game arena camera and simplified HUD. Chrome on Intel UHD rendered idle, move and attack and continued with the existing pet after a forced GLB 404. The orange tail separates the pet from the floor, but the leg motion is subtle at phone scale. This fixture checks sampled poses with the default attract actor nearby. It does not exercise continuous playback, a crowded roster or the production HUD.

[Portrait pose sheet](portrait-poses.png)
