# Băng Pháp Sư preview

Codex created this standalone P9 candidate with a narrow spear, paired crystal fins and split mantle. The GLB has 504 triangles, four material primitives, seven skin joints, no textures and five clips: idle, move, attack, hit and defeat.

Run the generator with Blender 4.5 Python and bpy available:

    python generate.py -- --output ice-mage.glb

[Idle pose rendered from the exported GLB](idle.png)

Review this alongside the Hỏa Hồ candidate. In-game scale, portrait readability and Intel UHD performance still need validation. The asset is staged independently of the game client.

[Shared portrait scale study with Hỏa Hồ](ice-fox-scale-study.png)

Both exported GLBs use the same ground plane and camera at their authored scale. The study isolates the silhouettes with neutral lighting. The actual arena camera, combat HUD and effects still need separate evaluation.

Run `python inspect-motion.py` in the same Blender Python environment to sample each exported clip. Each clip moves the skinned mesh and keeps its lowest vertex within 0.01 m of the ground at the sampled integer frames. This check does not evaluate foot sliding, mesh intersections, or legibility in the game camera.
Standing clips contact the floor through leg bones. The revised defeat clip rolls away from the spear. Its sampled floor contacts are the left leg and left arm. [Defeat pose rendered from the export](defeat.png).

Run `node scripts/ice-portrait-qa.mjs` for the standalone 1080 × 1920 fixture using the game arena camera and simplified HUD. Chrome on Intel UHD rendered all five sampled poses and remained operational after a forced Ice GLB 404. The spear and crystal fins read clearly in the sampled frames, while the indigo body has low contrast against the floor. These stills do not cover continuous motion, crowded raids, or the production HUD.

[Portrait pose sheet](portrait-poses.png)

[Continuous portrait playback](portrait-playback.mp4) records the five exported clips in sequence on Intel UHD. Run `node scripts/ice-portrait-qa.mjs --record` to reproduce the browser capture. The fixture keeps the actor in place with a simplified HUD, so the footage is scoped to pose and silhouette review.

[Material comparison](portrait-material.png) shows the original indigo on the left and revised glacier blue on the right under the same arena camera and lights. The revised cloth is easier to distinguish from the floor. The playback uses the revised GLB. Earlier stills show the original material.
