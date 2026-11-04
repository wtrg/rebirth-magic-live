# Raid model bundle

[raid.glb](../public/models/raid.glb) is a glTF 2.0 binary containing Varkhazar, six class-colored mage variants, and Hỏa Hồ, Băng Vũ and Lôi Miêu. Models use meters and Y-up. Actors face +Z with feet near Y=0. The game places and scales the boss.

Actor nodes carry body and weapon pivot tags. Pet nodes carry paw or wing motion tags. Idle, Run, Attack, Hit and Defeat are prototype boss weapon tracks. The game plays Idle, Attack, Hit and Defeat from the GLB and retains procedural full-body motion. The mage and pet animations remain procedural. All geometry and materials are original and MIT-licensed. The file has no textures or remote URLs.

Run `node scripts/export-models.ts` from the repository root to regenerate the bundle. The authoring source is [models.ts](../apps/game/models.ts). Vite includes the GLB in the build. The client validates the node contract and falls back to procedural actors if loading fails.

The Windows browser smoke verified that the GLB loaded and that the procedural fallback rendered after a simulated 404. [Portrait with GLB actors](reports/evidence/portrait-glb.png)
