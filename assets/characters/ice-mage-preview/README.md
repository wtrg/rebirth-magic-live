# Băng Pháp Sư preview

Codex created this standalone P9 candidate with a narrow spear, paired crystal fins and split mantle. The GLB has 504 triangles, four material primitives, seven skin joints, no textures and five clips: idle, move, attack, hit and defeat.

Run the generator with Blender 4.5 Python and bpy available:

    python generate.py -- --output ice-mage.glb

[Idle pose rendered from the exported GLB](idle.png)

Review this alongside the Hỏa Hồ candidate. In-game scale, portrait readability and Intel UHD performance still need validation. The asset is staged independently of the game client.

[Shared portrait scale study with Hỏa Hồ](ice-fox-scale-study.png)

Both exported GLBs use the same ground plane and camera at their authored scale. The study isolates the silhouettes with neutral lighting. The actual arena camera, combat HUD and effects still need separate evaluation.

Run `python inspect-motion.py` in the same Blender Python environment to sample each exported clip. Each clip moves the skinned mesh and keeps its lowest vertex within 0.01 m of the ground at the sampled integer frames. This check does not evaluate foot sliding, mesh intersections, or legibility in the game camera.
Standing clips contact the floor through leg bones. The defeat clip also contacts through ArmR, which carries the spear. Check that contact visually before approving the defeat pose.
