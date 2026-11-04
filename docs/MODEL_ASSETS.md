# Raid model bundle

[raid.glb](../public/models/raid.glb) is a glTF 2.0 binary containing Varkhazar, six class silhouettes, and Hỏa Hồ, Băng Vũ and Lôi Miêu. Models use meters and Y-up. Actors face +Z with feet near Y=0. The game places and scales the boss.

Actor nodes carry body and weapon pivot tags. Pet nodes carry paw or wing motion tags. Idle, Run, Attack, Hit and Defeat are prototype boss weapon tracks. The game plays Idle, Attack, Hit and Defeat from the GLB and retains procedural full-body motion. The mage and pet animations remain procedural. All geometry and materials are original and MIT-licensed. The file has no textures or remote URLs.

Run `node scripts/export-models.ts` from the repository root to regenerate the bundle. The authoring source is [models.ts](../apps/game/models.ts). Vite includes the GLB in the build. The client validates the node contract and falls back to procedural actors if loading fails.

The Windows browser smoke verified that the GLB loaded and that the procedural fallback rendered after a simulated 404. [Portrait with GLB actors](reports/evidence/portrait-glb.png)


## Class silhouettes

- Hỏa Pháp Sư carries a flame-tipped staff and tapered back crest.
- Băng Pháp Sư has a crystal spear tip and two raised ice fins.
- Lôi Pháp Sư uses a split staff and outward-pointing lightning fins.
- Ma Kiếm Sĩ carries a wide blade and hexagonal shield.
- Thánh Thuật Sư carries a ring staff and has a raised halo.
- Triệu Hồi Sư holds an open tome and wears a broad green mantle.

The variants share the body and weapon pivot contract. These assets change the silhouette and preserve the class combat rules.

[Six classes rendered together in the portrait arena](reports/evidence/portrait-six-classes.png).
